'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Torch from '@/components/pixel-ui/Torch';

function dashboardPath(role) {
	if (role === 'admin')   return '/dashboard/admin';
	if (role === 'teacher') return '/dashboard/teacher';
	return '/dashboard/student';
}

export default function LoginPage() {
	const [email, setEmail]           = useState('');
	const [password, setPassword]     = useState('');
	const [error, setError]           = useState('');
	const [loading, setLoading]       = useState(false);
	const [checkingAuth, setCheckingAuth] = useState(true);
	const { userData } = useAuth();

	// Already logged in — go straight to dashboard
	useEffect(() => {
		if (userData) {
			window.location.href = dashboardPath(userData.role);
		} else {
			setCheckingAuth(false);
		}
	}, [userData]);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');

		if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return setError('Please enter a valid email address');
		}
		if (!password) return setError('Password is required');

		setLoading(true);
		try {
			const { user } = await api.post('/api/auth/login', { email, password });
			window.location.href = dashboardPath(user.role);
		} catch (err) {
			setError(err.message || 'Invalid email or password');
		} finally {
			setLoading(false);
		}
	}

	// Show loading while checking auth state
	if (checkingAuth) {
		return (
			<div className="min-h-screen flex items-center justify-center mc-stone-bg">
				<div className="bg-[#C6C6C6] border-4 border-black p-1 shadow-pixel-lg">
					<div className="border-t-4 border-l-4 border-white/30 border-b-4 border-r-4 border-black/20 p-6">
						<p className="font-pixel text-stone-600 animate-pulse">Loading world data...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center mc-stone-bg relative overflow-hidden">
			{/* Torch Lighting Effect (Radial Gradient) - made subtler for stone */}
			<div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%)' }}></div>

			{/* Torches on Wall */}
			<div className="absolute top-1/2 left-10 lg:left-60 transform -translate-y-1/2 hidden lg:flex flex-col items-center gap-2 z-10">
				<Torch className="w-26 h-40" />
			</div>

			<div className="absolute top-1/2 right-10 lg:right-60 transform -translate-y-1/2 hidden lg:flex flex-col items-center gap-2 z-10 delay-75">
				<Torch className="w-26 h-40 scale-x-[-1]" />
			</div>

			{/* Minecraft GUI Login Card */}
			<div className="w-full max-w-md relative z-10">
				<div className="bg-[#C6C6C6] border-4 border-black p-1 shadow-pixel-lg">
					<div className="border-t-4 border-l-4 border-white/30 border-b-4 border-r-4 border-black/20 p-6 md:p-8">
						<div className="text-center space-y-2 mb-8">
							<h2 className="text-5xl font-pixel-heading text-black drop-shadow-sm mb-2">Sign In</h2>
							<p className="font-pixel-body text-xl text-stone-600">Welcome to MindCraft</p>
						</div>

						<form onSubmit={onSubmit} className="space-y-6">
							<div className="space-y-2">
								<label className="font-pixel text-xl text-stone-700 block uppercase tracking-wide">
									Email <span className="text-red-600">*</span>
								</label>
								<div className="bg-white border-4 border-[#373737] p-1 shadow-inner">
									<Input
										type="email"
										placeholder="steve@mindcraft.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										className="w-full bg-transparent border-none text-black placeholder:text-stone-400 focus-visible:ring-0 font-['VT323'] h-10 text-xl"
									/>
								</div>
								{email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
									<p className="text-sm text-red-600 font-pixel mt-1">Invalid email format</p>
								)}
							</div>

							<div className="space-y-2">
								<label className="font-pixel text-xl text-stone-700 block uppercase tracking-wide">
									Password <span className="text-red-600">*</span>
								</label>
								<div className="bg-white border-4 border-[#373737] p-1 shadow-inner">
									<Input
										type="password"
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										className="w-full bg-transparent border-none text-black placeholder:text-stone-400 focus-visible:ring-0 font-['VT323'] h-10 text-xl"
									/>
								</div>
							</div>

							<Button
								className="w-full h-17 text-2xl mc-btn-primary hover:translate-y-1 hover:shadow-none transition-all rounded-none ring-0 shadow-pixel active:translate-y-2 active:shadow-none mt-4"
								type="submit"
								disabled={loading}
							>
								{loading ? 'Querying Database...' : 'Log In'}
							</Button>

							<div className="text-center mt-4">
								<a href="/forgot-password" className="font-pixel text-lg text-stone-600 hover:text-stone-900 hover:underline">
									Forgot Password?
								</a>
							</div>
						</form>

						{error ? (
							<div className="mt-6 p-4 bg-red-900/20 border-2 border-red-900/50 text-red-900 font-pixel text-base text-center">
								{error}
							</div>
						) : null}

						<div className="text-center mt-6 pt-4 border-t-2 border-black/10">
							<Link href="/" className="font-pixel text-lg text-stone-600 hover:text-stone-900 flex items-center justify-center gap-2 group">
								<span>&lt;</span> Back to Home
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


