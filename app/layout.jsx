import '../styles/globals.css';
import MainLayout from '@/components/MainLayout';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { LanguageProvider } from '@/app/contexts/LanguageContext';

export const metadata = {
	title: 'MindCraft',
	description: 'AI-assisted learning platform',
};

async function getRole() {
	const cookieStore = await cookies();
	return cookieStore.get('user_role')?.value || 'guest';
}

function getNavItems(role) {
	if (role === 'admin') {
		return [
			{ href: '/dashboard/admin', label: 'Dashboard' },
			{ href: '/admin/register', label: 'Register Users' },
			{ href: '/admin/users', label: 'Manage Users' },
			{ href: '/admin/courses', label: 'Manage Courses' },
			{ href: '/admin/settings', label: 'Settings' },
			{ href: '/assignments', label: 'Assignments' },
			{ href: '/profile', label: 'Profile' },
			{ href: '/analytics', label: 'Analytics' },
			{ href: '/forum', label: 'Forum' },
		];
	} else if (role === 'teacher') {
		return [
			{ href: '/dashboard/teacher', label: 'Dashboard' },
			{ href: '/dashboard/courses/new', label: 'Create Course' },
			{ href: '/admin/courses', label: 'Manage Courses' },
			{ href: '/profile', label: 'Profile' },
			{ href: '/assessments', label: 'Assessments' },
			{ href: '/assignments', label: 'Assignments' },
			{ href: '/analytics', label: 'Analytics' },
			{ href: '/forum', label: 'Forum' },
		];
	} else if (role === 'student') {
		return [
			{ href: '/dashboard/student', label: 'Dashboard' },
			{
				href: '/courses',
				label: 'Courses',
				children: [
					{ href: '/courses', label: 'My Courses' },
					{ href: '/courses/explore', label: 'Explore Courses' },
				],
			},
			{
				href: '/assignments',
				label: 'Activities',
				children: [
					{ href: '/assessments', label: 'Assessments' },
					{ href: '/assignments', label: 'Assignments' },
					{ href: '/game-levels', label: 'Game Levels' },
				],
			},
			{ href: '/progress', label: 'Progress' },
			{ href: '/forum', label: 'Forum' },
			{ href: '/ai', label: 'AI Assistant' },
			{
				href: '/profile',
				label: 'Account',
				children: [
					{ href: '/profile', label: 'Profile' },
					{ href: '/settings', label: 'Settings' },
				],
			},
		];
	}
	// Guest nav
	return [
		{ href: '/', label: 'Home' },
		{ href: '/explore', label: 'Explore Courses' },
		{ href: '/login', label: 'Sign In' },
	];
}

export default async function RootLayout({ children }) {
	const role = await getRole();
	const navItems = getNavItems(role);

	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link href="https://fonts.googleapis.com/css2?family=Silkscreen&family=VT323&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
			</head>
			<body className="min-h-screen bg-neutralLight font-sans">
				<LanguageProvider>
					<div className="flex min-h-screen">
						{/* Sidebar - in normal flow, takes up space. Only show for logged in users (not guest) */}
						{role !== 'guest' && <Sidebar role={role} navItems={navItems} />}

						{/* Main content area */}
						<div className="flex-1 flex flex-col min-w-0">
							{/* Header - spans rest of width */}
							<Header role={role} />

							{/* Main content */}
							<MainLayout>{children}</MainLayout>
						</div>
					</div>
				</LanguageProvider>
			</body>
		</html>
	);
}
