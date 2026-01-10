'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/contexts/AuthContext';
import {
	LayoutDashboard,
	UserPlus,
	BookOpen,
	BarChart3,
	FileText,
	ClipboardCheck,
	GraduationCap,
	MessageSquare,
	Home,
	Search,
	User,
	Users,
	Settings,
	Code,
	Lightbulb,
	Brain,
	ChevronDown,
	ChevronRight,
	Sparkles,
	Gamepad2,
	FileQuestion,
	Pickaxe,
	Map,
	Backpack
} from 'lucide-react';



import { useLanguage } from '@/app/contexts/LanguageContext';

const translations = {
	'bm': {
		'Dashboard': 'Papan Pemuka',
		'Courses': 'Kursus',
		'Activities': 'Aktiviti',
		'Progress': 'Kemajuan',
		'Forum': 'Forum',
		'AI Assistant': 'Pembantu AI',
		'Account': 'Akaun',
		'Profile': 'Profil',
		'Settings': 'Tetapan',
		'Assessments': 'Penilaian',
		'Assignments': 'Tugasan',
		'Game Levels': 'Tahap Permainan',
		'Explore Courses': 'Cari Kursus',
		'My Courses': 'Kursus Saya',
		'Create Course': 'Cipta Kursus',
		'Register Users': 'Daftar Pengguna',
		'Manage Users': 'Urus Pengguna',
		'Manage Courses': 'Urus Kursus',
		'Recommendations': 'Cadangan',
		'Coding Help': 'Bantuan Pengekodan',
		'Explain Concept': 'Jelaskan Konsep',
		'Guest': 'Tetamu',
		'student': 'Pelajar',
		'teacher': 'Cikgu',
		'admin': 'Pentadbir',
		'Home': 'Utama',
		'Sign In': 'Log Masuk',
	}
};

const iconMap = {
	'Dashboard': LayoutDashboard,
	'Register Users': UserPlus,
	'Manage Users': Users,
	'Manage Courses': BookOpen,
	'Settings': Settings,
	'Analytics': BarChart3,
	'Create Course': FileText,
	'Assessments': FileQuestion,
	'Assignments': FileText,
	'My Courses': BookOpen, // Learn
	'Courses': BookOpen,
	'Progress': Map, // Progress
	'Forum': MessageSquare,
	'Home': Home,
	'Explore Courses': Search,
	'Profile': Backpack, // Inventory
	'Account': Backpack,
	'Assignments': ClipboardCheck,
	'Sign In': null,
	'Coding Help': Code,
	'Explain Concept': Lightbulb,
	'Recommendations': Brain,
	'AI Assistant': Brain,
	'Game Levels': Gamepad2,
	'Activities': Gamepad2,
};

export default function Sidebar({ role: initialRole, navItems: initialNavItems }) {
	const pathname = usePathname();
	const { language } = useLanguage();

	const t = (text) => {
		if (language === 'bm' && translations['bm'][text]) {
			return translations['bm'][text];
		}
		return text;
	};

	if (pathname === '/') return null;

	const router = useRouter();
	const { userData } = useAuth();

	const [profilePicture, setProfilePicture] = useState(null);
	const [userName, setUserName] = useState('');
	const [currentRole, setCurrentRole] = useState(initialRole);
	const [navItems, setNavItems] = useState(initialNavItems);

	const [expandedItems, setExpandedItems] = useState(() => {
		// Auto-expand dropdowns when on their sub-pages
		const initial = new Set();
		if (!pathname) return initial;

		if (pathname.startsWith('/ai')) {
			initial.add('/ai');
		}
		if (pathname.startsWith('/courses')) {
			initial.add('/courses');
		}
		if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
			initial.add('/profile');
		}
		if (pathname.startsWith('/assessments') || pathname.startsWith('/assignments')) {
			initial.add('/assignments');
		}

		return initial;
	});

	// Sync local state with AuthContext data
	useEffect(() => {
		if (userData) {
			setProfilePicture(userData.profilePicture || null);
			setUserName(userData.name || '');
			if (userData.role && userData.role !== currentRole) {
				setCurrentRole(userData.role);
				router.refresh(); // Refresh to update nav items from server if role changed
			}
		} else {
			// If userData is null but we might be guest (handled by initialRole usually)
			// But if we truly logged out, AuthContext should reflect that.
			// For now, let's just stick to what we have.
			if (initialRole === 'guest') {
				setCurrentRole('guest');
				setProfilePicture(null);
				setUserName('');
			}
		}
	}, [userData, currentRole, router, initialRole]);

	// Listen to auth state changes and refresh the page - REMOVED (Handled by AuthContext)

	// Update nav items when role prop changes (from server refresh)
	useEffect(() => {
		setCurrentRole(initialRole);
		setNavItems(initialNavItems);
	}, [initialRole, initialNavItems]);

	// Auto-expand AI Assistant dropdown when on AI pages
	useEffect(() => {
		const updates = [
			{ href: '/ai', match: (p) => p.startsWith('/ai') },
			{ href: '/courses', match: (p) => p.startsWith('/courses') },
			{ href: '/profile', match: (p) => p.startsWith('/profile') || p.startsWith('/settings') },
			{ href: '/assignments', match: (p) => p.startsWith('/assessments') || p.startsWith('/assignments') },
		];

		setExpandedItems(prev => {
			const next = new Set(prev);
			for (const { href, match } of updates) {
				if (pathname && match(pathname)) {
					next.add(href);
				}
			}
			return next;
		});
	}, [pathname]);

	return (
		<aside className="flex flex-col h-full w-full bg-white dark:bg-neutralDark border-r border-border dark:border-neutral-800 shadow-sm transition-colors duration-300">
			{/* Logo/Brand - REMOVED (Moved to Header) */}
			{/* Added spacer if needed or just start with profile */}
			<div className="h-4"></div>



			{/* Profile Picture and Role Badge */}
			<div className="px-6 pb-6 flex items-center gap-3">
				{/* Profile Picture - Circular Container - Clickable */}
				{currentRole !== 'guest' ? (
					<Link
						href="/profile"
						className="cursor-pointer hover:opacity-80 transition-opacity"
					>
						{profilePicture ? (
							<img
								src={profilePicture}
								alt={userName || 'Profile'}
								className="w-[60px] h-[60px] rounded-full object-cover border-2 border-border flex-shrink-0"
							/>
						) : (
							<div className="w-[60px] h-[60px] rounded-full bg-primary/10 flex items-center justify-center border-2 border-border flex-shrink-0">
								<User className="h-8 w-8 text-primary" />
							</div>
						)}
					</Link>
				) : (
					<>
						{profilePicture ? (
							<img
								src={profilePicture}
								alt={userName || 'Profile'}
								className="w-[60px] h-[60px] rounded-full object-cover border-2 border-border flex-shrink-0"
							/>
						) : (
							<div className="w-[60px] h-[60px] rounded-full bg-primary/10 flex items-center justify-center border-2 border-border flex-shrink-0">
								<User className="h-8 w-8 text-primary" />
							</div>
						)}
					</>
				)}

				{/* Role Badge */}
				<span className="inline-flex items-center px-3 py-1 rounded-lg text-caption font-medium bg-neutralLight dark:bg-neutral-800 text-neutralDark dark:text-neutral-200 capitalize transition-colors duration-300">
					{t(currentRole === 'guest' ? 'Guest' : currentRole)}
				</span>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
				{navItems.map((item) => {
					const Icon = iconMap[item.label] || LayoutDashboard;
					const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

					// Determine if this item has sub-items (either from layout or AI Assistant)
					const isAIAssistant = item.href === '/ai';
					const layoutSubItems = Array.isArray(item.children) ? item.children : [];
					const aiSubItems = isAIAssistant ? [
						{ href: '/recommendations', label: 'Recommendations', icon: Brain },
						{ href: '/ai/coding-help', label: 'Coding Help', icon: Code },
						{ href: '/ai/explain', label: 'Explain Concept', icon: Lightbulb },
					] : [];
					const subItems = layoutSubItems.length > 0 ? layoutSubItems : aiSubItems;
					const hasSubItems = subItems.length > 0;
					const isExpanded = expandedItems.has(item.href);

					return (
						<div key={item.href}>
							{hasSubItems ? (
								<div
									className="group relative"
									onMouseEnter={() => {
										setExpandedItems(prev => {
											const next = new Set(prev);
											next.add(item.href);
											return next;
										});
									}}
									onMouseLeave={(e) => {
										// Only close if mouse is leaving the entire group area (including dropdown)
										const relatedTarget = e.relatedTarget;
										// Check if relatedTarget is a valid Node before calling contains
										if (relatedTarget && relatedTarget instanceof Node && !e.currentTarget.contains(relatedTarget)) {
											setExpandedItems(prev => {
												const next = new Set(prev);
												next.delete(item.href);
												return next;
											});
										} else if (!relatedTarget) {
											// If relatedTarget is null (mouse left the window), close the dropdown
											setExpandedItems(prev => {
												const next = new Set(prev);
												next.delete(item.href);
												return next;
											});
										}
									}}
								>
									<Link
										href={item.href}
										className={cn(
											'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-all duration-200 min-w-0',
											isActive
												? 'bg-primary text-white shadow-sm'
												: 'text-neutralDark dark:text-neutral-300 hover:bg-neutralLight dark:hover:bg-neutral-800'
										)}
									>
										{Icon && <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-neutralDark dark:text-neutral-400')} />}
										<span className="flex-1 min-w-0 overflow-visible whitespace-normal text-left">{t(item.label)}</span>
									</Link>
									<div
										className={`ml-4 mt-1 space-y-2 border-l-2 border-border/50 dark:border-neutral-700/50 pl-3 pr-2 bg-neutralLight/80 dark:bg-neutral-800/80 rounded-lg overflow-hidden transition-all duration-500 ease-in-out ${expandedItems.has(item.href)
											? 'max-h-[500px] opacity-100 py-3'
											: 'max-h-0 opacity-0 py-0'
											}`}
									>
										<div className="space-y-2">
											{subItems.map((subItem) => {
												const SubIcon = subItem.icon || iconMap[subItem.label] || null;
												const isSubActive = pathname === subItem.href || pathname?.startsWith(subItem.href + '/');
												return (
													<Link
														key={subItem.href}
														href={subItem.href}
														className={cn(
															'flex items-center gap-3 px-3 py-2 rounded-lg text-body transition-all duration-300 min-w-0',
															isSubActive
																? 'bg-primary/10 text-primary font-medium'
																: 'text-neutralDark dark:text-neutral-300 hover:bg-neutralLight dark:hover:bg-neutral-800'
														)}
													>
														{SubIcon && (
															<SubIcon
																className={cn(
																	'h-5 w-5 flex-shrink-0',
																	isSubActive ? 'text-primary' : 'text-neutralDark dark:text-neutral-400'
																)}
															/>
														)}
														<span className="flex-1 min-w-0 overflow-visible whitespace-normal">{t(subItem.label)}</span>
													</Link>
												);
											})}
										</div>
									</div>
								</div>
							) : (
								<Link
									href={item.href}
									className={cn(
										'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-all duration-200 min-w-0',
										isActive
											? 'bg-primary text-white shadow-sm'
											: 'text-neutralDark dark:text-neutral-300 hover:bg-neutralLight dark:hover:bg-neutral-800'
									)}
								>
									{Icon && <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-neutralDark dark:text-neutral-400')} />}
									<span className="flex-1 min-w-0 overflow-visible whitespace-normal">{t(item.label)}</span>
								</Link>
							)}
						</div>
					);
				})}
			</nav>
		</aside>
	);
}
