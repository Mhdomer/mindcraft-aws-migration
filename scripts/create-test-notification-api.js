/**
 * Script to create a test notification using the API endpoint
 * This works if Firebase Admin SDK is configured
 * Usage: node scripts/create-test-notification-api.js
 */

// Simple script - no dependencies needed
// Just make sure your dev server is running

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function createNotification() {
	try {
		console.log('📨 Creating test notification via API...');
		console.log('   Make sure your dev server is running (npm run dev)');
		console.log('   And Firebase Admin SDK is configured\n');

		// You can customize these values
		const notificationData = {
			userId: 'r7zKa68NNAazIOzYwoqWULkvSa53', // student4's user ID (update if different)
			type: 'risk_alert',
			title: 'Risk Notification - SQL Fundamentals',
			message: 'Your teacher has sent a notification regarding your learning performance in the course "SQL Fundamentals". Please review your progress and take action to improve.',
			courseId: 'upgNzUW8Ky7mp8hao4sG', // SQL Fundamentals course ID (update if different)
			guidance: 'I noticed you\'ve been struggling with the recent assignments. Let\'s schedule a meeting to discuss how we can improve your performance. Please review the course materials and complete the pending assignments. Don\'t hesitate to reach out if you need help!',
		};

		console.log('📤 Sending request to API...');
		const response = await fetch(`${API_URL}/api/notifications`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(notificationData),
		});

		const result = await response.json();

		if (response.ok) {
			console.log('\n✅ Notification created successfully!');
			console.log(`   Notification ID: ${result.notificationId}`);
			console.log(`   Student ID: ${notificationData.userId}`);
			console.log(`   Course ID: ${notificationData.courseId}`);
			console.log('\n📸 You can now log in as the student to see the notification!');
		} else {
			console.error('\n❌ Failed to create notification:');
			console.error(`   Error: ${result.error}`);
			console.error(`   Details: ${result.details || 'No details provided'}`);
			if (result.details?.includes('PERMISSION_DENIED')) {
				console.error('\n💡 Permission denied! Make sure:');
				console.error('   1. Firebase Admin SDK is configured (see docs/FIREBASE_ADMIN_SETUP.md)');
				console.error('   2. Dev server is running');
				console.error('   3. Environment variables are set correctly');
			}
		}
	} catch (error) {
		console.error('\n❌ Error:', error.message);
		if (error.code === 'ECONNREFUSED') {
			console.error('   Could not connect to API. Make sure dev server is running:');
			console.error('   npm run dev');
		}
	}
}

createNotification();
