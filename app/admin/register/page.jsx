'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Lock, Shield, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

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
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden flex items-center justify-center p-6">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="w-full max-w-lg relative z-10 animate-fadeIn">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent inline-flex items-center gap-2">
						Register User <Sparkles className="h-6 w-6 text-yellow-400" />
					</h1>
					<p className="text-muted-foreground mt-2">Create a new account for a teacher or student</p>
				</div>

				<Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
					<CardContent className="pt-8 px-6 md:px-8 pb-8">
						<form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
							<div className="space-y-2">
								<label className="text-sm font-medium text-neutralDark flex items-center gap-2">
									<User className="h-4 w-4 text-emerald-500" /> Full Name <span className="text-error">*</span>
								</label>
								<div className="relative group">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
										<User className="h-4 w-4" />
									</div>
									<Input
										required
										placeholder="Enter full name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										minLength={2}
										maxLength={100}
										autoComplete="off"
										className="pl-10 border-neutral-200 focus-visible:ring-emerald-500 transition-all hover:border-emerald-200"
									/>
								</div>
								{name && name.trim().length < 2 && (
									<p className="text-xs text-error flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Name must be at least 2 characters</p>
								)}
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-neutralDark flex items-center gap-2">
									<Mail className="h-4 w-4 text-emerald-500" /> Email <span className="text-error">*</span>
								</label>
								<div className="relative group">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
										<Mail className="h-4 w-4" />
									</div>
									<Input
										required
										type="email"
										placeholder="Enter email address"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="off"
										className="pl-10 border-neutral-200 focus-visible:ring-emerald-500 transition-all hover:border-emerald-200"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-neutralDark flex items-center gap-2">
									<Lock className="h-4 w-4 text-emerald-500" /> Password <span className="text-error">*</span>
								</label>
								<div className="relative group">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
										<Lock className="h-4 w-4" />
									</div>
									<Input
										required
										type="password"
										placeholder="Enter password (min 6 characters)"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										minLength={6}
										autoComplete="new-password"
										className="pl-10 border-neutral-200 focus-visible:ring-emerald-500 transition-all hover:border-emerald-200"
									/>
								</div>
								{password && password.length < 6 && (
									<p className="text-xs text-error flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Password must be at least 6 characters</p>
								)}
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-neutralDark flex items-center gap-2">
									<Shield className="h-4 w-4 text-emerald-500" /> Role <span className="text-error">*</span>
								</label>
								<div className="relative group">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
										<Shield className="h-4 w-4" />
									</div>
									<select
										className="flex h-10 w-full rounded-md border border-neutral-200 bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-emerald-200"
										value={role}
										onChange={(e) => setRole(e.target.value)}
									>
										<option value="teacher">Teacher</option>
										<option value="student">Student</option>
									</select>
								</div>
							</div>

							<Button
								className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
								type="submit"
								disabled={loading}
								size="lg"
							>
								{loading ? 'Creating Account...' : 'Create Account'}
							</Button>
						</form>

						{error && (
							<div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 animate-slideIn">
								<AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
								<p className="text-sm font-medium">{error}</p>
							</div>
						)}

						{ok && (
							<div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-3 text-emerald-600 animate-slideIn">
								<CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
								<p className="text-sm font-medium">{ok}</p>
							</div>
						)}
					</CardContent>
				</Card>

				<p className="text-xs text-center text-muted-foreground mt-6 max-w-xs mx-auto">
					Admin privileges required. New users will be added to Firebase Auth & Firestore.
				</p>
			</div>
		</div>
	);
}


