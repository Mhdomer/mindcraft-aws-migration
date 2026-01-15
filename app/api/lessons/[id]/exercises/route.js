import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { adminDb } from '@/lib/admin';
import { cookies } from 'next/headers';

// GET /api/lessons/[id]/exercises - Get all exercises for a lesson
export async function GET(request, { params }) {
	try {
		const { id: lessonId } = await params;

		if (!lessonId) {
			return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
		}

		let exercises = [];

		if (adminDb) {
			// Use Admin SDK
			try {
				const snapshot = await adminDb.collection('lesson_exercise')
					.where('lessonId', '==', lessonId)
					.orderBy('order', 'asc')
					.get();
				
				exercises = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
				}));
			} catch (err) {
				// If orderBy fails, try without it
				if (err.code === 3 || err.message?.includes('index')) {
					const snapshot = await adminDb.collection('lesson_exercise')
						.where('lessonId', '==', lessonId)
						.get();
					
					exercises = snapshot.docs.map(doc => ({
						id: doc.id,
						...doc.data(),
					}));
					
					exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
				} else {
					throw err;
				}
			}
		} else {
			// Fallback to client SDK
			let snapshot;
			try {
				const exercisesQuery = query(
					collection(db, 'lesson_exercise'),
					where('lessonId', '==', lessonId),
					orderBy('order', 'asc')
				);
				snapshot = await getDocs(exercisesQuery);
			} catch (err) {
				if (err.code === 'failed-precondition' || err.message?.includes('index')) {
					const fallbackQuery = query(
						collection(db, 'lesson_exercise'),
						where('lessonId', '==', lessonId)
					);
					snapshot = await getDocs(fallbackQuery);
				} else {
					throw err;
				}
			}

			exercises = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
		}

		return NextResponse.json({ exercises });
	} catch (err) {
		console.error('Error fetching exercises:', err);
		return NextResponse.json({ error: 'Failed to fetch exercises', details: String(err) }, { status: 500 });
	}
}

// POST /api/lessons/[id]/exercises - Create a new exercise
export async function POST(request, { params }) {
	try {
		const { id: lessonId } = await params;
		const cookieStore = await cookies();
		const currentUserId = cookieStore.get('user_id')?.value;
		const currentUserRole = cookieStore.get('user_role')?.value;

		// Only teachers and admins can create exercises
		if (currentUserRole !== 'teacher' && currentUserRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized: Only teachers and admins can create exercises' }, { status: 403 });
		}

		const body = await request.json();
		const { question, type, options, correctAnswer, points, explanation, order } = body;

		if (!question || !type || correctAnswer === undefined || correctAnswer === null) {
			return NextResponse.json({ error: 'Question, type, and correctAnswer are required' }, { status: 400 });
		}

		// Validate based on question type
		if (type === 'mcq' && (!options || !Array.isArray(options) || options.length < 2)) {
			return NextResponse.json({ error: 'MCQ questions must have at least 2 options' }, { status: 400 });
		}

		// Verify lesson exists
		let lessonExists = false;
		if (adminDb) {
			const lessonDoc = await adminDb.collection('lesson').doc(lessonId).get();
			lessonExists = lessonDoc.exists;
		} else {
			const lessonDoc = await getDoc(doc(db, 'lesson', lessonId));
			lessonExists = lessonDoc.exists();
		}

		if (!lessonExists) {
			return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
		}

		// Create exercise
		const exerciseData = {
			lessonId,
			question: question.trim(),
			type,
			options: type === 'mcq' ? options.map(opt => opt.trim()) : undefined,
			correctAnswer,
			points: points || 1,
			explanation: explanation ? explanation.trim() : '',
			order: order !== undefined ? order : 0,
			createdBy: currentUserId,
			createdAt: adminDb ? (await import('firebase-admin/firestore')).FieldValue.serverTimestamp() : serverTimestamp(),
			updatedAt: adminDb ? (await import('firebase-admin/firestore')).FieldValue.serverTimestamp() : serverTimestamp(),
		};

		let exerciseRef;
		if (adminDb) {
			const { FieldValue } = await import('firebase-admin/firestore');
			exerciseRef = await adminDb.collection('lesson_exercise').add({
				...exerciseData,
				createdAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp(),
			});
		} else {
			exerciseRef = await addDoc(collection(db, 'lesson_exercise'), exerciseData);
		}

		return NextResponse.json({ success: true, exerciseId: exerciseRef.id });
	} catch (err) {
		console.error('Error creating exercise:', err);
		return NextResponse.json({ error: 'Failed to create exercise', details: String(err) }, { status: 500 });
	}
}
