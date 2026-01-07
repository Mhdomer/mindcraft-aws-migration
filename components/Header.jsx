'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/app/components/SignOutButton';

import { Button } from './ui/button';
import { useLanguage } from '@/app/contexts/LanguageContext';
import NotificationBell from './NotificationBell';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { User } from 'lucide-react';

export default function Header({ role: initialRole }) {
	const router = useRouter();
	// ... (omitting lines for brevity, wait, replacement content must be precise if I use replace_file_content)
	// I will split this into two replacements or use multi_replace.
	// One to add import, one to replace button.
	const pathname = usePathname();
	const { language, setLanguage } = useLanguage();
	const [currentRole, setCurrentRole] = useState(initialRole);

	// Listen to auth state changes and refresh the page
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// Get user role from Firestore
				try {
					const userDocRef = doc(db, 'user', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						const userData = userDoc.data();
						const newRole = userData.role || 'student';

						// Update role if it changed (using functional update to avoid dependency)
						setCurrentRole(prevRole => {
							if (newRole !== prevRole) {
								// Refresh server component to get updated role
								router.refresh();
								return newRole;
							}
							return prevRole;
						});
					}
				} catch (error) {
					console.error('Error fetching user role:', error);
				}
			} else {
				// User signed out
				setCurrentRole(prevRole => {
					if (prevRole !== 'guest') {
						router.refresh();
						return 'guest';
					}
					return prevRole;
				});
			}
		});

		return () => unsubscribe();
	}, [router]);

	// Update role when prop changes (from server refresh)
	useEffect(() => {
		setCurrentRole(initialRole);
	}, [initialRole]);

	return (
		<header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm relative w-full h-35">
			<div className="flex items-center h-full w-full px-6">
				{/* Logo - visible on mobile OR if guest (since sidebar is hidden for guests) */}
				{/* Logo - visible on mobile OR if guest (since sidebar is hidden for guests) */}
				<div className="flex items-center gap-2 mr-auto cursor-pointer">
					<Link href="/" className="relative transition-transform hover:scale-105 block no-underline">
						<span className="font-pixel text-4xl font-bold text-primary tracking-wider">MindCraft</span>
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
									className="font-bold text-neutralDark hover:bg-neutralLight px-2 min-w-[3rem]"
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

