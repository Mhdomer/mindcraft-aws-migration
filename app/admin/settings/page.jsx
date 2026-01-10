'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, Image as ImageIcon, Sparkles, Globe, Palette, Moon, Sun, Check, Settings } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
	const router = useRouter();
	const { language, setLanguage } = useLanguage();
	const [userRole, setUserRole] = useState(null);
	const [loading, setLoading] = useState(true);

	// Logo upload states
	const [logoUrl, setLogoUrl] = useState('');
	const [logoFile, setLogoFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	// Theme state
	const [theme, setTheme] = useState('light');

	// Translations
	const t = {
		pageTitle: language === 'bm' ? 'Tetapan Admin' : 'Admin Settings',
		pageDesc: language === 'bm' ? 'Urus tetapan aplikasi' : 'Manage application settings',
		appLogo: language === 'bm' ? 'Logo Aplikasi' : 'Application Logo',
		appLogoDesc: language === 'bm' ? 'Muat naik logo pasukan anda untuk dipaparkan di bar sisi' : 'Upload your team logo to display in the sidebar',
		currentLogo: language === 'bm' ? 'Logo Semasa' : 'Current Logo',
		previewShown: language === 'bm' ? 'Pratonton ditunjukkan di atas' : 'Preview shown above',
		noLogo: language === 'bm' ? 'Tiada logo dimuat naik' : 'No logo uploaded',
		uploadDesc: language === 'bm' ? 'Muat naik logo untuk dipaparkan di bar sisi' : 'Upload a logo to display in sidebar',
		chooseLogo: language === 'bm' ? 'Pilih Logo' : 'Choose Logo',
		upload: language === 'bm' ? 'Muat Naik' : 'Upload',
		uploading: language === 'bm' ? 'Sedang Memuat Naik...' : 'Uploading...',
		saveSettings: language === 'bm' ? 'Simpan Tetapan' : 'Save Settings',
		saving: language === 'bm' ? 'Menyimpan...' : 'Saving...',
		appearance: language === 'bm' ? 'Penampilan' : 'Appearance',
		appearanceDesc: language === 'bm' ? 'Sesuaikan penampilan antaramuka' : 'Customize your interface appearance',
		language: language === 'bm' ? 'Bahasa' : 'Language',
		languageDesc: language === 'bm' ? 'Pilih bahasa paparan aplikasi' : 'Choose your preferred display language',
		lightMode: language === 'bm' ? 'Cerah' : 'Light Mode',
		classicLook: language === 'bm' ? 'Tema klasik' : 'Classic clean look',
		darkMode: language === 'bm' ? 'Gelap' : 'Dark Mode',
		easyEyes: language === 'bm' ? 'Kurangkan silau' : 'Easy on the eyes',
		english: 'English',
		default: 'Default',
		bahasa: 'Bahasa Melayu',
		malaysia: 'Malaysia',
		recSize: language === 'bm' ? 'Disyorkan: Imej persegi (cth., 128x128px), maks 2MB' : 'Recommended: Square image (e.g., 128x128px), max 2MB',
	};

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'admin') {
						router.push('/dashboard/student');
					} else {
						loadSettings();
					}
				}
			} else {
				router.push('/login');
			}
		});

		// Load theme
		if (typeof window !== 'undefined') {
			const stored = window.localStorage.getItem('theme');
			const initialTheme = stored === 'dark' ? 'dark' : 'light';
			setTheme(initialTheme);
			applyTheme(initialTheme);
		}

		return () => unsubscribe();
	}, [router]);

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

	async function loadSettings() {
		try {
			const settingsDoc = await getDoc(doc(db, 'setting', 'app'));
			if (settingsDoc.exists()) {
				const data = settingsDoc.data();
				setLogoUrl(data.logoUrl || '');
			}
		} catch (err) {
			console.error('Error loading settings:', err);
		} finally {
			setLoading(false);
		}
	}

	function handleLogoChange(e) {
		const file = e.target.files[0];
		if (file) {
			if (file.size > 2 * 1024 * 1024) {
				setError('Logo must be less than 2MB');
				return;
			}
			if (!file.type.startsWith('image/')) {
				setError('File must be an image');
				return;
			}
			setLogoFile(file);
			setError('');
			// Preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoUrl(reader.result);
			};
			reader.readAsDataURL(file);
		}
	}

	async function handleUploadLogo() {
		if (!logoFile || !auth.currentUser) {
			setError('Please select a logo file');
			return;
		}

		setUploading(true);
		setError('');

		try {
			const fileRef = ref(storage, `app-logo/logo_${Date.now()}_${logoFile.name}`);
			await uploadBytes(fileRef, logoFile);
			const url = await getDownloadURL(fileRef);
			setLogoUrl(url);
			setSuccess('Logo uploaded successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error uploading logo:', err);
			setError('Failed to upload logo: ' + (err.message || 'Unknown error'));
		} finally {
			setUploading(false);
		}
	}

	async function handleSave() {
		if (!logoUrl) {
			setError('Please upload a logo first');
			return;
		}

		setSaving(true);
		setError('');

		try {
			await setDoc(doc(db, 'setting', 'app'), {
				logoUrl,
				updatedAt: new Date(),
				updatedBy: auth.currentUser.uid,
			}, { merge: true });

			setSuccess('Settings saved successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error saving settings:', err);
			setError('Failed to save settings: ' + (err.message || 'Unknown error'));
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">{language === 'bm' ? 'Memuatkan...' : 'Loading...'}</p>
			</div>
		);
	}

	if (userRole !== 'admin') {
		return null;
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 z-0 pointer-events-none transition-colors duration-500"></div>
			<div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/40 dark:bg-emerald-900/10 rounded-full blur-[80px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-100/40 dark:bg-sky-900/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-fadeIn">
				{/* Header */}
				<div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent inline-flex items-center gap-2">
						{t.pageTitle} <Sparkles className="h-6 w-6 text-yellow-400" />
					</h1>
					<p className="text-muted-foreground mt-2 text-lg dark:text-neutral-400">
						{t.pageDesc}
					</p>
				</div>

				{/* Logo Settings */}
				<Card className="border-none shadow-md bg-white/80 dark:bg-neutral-800/60 backdrop-blur-md overflow-hidden transition-colors duration-300">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 dark:text-white">
							<Settings className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
							{t.appLogo}
						</CardTitle>
						<CardDescription className="dark:text-neutral-400">{t.appLogoDesc}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{error && (
							<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg animate-slideIn">
								<p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
							</div>
						)}

						{success && (
							<div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg animate-slideIn">
								<p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{success}</p>
							</div>
						)}

						<div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-white/50 dark:bg-neutral-900/50 rounded-xl border border-white/60 dark:border-neutral-700/50">
							{logoUrl ? (
								<div className="relative group">
									<div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
									<img
										src={logoUrl}
										alt="App Logo"
										className="h-24 w-24 object-contain border-2 border-white dark:border-neutral-700 shadow-sm rounded-lg relative z-10 bg-white dark:bg-neutral-800"
									/>
								</div>
							) : (
								<div className="h-24 w-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/50">
									<ImageIcon className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
								</div>
							)}
							<div className="flex-1 text-center md:text-left">
								<p className="font-medium text-neutral-700 dark:text-neutral-200">{logoUrl ? t.currentLogo : t.noLogo}</p>
								<p className="text-sm text-muted-foreground dark:text-neutral-400">{logoUrl ? t.previewShown : t.uploadDesc}</p>
							</div>
						</div>

						<div className="space-y-4">
							<input
								type="file"
								id="logo"
								accept="image/*"
								onChange={handleLogoChange}
								className="hidden"
							/>
							<div className="flex flex-wrap gap-3">
								<Button
									type="button"
									variant="outline"
									onClick={() => document.getElementById('logo')?.click()}
									disabled={uploading}
									className="bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-700"
								>
									<Upload className="h-4 w-4 mr-2" />
									{t.chooseLogo}
								</Button>
								{logoFile && (
									<Button
										type="button"
										onClick={handleUploadLogo}
										disabled={uploading}
										className="bg-emerald-600 hover:bg-emerald-700 text-white"
									>
										{uploading ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												{t.uploading}
											</>
										) : (
											<>
												<Upload className="h-4 w-4 mr-2" />
												{t.upload}
											</>
										)}
									</Button>
								)}
							</div>
							<p className="text-xs text-muted-foreground dark:text-neutral-500">
								{t.recSize}
							</p>
						</div>

						<div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
							<Button
								onClick={handleSave}
								disabled={saving || !logoUrl}
								className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
							>
								{saving ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										{t.saving}
									</>
								) : (
									t.saveSettings
								)}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Two Column Grid for Language and Theme */}
				<div className="grid gap-8 md:grid-cols-2">
					{/* Language Section */}
					<Card className="border-none shadow-md bg-white/80 dark:bg-neutral-800/60 backdrop-blur-md overflow-hidden group hover:shadow-lg transition-all duration-300">
						<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
						<CardHeader>
							<CardTitle className="flex items-center gap-2 dark:text-white">
								<Globe className="h-5 w-5 text-blue-500" />
								{t.language}
							</CardTitle>
							<CardDescription className="dark:text-neutral-400">{t.languageDesc}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{/* English */}
							<div
								onClick={() => setLanguage('en')}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group/item',
									language === 'en'
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900 text-xs">
										EN
									</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", language === 'en' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.english}</span>
										<span className="text-xs text-muted-foreground">{t.default}</span>
									</div>
								</div>
								{language === 'en' && (
									<div className="bg-blue-500 rounded-full p-1">
										<Check className="w-4 h-4 text-white" />
									</div>
								)}
							</div>

							{/* BM */}
							<div
								onClick={() => setLanguage('bm')}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group/item',
									language === 'bm'
										? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900 text-xs">
										BM
									</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", language === 'bm' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.bahasa}</span>
										<span className="text-xs text-muted-foreground">{t.malaysia}</span>
									</div>
								</div>
								{language === 'bm' && (
									<div className="bg-emerald-500 rounded-full p-1">
										<Check className="w-4 h-4 text-white" />
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Theme Section */}
					<Card className="border-none shadow-md bg-white/80 dark:bg-neutral-800/60 backdrop-blur-md overflow-hidden group hover:shadow-lg transition-all duration-300">
						<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
						<CardHeader>
							<CardTitle className="flex items-center gap-2 dark:text-white">
								<Palette className="h-5 w-5 text-amber-500" />
								{t.appearance}
							</CardTitle>
							<CardDescription className="dark:text-neutral-400">{t.appearanceDesc}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{/* Light */}
							<div
								onClick={() => handleThemeToggle(false)}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group/item',
									theme !== 'dark'
										? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
										<Sun className="w-4 h-4" />
									</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", theme !== 'dark' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.lightMode}</span>
										<span className="text-xs text-muted-foreground">{t.classicLook}</span>
									</div>
								</div>
								{theme !== 'dark' && (
									<div className="bg-amber-500 rounded-full p-1">
										<Check className="w-4 h-4 text-white" />
									</div>
								)}
							</div>

							{/* Dark */}
							<div
								onClick={() => handleThemeToggle(true)}
								className={cn(
									'cursor-pointer relative p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group/item',
									theme === 'dark'
										? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
										: 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:scale-[1.02]'
								)}
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
										<Moon className="w-4 h-4" />
									</div>
									<div className="flex flex-col">
										<span className={cn("font-semibold text-sm", theme === 'dark' ? "text-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400")}>{t.darkMode}</span>
										<span className="text-xs text-muted-foreground">{t.easyEyes}</span>
									</div>
								</div>
								{theme === 'dark' && (
									<div className="bg-indigo-500 rounded-full p-1">
										<Check className="w-4 h-4 text-white" />
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
