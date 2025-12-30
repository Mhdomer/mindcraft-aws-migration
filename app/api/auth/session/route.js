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
		res.cookies.set('user_id', uid, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
		res.cookies.set('user_email', email, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
		res.cookies.set('user_role', role, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
		
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

