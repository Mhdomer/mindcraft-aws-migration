'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainLayout from '@/components/MainLayout';

export default function ClientLayout({ children, role, navItems }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar Wrapper */}
            {role !== 'guest' && (
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
