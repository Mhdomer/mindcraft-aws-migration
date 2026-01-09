'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
	const router = useRouter();

	async function handleSignOut() {
		try {
			// Sign out from Firebase Auth
			await signOut(auth);

			// Clear cookies via API
			try {
				await fetch('/api/auth/logout', { method: 'POST' });
			} catch (apiErr) {
				console.warn('Logout API error (non-critical):', apiErr);
			}

			// Force full page reload to ensure server sees cleared cookies
			// Use href to ensure we explicitly navigate to the login page
			setTimeout(() => {
				window.location.href = '/login';
			}, 100);
		} catch (err) {
			console.error('Sign out error:', err);
			// Still redirect even if there's an error
			setTimeout(() => {
				window.location.href = '/login';
			}, 100);
		}
	}

	return (
		<Button
			onClick={handleSignOut}
			variant="destructive"
			size="sm"
		>
			Sign Out
		</Button>
	);
}

