'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Save, X, Sparkles } from 'lucide-react';

export default function ProfilePage() {
	const router = useRouter();
	const { userData, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [profilePictureUrl, setProfilePictureUrl] = useState('');

	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		setName(userData.name || '');
		setEmail(userData.email || '');
		setProfilePictureUrl(userData.profilePicture || '');
	}, [authLoading, userData, router]);

	const userId = userData?._id?.toString();

	const handleSaveProfile = async () => {
		setError('');
		setSuccess('');
		if (!name.trim()) { setError('Name is required'); return; }
		setLoading(true);
		try {
			await api.put(`/api/users/${userId}`, { name: name.trim() });
			setSuccess('Profile updated successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			setError(err.message || 'Failed to update profile');
		} finally {
			setLoading(false);
		}
	};

	const handleChangePassword = async () => {
		setError('');
		setSuccess('');
		if (!currentPassword.trim()) { setError('Current password is required'); return; }
		if (!newPassword.trim()) { setError('New password is required'); return; }
		if (newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
		if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

		setLoading(true);
		try {
			await api.put(`/api/users/${userId}/password`, { currentPassword, newPassword });
			setSuccess('Password changed successfully!');
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			setShowPasswordForm(false);
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			setError(err.message || 'Failed to change password');
		} finally {
			setLoading(false);
		}
	};

	if (authLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading profile...</p>
			</div>
		);
	}

	if (!userData) return null;

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="max-w-4xl mx-auto space-y-6 relative z-10 animate-fadeIn">
				<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent inline-flex items-center gap-2 mb-2">
					Profile Settings <Sparkles className="h-6 w-6 text-yellow-400" />
				</h1>

				{error && (
					<Card className="border-error bg-error/5">
						<CardContent className="pt-6"><p className="text-body text-error">{error}</p></CardContent>
					</Card>
				)}
				{success && (
					<Card className="border-success bg-success/5">
						<CardContent className="pt-6"><p className="text-body text-success">{success}</p></CardContent>
					</Card>
				)}

				{/* Personal Details */}
				<Card className="border-none shadow-md bg-white/80 backdrop-blur-md overflow-hidden">
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Personal Details</CardTitle>
						<CardDescription>Update your personal information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Profile Picture (display only) */}
						<div className="flex items-center gap-6">
							<div className="relative">
								{profilePictureUrl ? (
									<img src={profilePictureUrl} alt="Profile" className="w-[150px] h-[150px] rounded-full object-cover border-2 border-border" />
								) : (
									<div className="w-[150px] h-[150px] rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
										<User className="h-20 w-20 text-primary" />
									</div>
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
							<label className="block mb-2 text-sm font-medium text-neutralDark">Email</label>
							<Input value={email} disabled className="bg-neutralLight" />
							<p className="text-caption text-muted-foreground mt-1">Email cannot be changed</p>
						</div>

						{/* Role */}
						<div>
							<label className="block mb-2 text-sm font-medium text-neutralDark">Role</label>
							<Input value={userData.role || ''} disabled className="bg-neutralLight capitalize" />
						</div>

						<Button onClick={handleSaveProfile} disabled={loading} className="w-full sm:w-auto">
							<Save className="h-4 w-4 mr-2" />
							{loading ? 'Saving...' : 'Save Changes'}
						</Button>
					</CardContent>
				</Card>

				{/* Change Password */}
				<Card className="border-none shadow-md bg-white/80 backdrop-blur-md overflow-hidden">
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Change Password</CardTitle>
						<CardDescription>Update your account password</CardDescription>
					</CardHeader>
					<CardContent>
						{!showPasswordForm ? (
							<Button variant="outline" onClick={() => setShowPasswordForm(true)}>Change Password</Button>
						) : (
							<div className="space-y-4">
								<div>
									<label className="block mb-2 text-sm font-medium text-neutralDark">Current Password <span className="text-error">*</span></label>
									<Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
								</div>
								<div>
									<label className="block mb-2 text-sm font-medium text-neutralDark">New Password <span className="text-error">*</span></label>
									<Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 8 characters)" minLength={8} />
									{newPassword && newPassword.length < 8 && (
										<p className="text-xs text-error mt-1">Password must be at least 8 characters</p>
									)}
								</div>
								<div>
									<label className="block mb-2 text-sm font-medium text-neutralDark">Confirm New Password <span className="text-error">*</span></label>
									<Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
									{confirmPassword && newPassword && confirmPassword !== newPassword && (
										<p className="text-xs text-error mt-1">Passwords do not match</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button onClick={handleChangePassword} disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
										<Lock className="h-4 w-4 mr-2" />Update Password
									</Button>
									<Button variant="ghost" onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); }}>
										<X className="h-4 w-4 mr-2" />Cancel
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
