// Automatically notify at-risk students
// POST /api/notifications/at-risk - Send notifications to students with medium/high risk

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { adminDb } from '@/lib/admin';

export async function POST(request) {
	try {
		// Note: In production, verify the user is authenticated and is a teacher
		// For now, we'll trust that only authenticated users can access this endpoint
		
		const body = await request.json();
		const { courseId, studentId, riskLevel, riskReasons, guidance } = body;

		if (!courseId || !studentId || !riskLevel) {
			return NextResponse.json({ 
				error: 'Missing required fields: courseId, studentId, riskLevel' 
			}, { status: 400 });
		}

		// Only send notifications for medium or high risk
		if (riskLevel === 'low') {
			return NextResponse.json({ 
				success: true, 
				message: 'No notification needed for low risk level' 
			});
		}

		// Get course details - use Admin SDK if available, otherwise Web SDK
		let courseDoc, courseTitle;
		if (adminDb) {
			const courseSnapshot = await adminDb.collection('course').doc(courseId).get();
			if (!courseSnapshot.exists) {
				return NextResponse.json({ error: 'Course not found' }, { status: 404 });
			}
			courseTitle = courseSnapshot.data().title;
		} else {
			courseDoc = await getDoc(doc(db, 'course', courseId));
			if (!courseDoc.exists()) {
				return NextResponse.json({ error: 'Course not found' }, { status: 404 });
			}
			courseTitle = courseDoc.data().title;
		}

		// Check if notification already sent recently (within last 7 days)
		let recentNotifications;
		if (adminDb) {
			const snapshot = await adminDb.collection('notification')
				.where('userId', '==', studentId)
				.where('type', '==', 'risk_alert')
				.where('courseId', '==', courseId)
				.get();
			recentNotifications = { docs: snapshot.docs };
		} else {
			const recentNotificationsQuery = query(
				collection(db, 'notification'),
				where('userId', '==', studentId),
				where('type', '==', 'risk_alert'),
				where('courseId', '==', courseId)
			);
			recentNotifications = await getDocs(recentNotificationsQuery);
		}
		
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		
		const hasRecentNotification = recentNotifications.docs.some(notifDoc => {
			const notifData = notifDoc.data();
			const createdAt = notifData.createdAt?.toDate ? notifData.createdAt.toDate() : new Date(0);
			return createdAt > sevenDaysAgo && !notifData.read;
		});

		if (hasRecentNotification) {
			return NextResponse.json({ 
				success: true, 
				message: 'Recent notification already exists, skipping duplicate' 
			});
		}

		// Create risk alert notification
		const riskTitle = riskLevel === 'high' 
			? `High Learning Risk Alert - ${courseTitle}`
			: `Learning Risk Alert - ${courseTitle}`;

		const riskMessage = `Your learning performance in "${courseTitle}" has been flagged as ${riskLevel} risk. ` +
			`Please review your progress and take action to improve.`;

		let notificationRef;
		if (adminDb) {
			const { FieldValue } = await import('firebase-admin/firestore');
			notificationRef = await adminDb.collection('notification').add({
				userId: studentId,
				type: 'risk_alert',
				title: riskTitle,
				message: riskMessage,
				courseId,
				riskLevel,
				riskReasons: riskReasons || [],
				guidance: guidance || null,
				read: false,
				createdAt: FieldValue.serverTimestamp(),
			});
		} else {
			const { addDoc, serverTimestamp } = await import('firebase/firestore');
			notificationRef = await addDoc(collection(db, 'notification'), {
				userId: studentId,
				type: 'risk_alert',
				title: riskTitle,
				message: riskMessage,
				courseId,
				riskLevel,
				riskReasons: riskReasons || [],
				guidance: guidance || null,
				read: false,
				createdAt: serverTimestamp(),
			});
		}

		return NextResponse.json({ 
			success: true, 
			notificationId: notificationRef.id,
			message: 'Risk notification sent successfully'
		});
	} catch (err) {
		console.error('Error sending risk notification:', err);
		return NextResponse.json({ 
			error: 'Failed to send risk notification', 
			details: err.message 
		}, { status: 500 });
	}
}
