import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { adminDb } from '@/lib/admin';
import { cookies } from 'next/headers';

// PUT /api/lessons/[id]/exercises/[exerciseId] - Update an exercise
export async function PUT(request, { params }) {
	try {
		const { id: lessonId, exerciseId } = await params;
		const cookieStore = await cookies();
		const currentUserId = cookieStore.get('user_id')?.value;
		const currentUserRole = cookieStore.get('user_role')?.value;

		// Only teachers and admins can update exercises
		if (currentUserRole !== 'teacher' && currentUserRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized: Only teachers and admins can update exercises' }, { status: 403 });
		}

		const body = await request.json();
		const { question, type, options, correctAnswer, points, explanation, order } = body;

		// Validate based on question type
		if (type === 'mcq' && (!options || !Array.isArray(options) || options.length < 2)) {
			return NextResponse.json({ error: 'MCQ questions must have at least 2 options' }, { status: 400 });
		}

		// Verify exercise exists and belongs to lesson
		let exerciseDoc, exerciseData;
		if (adminDb) {
			exerciseDoc = await adminDb.collection('lesson_exercise').doc(exerciseId).get();
			if (!exerciseDoc.exists) {
				return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
			}
			exerciseData = exerciseDoc.data();
		} else {
			exerciseDoc = await getDoc(doc(db, 'lesson_exercise', exerciseId));
			if (!exerciseDoc.exists()) {
				return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
			}
			exerciseData = exerciseDoc.data();
		}

		if (exerciseData.lessonId !== lessonId) {
			return NextResponse.json({ error: 'Exercise does not belong to this lesson' }, { status: 400 });
		}

		// Check ownership (teacher can only edit their own, admin can edit any)
		if (currentUserRole !== 'admin' && exerciseData.createdBy !== currentUserId) {
			return NextResponse.json({ error: 'Unauthorized: You can only edit your own exercises' }, { status: 403 });
		}

		// Update exercise
		const updateData = {
			updatedAt: adminDb ? (await import('firebase-admin/firestore')).FieldValue.serverTimestamp() : serverTimestamp(),
		};

		if (question !== undefined) updateData.question = question.trim();
		if (type !== undefined) updateData.type = type;
		if (options !== undefined) updateData.options = type === 'mcq' ? options.map(opt => opt.trim()) : undefined;
		if (correctAnswer !== undefined && correctAnswer !== null) updateData.correctAnswer = correctAnswer;
		if (points !== undefined) updateData.points = points;
		if (explanation !== undefined) updateData.explanation = explanation.trim();
		if (order !== undefined) updateData.order = order;

		if (adminDb) {
			const { FieldValue } = await import('firebase-admin/firestore');
			await adminDb.collection('lesson_exercise').doc(exerciseId).update({
				...updateData,
				updatedAt: FieldValue.serverTimestamp(),
			});
		} else {
			await updateDoc(doc(db, 'lesson_exercise', exerciseId), updateData);
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Error updating exercise:', err);
		return NextResponse.json({ error: 'Failed to update exercise', details: String(err) }, { status: 500 });
	}
}

// DELETE /api/lessons/[id]/exercises/[exerciseId] - Delete an exercise
export async function DELETE(request, { params }) {
	try {
		const { id: lessonId, exerciseId } = await params;
		const cookieStore = await cookies();
		const currentUserId = cookieStore.get('user_id')?.value;
		const currentUserRole = cookieStore.get('user_role')?.value;

		// Only teachers and admins can delete exercises
		if (currentUserRole !== 'teacher' && currentUserRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized: Only teachers and admins can delete exercises' }, { status: 403 });
		}

		// Verify exercise exists and belongs to lesson
		let exerciseDoc, exerciseData;
		if (adminDb) {
			exerciseDoc = await adminDb.collection('lesson_exercise').doc(exerciseId).get();
			if (!exerciseDoc.exists) {
				return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
			}
			exerciseData = exerciseDoc.data();
		} else {
			exerciseDoc = await getDoc(doc(db, 'lesson_exercise', exerciseId));
			if (!exerciseDoc.exists()) {
				return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
			}
			exerciseData = exerciseDoc.data();
		}

		if (exerciseData.lessonId !== lessonId) {
			return NextResponse.json({ error: 'Exercise does not belong to this lesson' }, { status: 400 });
		}

		// Check ownership (teacher can only delete their own, admin can delete any)
		if (currentUserRole !== 'admin' && exerciseData.createdBy !== currentUserId) {
			return NextResponse.json({ error: 'Unauthorized: You can only delete your own exercises' }, { status: 403 });
		}

		// Delete exercise
		if (adminDb) {
			await adminDb.collection('lesson_exercise').doc(exerciseId).delete();
		} else {
			await deleteDoc(doc(db, 'lesson_exercise', exerciseId));
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Error deleting exercise:', err);
		return NextResponse.json({ error: 'Failed to delete exercise', details: String(err) }, { status: 500 });
	}
}
