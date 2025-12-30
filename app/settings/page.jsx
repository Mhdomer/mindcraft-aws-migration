'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Languages, Moon, Sun } from 'lucide-react';

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
		<div className="space-y-8 max-w-3xl">
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">
					{language === 'bm' ? 'Tetapan Akaun' : 'Account Settings'}
				</h1>
				<p className="text-body text-muted-foreground">
					{language === 'bm'
						? 'Sesuaikan bahasa, tema dan tetapan pengalaman anda.'
						: 'Customize your language, theme, and experience settings.'}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{language === 'bm' ? 'Bahasa & Antara Muka' : 'Language & Interface'}</CardTitle>
					<CardDescription>
						{language === 'bm'
							? 'Pilih bahasa paparan dan mod tema untuk keseluruhan aplikasi.'
							: 'Choose your display language and theme mode for the whole app.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-body font-medium flex items-center gap-2">
								<Languages className="h-4 w-4" />
								{language === 'bm' ? 'Bahasa Paparan' : 'Display Language'}
							</p>
							<p className="text-caption text-muted-foreground">
								{language === 'bm'
									? 'Tukar antara English dan Bahasa Melayu.'
									: 'Switch between English and Bahasa Melayu.'}
							</p>
						</div>
						<Button variant="outline" size="sm" onClick={handleLanguageToggle}>
							<Languages className="h-4 w-4 mr-2" />
							<span className="font-medium">{language === 'en' ? 'EN' : 'BM'}</span>
						</Button>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<p className="text-body font-medium flex items-center gap-2">
								{theme === 'dark' ? (
									<Moon className="h-4 w-4" />
								) : (
									<Sun className="h-4 w-4" />
								)}
								{language === 'bm' ? 'Mod Tema' : 'Theme Mode'}
							</p>
							<p className="text-caption text-muted-foreground">
								{language === 'bm'
									? 'Pilih antara tema cerah atau gelap.'
									: 'Choose between light or dark theme.'}
							</p>
						</div>
						<Switch
							checked={theme === 'dark'}
							onCheckedChange={handleThemeToggle}
							aria-label={language === 'bm' ? 'Tukar mod tema' : 'Toggle theme mode'}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}


