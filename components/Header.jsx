'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/app/components/SignOutButton';

import { Button } from './ui/button';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import NotificationBell from './NotificationBell';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { User, Menu } from 'lucide-react';

export default function Header({ role: initialRole, toggleSidebar }) {
	const router = useRouter();
	// ... (omitting lines for brevity, wait, replacement content must be precise if I use replace_file_content)
	// I will split this into two replacements or use multi_replace.
	// One to add import, one to replace button.
	// ... (omitting lines for brevity, wait, replacement content must be precise if I use replace_file_content)
	// I will split this into two replacements or use multi_replace.
	// One to add import, one to replace button.
	const pathname = usePathname();
	const { language, setLanguage } = useLanguage();
	const { userData } = useAuth();

	const [currentRole, setCurrentRole] = useState(initialRole);

	// Sync local role with AuthContext data
	useEffect(() => {
		if (userData && userData.role && userData.role !== currentRole) {
			setCurrentRole(userData.role);
			router.refresh();
		} else if (!userData && initialRole === 'guest') {
			setCurrentRole('guest');
		}
	}, [userData, currentRole, initialRole, router]);

	// Listen to auth state changes and refresh the page - REMOVED (Handled by AuthContext)

	// Update role when prop changes (from server refresh)
	useEffect(() => {
		setCurrentRole(initialRole);
	}, [initialRole]);

	if (pathname === '/login') return null;

	return (
		<header className="sticky top-0 z-40 bg-white dark:bg-neutralDark border-b border-border dark:border-neutral-800 shadow-sm relative w-full h-35 transition-colors duration-300">
			<div className="flex items-center h-full w-full px-6">
				{/* Logo - visible on mobile OR if guest (since sidebar is hidden for guests) */}
				{/* Sidebar Toggle & Logo */}
				<div className="flex items-center gap-4 mr-auto">
					{currentRole !== 'guest' && (
						<Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-neutralDark dark:text-neutral-200 hover:bg-neutralLight dark:hover:bg-neutral-800">
							<Menu className="h-6 w-6" />
						</Button>
					)}

					<Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
						<div className="h-10 w-10 rounded-full overflow-hidden border border-border shadow-sm">
							<img
								src="/logoMindCraft.jpg"
								alt="MindCraft Logo"
								className="w-full h-full object-cover"
								onError={(e) => e.target.style.display = 'none'}
							/>
						</div>
						<span className="font-pixel text-3xl font-bold text-primary tracking-wider hidden sm:block">MindCraft</span>
					</Link>
				</div>

				{/* User Actions */}
				<div className="flex items-center gap-4 flex-shrink-0">
					{currentRole === 'guest' ? (
						<>

							<Link href="/login">
								<Button variant="ghost" className="text-lg px-2 py-2 h-auto font-bold hover:bg-neutralLight transition-all rounded-md flex items-center gap-3 group">
									<div className="w-10 h-10 bg-neutralLight border-2 border-black flex items-center justify-center rounded-sm shadow-sm group-hover:scale-105 transition-transform">
										<User className="h-6 w-6 text-neutralDark" />
									</div>
									<span className="mr-2 hidden sm:inline">Sign In</span>
								</Button>
							</Link>
						</>
					) : (
						<>
							{pathname !== '/' && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setLanguage(language === 'en' ? 'bm' : 'en')}
									className="font-bold text-neutralDark dark:text-neutral-200 hover:bg-neutralLight dark:hover:bg-neutral-800 px-2 min-w-[3rem]"
									title={language === 'en' ? 'Switch to Bahasa Melayu' : 'Tukar ke Bahasa Inggeris'}
								>
									{language === 'en' ? 'EN' : 'BM'}
								</Button>
							)}
							<SignOutButton />
						</>
					)}
				</div>
			</div>
		</header>
	);
}

