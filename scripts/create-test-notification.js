/**
 * Script to create a test notification from a teacher to a student
 * Usage: node scripts/create-test-notification.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
try {
	const dotenv = await import('dotenv');
	dotenv.config();
} catch (error) {
	// dotenv not installed, try to load .env manually
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		const envPath = join(__dirname, '..', '.env');
		const envContent = readFileSync(envPath, 'utf-8');
		envContent.split('\n').forEach(line => {
			const [key, ...valueParts] = line.split('=');
			if (key && valueParts.length > 0) {
				const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
				if (!process.env[key.trim()]) {
					process.env[key.trim()] = value;
				}
			}
		});
	} catch (e) {
		console.log('⚠️  Could not load .env file. Using environment variables directly.');
	}
}

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
	console.error('❌ Missing Firebase config. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
	process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function findUserByEmail(email) {
	try {
		const usersQuery = query(
			collection(db, 'user'),
			where('email', '==', email)
		);
		const snapshot = await getDocs(usersQuery);
		if (snapshot.empty) {
			return null;
		}
		const doc = snapshot.docs[0];
		return {
			id: doc.id,
			...doc.data()
		};
	} catch (error) {
		console.error(`Error finding user ${email}:`, error);
		return null;
	}
}

async function findCourseByTitle(title) {
	try {
		const coursesQuery = query(
			collection(db, 'course'),
			where('title', '==', title)
		);
		const snapshot = await getDocs(coursesQuery);
		if (snapshot.empty) {
			return null;
		}
		const doc = snapshot.docs[0];
		return {
			id: doc.id,
			...doc.data()
		};
	} catch (error) {
		console.error(`Error finding course ${title}:`, error);
		return null;
	}
}

async function createNotification() {
	try {
		console.log('🔍 Finding users...');
		
		// Find teacher (teach4)
		const teacherEmail = 'teach4@gmail.com';
		const teacher = await findUserByEmail(teacherEmail);
		if (!teacher) {
			console.error(`❌ Teacher not found: ${teacherEmail}`);
			console.log('💡 Available teachers might have different emails. Searching for any teacher...');
			// Try to find any teacher
			const allUsersQuery = query(collection(db, 'user'));
			const allUsersSnapshot = await getDocs(allUsersQuery);
			const teachers = allUsersSnapshot.docs
				.map(doc => ({ id: doc.id, ...doc.data() }))
				.filter(user => user.role === 'teacher');
			if (teachers.length > 0) {
				console.log('📋 Available teachers:');
				teachers.forEach(t => console.log(`   - ${t.email} (${t.name})`));
			}
			process.exit(1);
		}
		console.log(`✅ Found teacher: ${teacher.name} (${teacher.email}) - ID: ${teacher.id}`);

		// Find student (student4 or any student)
		let studentEmail = 'student4@gmail.com';
		let student = await findUserByEmail(studentEmail);
		if (!student) {
			console.log(`⚠️  Student ${studentEmail} not found. Searching for any student...`);
			const allUsersQuery = query(collection(db, 'user'));
			const allUsersSnapshot = await getDocs(allUsersQuery);
			const students = allUsersSnapshot.docs
				.map(doc => ({ id: doc.id, ...doc.data() }))
				.filter(user => user.role === 'student');
			if (students.length > 0) {
				student = students[0];
				studentEmail = student.email;
				console.log(`✅ Using student: ${student.name} (${student.email}) - ID: ${student.id}`);
			} else {
				console.error('❌ No students found in database');
				process.exit(1);
			}
		} else {
			console.log(`✅ Found student: ${student.name} (${student.email}) - ID: ${student.id}`);
		}

		// Find course (SQL Fundamentals or any course)
		let courseTitle = 'SQL Fundamentals';
		let course = await findCourseByTitle(courseTitle);
		if (!course) {
			console.log(`⚠️  Course "${courseTitle}" not found. Searching for any course...`);
			const allCoursesQuery = query(collection(db, 'course'));
			const allCoursesSnapshot = await getDocs(allCoursesQuery);
			const courses = allCoursesSnapshot.docs
				.map(doc => ({ id: doc.id, ...doc.data() }))
				.filter(c => c.status === 'published');
			if (courses.length > 0) {
				course = courses[0];
				courseTitle = course.title;
				console.log(`✅ Using course: ${course.title} - ID: ${course.id}`);
			} else {
				console.log('⚠️  No published courses found. Creating notification without courseId...');
			}
		} else {
			console.log(`✅ Found course: ${course.title} - ID: ${course.id}`);
		}

		// Create notification
		console.log('\n📨 Creating notification...');
		const notificationData = {
			userId: student.id,
			type: 'risk_alert',
			title: `Risk Notification - ${courseTitle || 'Course'}`,
			message: `Your teacher ${teacher.name} has sent a notification regarding your learning performance in the course "${courseTitle || 'this course'}". Please review your progress and take action to improve.`,
			courseId: course ? course.id : null,
			riskLevel: 'high',
			riskReasons: [
				'Average score below threshold (45%)',
				'Multiple missed deadlines (3 assignments)',
				'Inactive for 10 days'
			],
			guidance: 'I noticed you\'ve been struggling with the recent assignments. Let\'s schedule a meeting to discuss how we can improve your performance. Please review the course materials and complete the pending assignments. Don\'t hesitate to reach out if you need help!',
			read: false,
			createdAt: serverTimestamp(),
		};

		// Sign in as teacher to have write permissions (if needed)
		// Note: This might not work if security rules don't allow it
		// In that case, you'll need to use Admin SDK or update security rules
		try {
			// Try to sign in (optional - only if security rules require it)
			// await signInWithEmailAndPassword(auth, teacherEmail, 'teacher123'); // Adjust password if needed
		} catch (authError) {
			console.log('⚠️  Could not sign in (this is okay if using Admin SDK or permissive rules)');
		}

		const notificationRef = await addDoc(collection(db, 'notification'), notificationData);
		
		console.log('\n✅ Notification created successfully!');
		console.log(`   Notification ID: ${notificationRef.id}`);
		console.log(`   From: ${teacher.name} (${teacher.email})`);
		console.log(`   To: ${student.name} (${student.email})`);
		console.log(`   Course: ${courseTitle || 'N/A'}`);
		console.log(`   Type: ${notificationData.type}`);
		console.log(`   Title: ${notificationData.title}`);
		console.log(`   Message: ${notificationData.message.substring(0, 100)}...`);
		console.log(`   Guidance: ${notificationData.guidance.substring(0, 100)}...`);
		console.log('\n📸 You can now log in as the student to see the notification in the UI!');
		console.log(`   Student email: ${studentEmail}`);
		
		process.exit(0);
	} catch (error) {
		console.error('\n❌ Error creating notification:', error);
		console.error('   Error details:', error.message);
		if (error.code === 'permission-denied') {
			console.error('\n💡 Permission denied error!');
			console.error('   This means Firestore security rules are blocking the write.');
			console.error('   Solutions:');
			console.error('   1. Set up Firebase Admin SDK (see docs/FIREBASE_ADMIN_SETUP.md)');
			console.error('   2. Or temporarily update Firestore security rules to allow writes');
			console.error('   3. Or use the Firebase Console to create the notification manually');
		}
		process.exit(1);
	}
}

// Run the script
createNotification();
