'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ClientLayout({ children, role, navItems }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // --- Session Persistence Logic ---

    // 1. Save current path (except auth routes)
    useEffect(() => {
        if (loading) return;
        if (!user) return; // Don't save for guests

        // List of paths to IGNORE (don't save as last visited)
        const ignorePaths = ['/login', '/register', '/forgot-password', '/'];

        if (!ignorePaths.includes(pathname)) {
            localStorage.setItem('mindcraft_last_path', pathname);
        }
    }, [pathname, user, loading]);

    // 2. Restore last path on fresh load
    useEffect(() => {
        if (loading) return;

        // If user is logged in and landing on generic generic pages, try to restore
        if (user && (pathname === '/' || pathname === '/login')) {
            const lastPath = localStorage.getItem('mindcraft_last_path');
            if (lastPath) {
                // Verify it's not the same path we're on to avoid loops (though 'ignorePaths' handles most)
                if (lastPath !== pathname) {
                    console.log('Restoring last session path:', lastPath);
                    router.replace(lastPath);
                }
            } else {
                // Default redirection if no history (e.g. first login)
                // Determine dashboard based on role? Or just let standard routing handle it.
                // Currently, we'll let them stay or be redirected by other logic if any.
                // Assuming standard role-based redirect happens elsewhere (e.g. Login page) if they explicitly visited Login.
                // But if they just opened '/' and are logged in:
                if (pathname === '/') {
                    if (role === 'admin') router.replace('/dashboard/admin');
                    else if (role === 'teacher') router.replace('/dashboard/teacher');
                    else if (role === 'student') router.replace('/dashboard/student');
                }
            }
        }
    }, [user, loading, pathname, router, role]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar Wrapper */}
            {role !== 'guest' && pathname !== '/' && (
                <div
                    className={`
						flex-shrink-0 h-screen sticky top-0 z-50 overflow-hidden bg-white border-r border-border shadow-sm
						transition-all duration-300 ease-in-out
						${isSidebarOpen ? 'w-52 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full'}
					`}
                >
                    {/* Pass explicit width/height to Sidebar to ensure it renders correctly regardless of wrapper clipping */}
                    <div className="w-52 h-full">
                        <Sidebar role={role} navItems={navItems} />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header
                    role={role}
                    toggleSidebar={toggleSidebar}
                    isSidebarOpen={isSidebarOpen}
                />
                <MainLayout>{children}</MainLayout>
            </div>
        </div>
    );
}
