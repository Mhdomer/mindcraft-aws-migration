'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Languages, Moon, Sun, Check, Settings, Palette, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
	const router = useRouter();
	const { language, setLanguage } = useLanguage();
	const [theme, setTheme] = useState('light');

	// Basic auth guard: redirect guests to login
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (!user) {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [router]);

	// Load theme preference from localStorage
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const stored = window.localStorage.getItem('theme');
		const initialTheme = stored === 'dark' ? 'dark' : 'light';
		setTheme(initialTheme);
		applyTheme(initialTheme);
	}, []);

	function applyTheme(nextTheme) {
		if (typeof window === 'undefined') return;
		const root = document.documentElement;
		if (nextTheme === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
		window.localStorage.setItem('theme', nextTheme);
	}

	function handleThemeToggle(checked) {
		const next = checked ? 'dark' : 'light';
		setTheme(next);
		applyTheme(next);
	}

	function handleLanguageToggle() {
		const next = language === 'en' ? 'bm' : 'en';
		setLanguage(next);
	}

	return (
		<div className="max-w-4xl mx-auto py-8 px-4 animate-fadeIn space-y-8">
			{/* Header */}
			<div className="flex items-center gap-4 mb-4">
				<div className="p-3 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
					<Settings className="w-10 h-10 text-white" />
				</div>
				<div>
					<h1 className="text-3xl font-bold bg-gradient-to-r from-neutralDark to-neutralDark/70 bg-clip-text text-transparent dark:from-white dark:to-white/70">
						{language === 'bm' ? 'Tetapan Akaun' : 'Account Settings'}
					</h1>
					<p className="text-muted-foreground mt-1 text-lg">
						{language === 'bm'
							? 'Sesuaikan bahasa, tema dan tetapan pengalaman anda.'
							: 'Customize your language, theme, and experience settings.'}
					</p>
				</div>
			</div>

			<div className="grid gap-8">
				{/* Language Section */}
				<Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
					<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
					<CardHeader>
						<div className="flex items-center gap-3 mb-1">
							<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
								<Globe className="w-5 h-5" />
							</div>
							<CardTitle className="text-xl">{language === 'bm' ? 'Bahasa' : 'Language'}</CardTitle>
						</div>
						<CardDescription className="text-base">
							{language === 'bm'
								? 'Pilih bahasa paparan aplikasi.'
								: 'Choose your preferred display language.'}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* English Option */}
						<div
							onClick={() => setLanguage('en')}
							className={cn(
								'cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group/item',
								language === 'en'
									? 'border-blue-500 bg-blue-50/80 dark:bg-blue-900/20 shadow-sm ring-1 ring-blue-500/20'
									: 'border-transparent bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 hover:scale-[1.02]'
							)}
						>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900">
									EN
								</div>
								<div className="flex flex-col">
									<span className="font-semibold text-neutralDark dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
										English
									</span>
									<span className="text-xs text-muted-foreground">Default</span>
								</div>
							</div>
							{language === 'en' && (
								<div className="bg-blue-500 rounded-full p-1 shadow-lg shadow-blue-500/30 animate-in zoom-in spin-in-180 duration-300">
									<Check className="w-6 h-6 text-white" />
								</div>
							)}
						</div>

						{/* BM Option */}
						<div
							onClick={() => setLanguage('bm')}
							className={cn(
								'cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group/item',
								language === 'bm'
									? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 shadow-sm ring-1 ring-emerald-500/20'
									: 'border-transparent bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 hover:scale-[1.02]'
							)}
						>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900">
									BM
								</div>
								<div className="flex flex-col">
									<span className="font-semibold text-neutralDark dark:text-white group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">
										Bahasa Melayu
									</span>
									<span className="text-xs text-muted-foreground">Malaysia</span>
								</div>
							</div>
							{language === 'bm' && (
								<div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/30 animate-in zoom-in spin-in-180 duration-300">
									<Check className="w-6 h-6 text-white" />
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Theme Section */}
				<Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
					<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
					<CardHeader>
						<div className="flex items-center gap-3 mb-1">
							<div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
								<Palette className="w-5 h-5" />
							</div>
							<CardTitle className="text-xl">{language === 'bm' ? 'Tema' : 'Appearance'}</CardTitle>
						</div>
						<CardDescription className="text-base">
							{language === 'bm'
								? 'Sesuaikan penampilan antaramuka.'
								: 'Customize your interface appearance.'}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Light Mode */}
						<div
							onClick={() => handleThemeToggle(false)}
							className={cn(
								'cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group/item',
								theme !== 'dark'
									? 'border-amber-500 bg-amber-50/80 dark:bg-amber-900/20 shadow-sm ring-1 ring-amber-500/20'
									: 'border-transparent bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 hover:scale-[1.02]'
							)}
						>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
									<Sun className="w-5 h-5" />
								</div>
								<div className="flex flex-col">
									<span className="font-semibold text-neutralDark dark:text-white group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 transition-colors">
										{language === 'bm' ? 'Cerah' : 'Light Mode'}
									</span>
									<span className="text-caption text-muted-foreground">
										{language === 'bm' ? 'Tema klasik' : 'Classic clean look'}
									</span>
								</div>
							</div>
							{theme !== 'dark' && (
								<div className="bg-amber-500 rounded-full p-1 shadow-lg shadow-amber-500/30 animate-in zoom-in spin-in-180 duration-300">
									<Check className="w-6 h-6 text-white" />
								</div>
							)}
						</div>

						{/* Dark Mode */}
						<div
							onClick={() => handleThemeToggle(true)}
							className={cn(
								'cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group/item',
								theme === 'dark'
									? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/20 shadow-sm ring-1 ring-indigo-500/20'
									: 'border-transparent bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 hover:scale-[1.02]'
							)}
						>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
									<Moon className="w-5 h-5" />
								</div>
								<div className="flex flex-col">
									<span className="font-semibold text-neutralDark dark:text-white group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
										{language === 'bm' ? 'Gelap' : 'Dark Mode'}
									</span>
									<span className="text-caption text-muted-foreground">
										{language === 'bm' ? 'Kurangkan silau' : 'Easy on the eyes'}
									</span>
								</div>
							</div>
							{theme === 'dark' && (
								<div className="bg-indigo-500 rounded-full p-1 shadow-lg shadow-indigo-500/30 animate-in zoom-in spin-in-180 duration-300">
									<Check className="w-6 h-6 text-white" />
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}


