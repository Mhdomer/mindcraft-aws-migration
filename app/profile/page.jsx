'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Upload, Lock, Save, X, Sparkles } from 'lucide-react';

export default function ProfilePage() {
	const router = useRouter();
	const [user, setUser] = useState(null);
	const [userData, setUserData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	// Form states
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [profilePicture, setProfilePicture] = useState(null);
	const [profilePictureUrl, setProfilePictureUrl] = useState('');
	const [uploading, setUploading] = useState(false);

	// Password change states
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (!firebaseUser) {
				router.push('/login');
				return;
			}

			setUser(firebaseUser);

			// Load user data from Firestore
			try {
				const userDoc = await getDoc(doc(db, 'user', firebaseUser.uid));
				if (userDoc.exists()) {
					const data = { id: userDoc.id, ...userDoc.data() };
					setUserData(data);
					setName(data.name || '');
					setEmail(data.email || '');
					setProfilePictureUrl(data.profilePicture || '');
				}
			} catch (err) {
				console.error('Error loading user data:', err);
				setError('Failed to load user data');
			} finally {
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, [router]);

	const handleProfilePictureChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				setError('Profile picture must be less than 5MB');
				return;
			}
			if (!file.type.startsWith('image/')) {
				setError('File must be an image');
				return;
			}
			setProfilePicture(file);
			// Preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setProfilePictureUrl(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const uploadProfilePicture = async () => {
		if (!profilePicture || !user) return null;

		setUploading(true);
		try {
			console.log('Starting profile picture upload...');
			const fileRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}_${profilePicture.name}`);
			console.log('Uploading to:', fileRef.fullPath);

			await uploadBytes(fileRef, profilePicture);
			console.log('Upload complete, getting download URL...');

			const url = await getDownloadURL(fileRef);
			console.log('Download URL obtained:', url);
			return url;
		} catch (err) {
			console.error('Error uploading profile picture:', err);
			// Provide more specific error messages
			if (err.code === 'storage/unauthorized') {
				throw new Error('Storage permission denied. Please check Firebase Storage rules.');
			} else if (err.code === 'storage/canceled') {
				throw new Error('Upload was canceled.');
			} else if (err.code === 'storage/unknown') {
				throw new Error('Unknown storage error occurred.');
			}
			throw new Error(`Failed to upload image: ${err.message || 'Unknown error'}`);
		} finally {
			setUploading(false);
		}
	};

	const handleSaveProfile = async () => {
		setError('');
		setSuccess('');

		if (!name.trim()) {
			setError('Name is required');
			return;
		}

		// Prevent multiple clicks
		if (uploading) {
			return;
		}

		setUploading(true);
		try {
			let pictureUrl = profilePictureUrl;

			// Upload new profile picture if selected
			if (profilePicture) {
				console.log('Uploading profile picture...');
				pictureUrl = await uploadProfilePicture();
				console.log('Profile picture uploaded successfully');
			}

			// Update Firestore
			console.log('Updating Firestore...');
			const updateData = {
				name: name.trim(),
			};

			if (pictureUrl && pictureUrl.startsWith('http')) {
				// Only update if we have a valid HTTP URL (not a data URL)
				updateData.profilePicture = pictureUrl;
			}

			await updateDoc(doc(db, 'user', user.uid), updateData);
			console.log('Firestore updated successfully');

			// Update local state with the new data
			setUserData({ ...userData, ...updateData });
			// If we uploaded a new picture, update the URL to the Firebase Storage URL
			if (pictureUrl && pictureUrl.startsWith('http') && pictureUrl !== profilePictureUrl) {
				setProfilePictureUrl(pictureUrl);
			}
			setProfilePicture(null);
			setSuccess('Profile updated successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error updating profile:', err);
			setError(err.message || 'Failed to update profile. Please check the browser console for details.');
		} finally {
			setUploading(false);
		}
	};

	const handleRemoveProfilePicture = async () => {
		if (!confirm('Are you sure you want to remove your profile picture?')) {
			return;
		}

		setError('');
		setSuccess('');

		try {
			// Update Firestore to remove profile picture
			await updateDoc(doc(db, 'user', user.uid), {
				profilePicture: '',
			});

			// Update local state
			setProfilePictureUrl('');
			setProfilePicture(null);
			setUserData({ ...userData, profilePicture: '' });
			setSuccess('Profile picture removed successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error removing profile picture:', err);
			setError('Failed to remove profile picture: ' + (err.message || 'Unknown error'));
		}
	};

	const handleChangePassword = async () => {
		setError('');
		setSuccess('');

		if (!currentPassword || !currentPassword.trim()) {
			setError('Current password is required');
			return;
		}

		if (!newPassword || !newPassword.trim()) {
			setError('New password is required');
			return;
		}

		if (newPassword.length < 6) {
			setError('New password must be at least 6 characters');
			return;
		}

		if (!confirmPassword || !confirmPassword.trim()) {
			setError('Please confirm your new password');
			return;
		}

		if (newPassword !== confirmPassword) {
			setError('New passwords do not match');
			return;
		}

		try {
			// Re-authenticate user
			const credential = EmailAuthProvider.credential(user.email, currentPassword);
			await reauthenticateWithCredential(user, credential);

			// Update password
			await updatePassword(user, newPassword);

			setSuccess('Password changed successfully!');
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			setShowPasswordForm(false);
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error changing password:', err);
			if (err.code === 'auth/wrong-password') {
				setError('Current password is incorrect');
			} else if (err.code === 'auth/weak-password') {
				setError('New password is too weak');
			} else {
				setError('Failed to change password');
			}
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading profile...</p>
			</div>
		);
	}

	if (!user || !userData) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">Failed to load user data</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="max-w-4xl mx-auto space-y-6 relative z-10 animate-fadeIn">
				<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent inline-flex items-center gap-2 mb-2">
					Profile Settings <Sparkles className="h-6 w-6 text-yellow-400" />
				</h1>

				{error && (
					<Card className="border-error bg-error/5">
						<CardContent className="pt-6">
							<p className="text-body text-error">{error}</p>
						</CardContent>
					</Card>
				)}

				{success && (
					<Card className="border-success bg-success/5">
						<CardContent className="pt-6">
							<p className="text-body text-success">{success}</p>
						</CardContent>
					</Card>
				)}

				{/* Personal Details */}
				<Card className="border-none shadow-md bg-white/80 backdrop-blur-md overflow-hidden">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-5 w-5" />
							Personal Details
						</CardTitle>
						<CardDescription>Update your personal information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Profile Picture */}
						<div className="flex items-center gap-6">
							<div className="relative group">
								{profilePictureUrl ? (
									<img
										src={profilePictureUrl}
										alt="Profile"
										className="w-[150px] h-[150px] rounded-full object-cover border-2 border-border"
									/>
								) : (
									<div className="w-[150px] h-[150px] rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
										<User className="h-20 w-20 text-primary" />
									</div>
								)}
							</div>
							<div className="flex-1">
								<label className="block mb-2 text-sm font-medium text-neutralDark">
									Profile Picture
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={handleProfilePictureChange}
									className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:opacity-90 transition-opacity"
									disabled={uploading}
								/>
								<p className="text-caption text-muted-foreground mt-1">
									JPG, PNG or GIF. Max size: 5MB
								</p>
								{profilePictureUrl && (
									<Button
										type="button"
										variant="destructive"
										onClick={handleRemoveProfilePicture}
										disabled={uploading}
										className="mt-2 scale-[0.7] origin-left"
									>
										<X className="h-3.5 w-3.5 mr-1.5" />
										Remove Picture
									</Button>
								)}
							</div>
						</div>

						{/* Name */}
						<div>
							<label className="block mb-2 text-sm font-medium text-neutralDark">
								Full Name <span className="text-error">*</span>
							</label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter your full name"
								required
								minLength={2}
								maxLength={100}
							/>
							{name && name.trim().length < 2 && (
								<p className="text-xs text-error mt-1">Name must be at least 2 characters</p>
							)}
						</div>

						{/* Email (read-only) */}
						<div>
							<label className="block mb-2 text-sm font-medium text-neutralDark">
								Email
							</label>
							<Input
								value={email}
								disabled
								className="bg-neutralLight"
							/>
							<p className="text-caption text-muted-foreground mt-1">
								Email cannot be changed
							</p>
						</div>

						{/* Role */}
						<div>
							<label className="block mb-2 text-sm font-medium text-neutralDark">
								Role
							</label>
							<Input
								value={userData.role || ''}
								disabled
								className="bg-neutralLight capitalize"
							/>
						</div>

						<Button
							onClick={handleSaveProfile}
							disabled={uploading}
							className="w-full sm:w-auto"
						>
							<Save className="h-4 w-4 mr-2" />
							{uploading ? 'Saving...' : 'Save Changes'}
						</Button>
					</CardContent>
				</Card>

				{/* Change Password */}
				<Card className="border-none shadow-md bg-white/80 backdrop-blur-md overflow-hidden">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5" />
							Change Password
						</CardTitle>
						<CardDescription>Update your account password</CardDescription>
					</CardHeader>
					<CardContent>
						{!showPasswordForm ? (
							<Button
								variant="outline"
								onClick={() => setShowPasswordForm(true)}
							>
								Change Password
							</Button>
						) : (
							<div className="space-y-4">
								<div>
									<label className="block mb-2 text-sm font-medium text-neutralDark">
										Current Password <span className="text-error">*</span>
									</label>
									<Input
										type="password"
										value={currentPassword}
										onChange={(e) => setCurrentPassword(e.target.value)}
										placeholder="Enter current password"
										required
									/>
								</div>
								<div>
									<label className="block mb-2 text-sm font-medium text-neutralDark">
										New Password <span className="text-error">*</span>
									</label>
									<Input
										type="password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										placeholder="Enter new password (min 6 characters)"
										required
										minLength={6}
									/>
									{newPassword && newPassword.length < 6 && (
										<p className="text-xs text-error mt-1">Password must be at least 6 characters</p>
									)}
									{newPassword && newPassword.length >= 6 && newPassword.length < 8 && (
										<p className="text-xs text-warning mt-1">Consider using 8+ characters for better security</p>
									)}
								</div>
								<div>
									<label className="block mb-2 text-sm font-medium text-neutralDark">
										Confirm New Password <span className="text-error">*</span>
									</label>
									<Input
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										placeholder="Confirm new password"
										required
									/>
									{confirmPassword && newPassword && confirmPassword !== newPassword && (
										<p className="text-xs text-error mt-1">Passwords do not match</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										onClick={handleChangePassword}
										disabled={!currentPassword || !newPassword || !confirmPassword}
									>
										<Lock className="h-4 w-4 mr-2" />
										Update Password
									</Button>
									<Button
										variant="ghost"
										onClick={() => {
											setShowPasswordForm(false);
											setCurrentPassword('');
											setNewPassword('');
											setConfirmPassword('');
											setError('');
										}}
									>
										<X className="h-4 w-4 mr-2" />
										Cancel
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

