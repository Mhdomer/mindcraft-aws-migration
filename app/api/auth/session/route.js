// API route to set session cookies after Firebase Auth login
import { NextResponse } from 'next/server';

export async function POST(request) {
	try {
		const { uid, email, role } = await request.json();
		
		if (!uid || !email || !role) {
			return NextResponse.json({ error: 'Missing user data' }, { status: 400 });
		}

		const res = NextResponse.json({ ok: true });
		
		// Set cookies for server-side role checks
		// Use sameSite: 'lax' for better compatibility and secure: true in production
		const cookieOptions = {
			httpOnly: true,
			path: '/',
			maxAge: 60 * 60 * 24, // 24 hours
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		};
		
		res.cookies.set('user_id', uid, cookieOptions);
		res.cookies.set('user_email', email, cookieOptions);
		res.cookies.set('user_role', role, cookieOptions);
		
		// For students, trigger recommendation generation in background (non-blocking)
		if (role === 'student') {
			// Don't await - let it run in background
			fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/recommendations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ language: 'en', forceRegenerate: false })
			}).catch(err => {
				console.error('Background recommendation generation failed:', err);
				// Silent fail - not critical
			});
		}
		
		return res;
	} catch (err) {
		return NextResponse.json({ error: 'Failed to set session', details: String(err) }, { status: 500 });
	}
}

