'use client';

import { usePathname } from 'next/navigation';

export default function MainLayout({ children }) {
    const pathname = usePathname();
    const isLandingPage = pathname === '/' || pathname === '/login';

    return (
        <main className={`flex-1 overflow-y-auto ${isLandingPage ? 'p-0' : 'p-6 md:p-8 lg:p-10'}`}>
            {children}
        </main>
    );
}
