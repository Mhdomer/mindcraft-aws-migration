'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Palette, Moon, Sun, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
	const router = useRouter();
	const { language, setLanguage } = useLanguage();
	const { userData, loading: authLoading } = useAuth();
	const [theme, setTheme] = useState('light');

	const t = {
		pageTitle: language === 'bm' ? 'Tetapan Admin' : 'Admin Settings',
		pageDesc: language === 'bm' ? 'Urus tetapan aplikasi' : 'Manage application settings',
		appearance: language === 'bm' ? 'Penampilan' : 'Appearance',
		appearanceDesc: language === 'bm' ? 'Sesuaikan penampilan antaramuka' : 'Customize your interface appearance',
		language: language === 'bm' ? 'Bahasa' : 'Language',
		languageDesc: language === 'bm' ? 'Pilih bahasa paparan aplikasi' : 'Choose your preferred display language',
		lightMode: language === 'bm' ? 'Cerah' : 'Light Mode',
		classicLook: language === 'bm' ? 'Tema klasik' : 'Classic clean look',
		darkMode: language === 'bm' ? 'Gelap' : 'Dark Mode',
		easyEyes: language === 'bm' ? 'Kurangkan silau' : 'Easy on the eyes',
		english: 'English', default: 'Default', bahasa: 'Bahasa Melayu', malaysia: 'Malaysia',
	};

	useEffect(() => {
		if (!authLoading && userData?.role !== 'admin') {
			router.push('/dashboard/student');
		}
	}, [authLoading, userData, router]);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const stored = window.localStorage.getItem('theme');
			const initialTheme = stored === 'dark' ? 'dark' : 'light';
			setTheme(initialTheme);
			applyTheme(initialTheme);
		}
	}, []);

	function applyTheme(nextTheme) {
		if (typeof window === 'undefined') return;
		const root = document.documentElement;
		if (nextTheme === 'dark') root.classList.add('dark');
		else root.classList.remove('dark');
		window.localStorage.setItem('theme', nextTheme);
	}

	function handleThemeToggle(checked) {
		const next = checked ? 'dark' : 'light';
		setTheme(next);
		applyTheme(next);
	}

	if (authLoading || !userData) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">{language === 'bm' ? 'Memuatkan...' : 'Loading...'}</p>
			</div>
		);
	}

	if (userData.role !== 'admin') return null;

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 z-0 pointer-events-none transition-colors duration-500"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-fadeIn">
				<div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent inline-flex items-center gap-2">
						{t.pageTitle} <Sparkles className="h-6 w-6 text-yellow-400" />
					</h1>
					<p className="text-muted-foreground mt-2 text-lg dark:text-neutral-400">{t.pageDesc}</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2">
					{/* Language Section */}
					<Card className="border-none shadow-md bg-white/80 dark:bg-neutral-800/60 backdrop-blur-md overflow-hidden group hover:shadow-lg transition-all duration-300">
						<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
						<CardHeader>
							<CardTitle className="flex items-center gap-2 dark:text-white">
								<Globe className="h-5 w-5 text-blue-500" />{t.language}
							</CardTitle>
							<CardDescription className="dark:text-neutral-400">{t.languageDesc}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<div
								onClick={() => setLanguage('en')}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between',
									language === 'en'
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-blue-600 font-bold border border-blue-100 text-xs">EN</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", language === 'en' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.english}</span>
										<span className="text-xs text-muted-foreground">{t.default}</span>
									</div>
								</div>
								{language === 'en' && <div className="bg-blue-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
							</div>

							<div
								onClick={() => setLanguage('bm')}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between',
									language === 'bm'
										? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-emerald-600 font-bold border border-emerald-100 text-xs">BM</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", language === 'bm' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.bahasa}</span>
										<span className="text-xs text-muted-foreground">{t.malaysia}</span>
									</div>
								</div>
								{language === 'bm' && <div className="bg-emerald-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
							</div>
						</CardContent>
					</Card>

					{/* Theme Section */}
					<Card className="border-none shadow-md bg-white/80 dark:bg-neutral-800/60 backdrop-blur-md overflow-hidden group hover:shadow-lg transition-all duration-300">
						<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
						<CardHeader>
							<CardTitle className="flex items-center gap-2 dark:text-white">
								<Palette className="h-5 w-5 text-amber-500" />{t.appearance}
							</CardTitle>
							<CardDescription className="dark:text-neutral-400">{t.appearanceDesc}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<div
								onClick={() => handleThemeToggle(false)}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between',
									theme !== 'dark'
										? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-amber-600 border border-amber-100">
										<Sun className="w-4 h-4" />
									</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", theme !== 'dark' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.lightMode}</span>
										<span className="text-xs text-muted-foreground">{t.classicLook}</span>
									</div>
								</div>
								{theme !== 'dark' && <div className="bg-amber-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
							</div>

							<div
								onClick={() => handleThemeToggle(true)}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between',
									theme === 'dark'
										? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-indigo-600 border border-indigo-100">
										<Moon className="w-4 h-4" />
									</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", theme === 'dark' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.darkMode}</span>
										<span className="text-xs text-muted-foreground">{t.easyEyes}</span>
									</div>
								</div>
								{theme === 'dark' && <div className="bg-indigo-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
