// Mark notification as read
// PUT /api/notifications/[id]/read

import { NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { cookies } from 'next/headers';

export async function PUT(request, { params }) {
	try {
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get('session');

		if (!sessionCookie) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id: notificationId } = await params;

		if (!notificationId) {
			return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
		}

		// Mark notification as read
		await updateDoc(doc(db, 'notification', notificationId), {
			read: true,
			readAt: new Date(),
		});

		return NextResponse.json({ success: true, message: 'Notification marked as read' });
	} catch (err) {
		console.error('Error marking notification as read:', err);
		return NextResponse.json({ 
			error: 'Failed to mark notification as read', 
			details: err.message 
		}, { status: 500 });
	}
}
