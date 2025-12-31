// API route for notifications
// GET /api/notifications - Get notifications for current user
// POST /api/notifications - Create a notification (teacher only)

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { adminDb } from '@/lib/admin';

// Helper function to get user ID from cookies (matching other API routes)
function getUserId(request) {
	const cookie = request.headers.get('cookie') || '';
	const match = cookie.match(/user_id=([^;]+)/);
	if (!match) return null;
	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

// GET /api/notifications - Get notifications for current user
export async function GET(request) {
	try {
		// Get userId from query params or cookies
		const { searchParams } = new URL(request.url);
		let userId = searchParams.get('userId');
		
		// If not in query, try to get from cookies
		if (!userId) {
			userId = getUserId(request);
		}

		if (!userId) {
			return NextResponse.json({ error: 'User ID required' }, { status: 400 });
		}

		// Use Admin SDK if available, otherwise fallback to Web SDK
		let notifications;
		if (adminDb) {
			const snapshot = await adminDb.collection('notification')
				.where('userId', '==', userId)
				.get();
			notifications = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
		} else {
			const notificationsQuery = query(
				collection(db, 'notification'),
				where('userId', '==', userId)
			);
			const notificationsSnapshot = await getDocs(notificationsQuery);
			notifications = notificationsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
		}

		// Sort by creation date (newest first)
		notifications.sort((a, b) => {
			const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
			const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
			return bTime - aTime;
		});

		return NextResponse.json({ notifications });
	} catch (err) {
		console.error('Error fetching notifications:', err);
		return NextResponse.json({ 
			error: 'Failed to fetch notifications', 
			details: err.message 
		}, { status: 500 });
	}
}

// POST /api/notifications - Create a notification
export async function POST(request) {
	try {
		// Note: In production, verify the user is authenticated and is a teacher
		// For now, we'll trust that only authenticated users can access this endpoint
		// since it's called from authenticated pages only
		
		const body = await request.json();
		const { userId, type, title, message, courseId, guidance, itemId } = body;

		// Enhanced validation with detailed error messages
		if (!userId) {
			return NextResponse.json({ 
				error: 'Missing required field: userId',
				details: 'User ID is required to send a notification'
			}, { status: 400 });
		}
		if (!type) {
			return NextResponse.json({ 
				error: 'Missing required field: type',
				details: 'Notification type is required (e.g., "risk_alert")'
			}, { status: 400 });
		}
		if (!title) {
			return NextResponse.json({ 
				error: 'Missing required field: title',
				details: 'Notification title is required'
			}, { status: 400 });
		}
		if (!message) {
			return NextResponse.json({ 
				error: 'Missing required field: message',
				details: 'Notification message is required'
			}, { status: 400 });
		}

		// Validate userId format (should be a non-empty string)
		if (typeof userId !== 'string' || userId.trim().length === 0) {
			return NextResponse.json({ 
				error: 'Invalid userId format',
				details: `userId must be a non-empty string, received: ${typeof userId}`
			}, { status: 400 });
		}

		console.log('Creating notification with data:', {
			userId,
			type,
			title: title.substring(0, 50) + '...',
			message: message.substring(0, 50) + '...',
			courseId: courseId || 'null',
			hasGuidance: !!guidance
		});

		// Use Admin SDK for server-side writes (bypasses security rules)
		// Fallback to Web SDK if Admin SDK is not configured
		let notificationRef;
		if (adminDb) {
			const { FieldValue } = await import('firebase-admin/firestore');
			notificationRef = await adminDb.collection('notification').add({
				userId: userId.trim(),
				type, // 'risk_alert', 'feedback_released', 'custom', etc.
				title: title.trim(),
				message: message.trim(),
				courseId: courseId ? courseId.trim() : null,
				itemId: itemId ? itemId.trim() : null,
				guidance: guidance ? guidance.trim() : null,
				read: false,
				createdAt: FieldValue.serverTimestamp(),
			});
			console.log('Notification created successfully with Admin SDK:', notificationRef.id);
		} else {
			// Fallback to Web SDK (requires proper security rules)
			const { addDoc, serverTimestamp } = await import('firebase/firestore');
			notificationRef = await addDoc(collection(db, 'notification'), {
				userId: userId.trim(),
				type,
				title: title.trim(),
				message: message.trim(),
				courseId: courseId ? courseId.trim() : null,
				itemId: itemId ? itemId.trim() : null,
				guidance: guidance ? guidance.trim() : null,
				read: false,
				createdAt: serverTimestamp(),
			});
			console.log('Notification created successfully with Web SDK:', notificationRef.id);
		}

		return NextResponse.json({ 
			success: true, 
			notificationId: notificationRef.id,
			message: 'Notification created successfully'
		});
	} catch (err) {
		console.error('Error creating notification:', err);
		console.error('Error stack:', err.stack);
		return NextResponse.json({ 
			error: 'Failed to create notification', 
			details: err.message || 'Unknown error occurred',
			stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
		}, { status: 500 });
	}
}
