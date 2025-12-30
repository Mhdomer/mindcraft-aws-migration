'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminRegisterPage() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState('teacher');
	const [ok, setOk] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setOk('');
		setError('');
		setLoading(true);

		// Validate required fields
		if (!name || !name.trim()) {
			setError('Full name is required');
			setLoading(false);
			return;
		}

		if (name.trim().length < 2) {
			setError('Full name must be at least 2 characters');
			setLoading(false);
			return;
		}

		if (!email || !email.trim()) {
			setError('Email is required');
			setLoading(false);
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			setError('Please enter a valid email address');
			setLoading(false);
			return;
		}

		if (!password) {
			setError('Password is required');
			setLoading(false);
			return;
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters');
			setLoading(false);
			return;
		}

		try {
			// Step 1: Create user in Firebase Auth (this handles password)
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user; // This gives us the uid

			// Step 2: Create user profile in Firestore
			await setDoc(doc(db, 'user', user.uid), {
				name: name.trim(),
				email: email.trim(),
				role: role,
				status: 'active',
				createdAt: serverTimestamp(),
			});

			setOk(`User "${name}" registered successfully! They can now sign in with email: ${email}`);
			setName('');
			setEmail('');
			setPassword('');
			setRole('teacher');
		} catch (err) {
			if (err.code === 'auth/email-already-in-use') {
				setError('This email is already registered');
			} else if (err.code === 'auth/invalid-email') {
				setError('Invalid email format');
			} else if (err.code === 'auth/weak-password') {
				setError('Password should be at least 6 characters');
			} else {
				setError(err.message || 'Failed to register user');
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-md mx-auto">
			<h1 className="text-h1 text-neutralDark mb-8">Register Teacher/Student</h1>
			<Card>
				<CardContent className="pt-6">
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="space-y-2">
							<label className="text-caption font-medium text-neutralDark">
								Full Name <span className="text-error">*</span>
							</label>
							<Input
								required
								placeholder="Enter full name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								minLength={2}
								maxLength={100}
							/>
							{name && name.trim().length < 2 && (
								<p className="text-xs text-error">Name must be at least 2 characters</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-caption font-medium text-neutralDark">
								Email <span className="text-error">*</span>
							</label>
							<Input
								required
								type="email"
								placeholder="Enter email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
							{email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
								<p className="text-xs text-error">Please enter a valid email address</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-caption font-medium text-neutralDark">
								Password <span className="text-error">*</span>
							</label>
							<Input
								required
								type="password"
								placeholder="Enter password (min 6 characters)"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								minLength={6}
							/>
							{password && password.length < 6 && (
								<p className="text-xs text-error">Password must be at least 6 characters</p>
							)}
							{password && password.length >= 6 && password.length < 8 && (
								<p className="text-xs text-warning">Consider using 8+ characters for better security</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-caption font-medium text-neutralDark">
								Role <span className="text-error">*</span>
							</label>
							<select
								className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
								value={role}
								onChange={(e) => setRole(e.target.value)}
							>
								<option value="teacher">Teacher</option>
								<option value="student">Student</option>
							</select>
						</div>
						<Button
							className="w-full"
							type="submit"
							disabled={loading}
						>
							{loading ? 'Creating...' : 'Create account'}
						</Button>
					</form>
					{error ? (
						<Card className="mt-4 border-error bg-error/5">
							<CardContent className="pt-6">
								<p className="text-body text-error">{error}</p>
							</CardContent>
						</Card>
					) : null}
					{ok ? (
						<Card className="mt-4 border-success bg-success/5">
							<CardContent className="pt-6">
								<p className="text-body text-success">{ok}</p>
							</CardContent>
						</Card>
					) : null}
					<p className="text-caption text-muted-foreground mt-6">
						Admin must be signed in to use this page. The user will be created in Firebase Auth and Firestore.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}


