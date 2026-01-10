'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CourseManagement({ course, currentUserId, currentRole, onDeleted }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	const canEdit = currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);
	// Teachers can delete their own courses (drafts or published), admins can delete any course
	const canDelete =
		currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);

	// Ensure a course cannot be published without at least one module and one lesson
	async function validatePublishableCourse() {
		const moduleIds = Array.isArray(course.modules) ? course.modules.filter(Boolean) : [];
		if (moduleIds.length === 0) {
			return {
				ok: false,
				message: 'To publish a course, add at least 1 module and 1 lesson first.',
			};
		}

		const hasAnyLesson = (
			await Promise.all(
				moduleIds.map(async (moduleId) => {
					const snap = await getDocs(
						query(collection(db, 'lesson'), where('moduleId', '==', moduleId))
					);
					return snap.size > 0;
				})
			)
		).some(Boolean);

		if (!hasAnyLesson) {
			return {
				ok: false,
				message: 'To publish a course, add at least 1 module and 1 lesson first.',
			};
		}

		return { ok: true };
	}

	async function handleDelete() {
		if (!confirm(`Are you sure you want to delete "${course.title}"?\n\nThis will also delete its modules, lessons, and enrollments. This action cannot be undone.`)) {
			return;
		}
		setLoading(true);
		setError('');
		try {
			// Extra client-side guard (Firestore rules should still enforce this)
			if (!canDelete) {
				throw new Error('Unauthorized: You cannot delete this course');
			}

			const courseRef = doc(db, 'course', course.id);
			const moduleIds = Array.isArray(course.modules) ? course.modules : [];

			// Collect related docs
			const lessonRefs = [];
			const moduleRefs = [];
			for (const moduleId of moduleIds) {
				if (!moduleId) continue;
				moduleRefs.push(doc(db, 'module', moduleId));

				const lessonsSnap = await getDocs(
					query(collection(db, 'lesson'), where('moduleId', '==', moduleId))
				);
				for (const d of lessonsSnap.docs) {
					lessonRefs.push(d.ref);
				}
			}

			const enrollmentRefs = [];
			const enrollmentsSnap = await getDocs(
				query(collection(db, 'enrollment'), where('courseId', '==', course.id))
			);
			for (const d of enrollmentsSnap.docs) {
				enrollmentRefs.push(d.ref);
			}

			// Firestore batch limit is 500 operations; chunk deletes safely
			const refsToDelete = [...lessonRefs, ...moduleRefs, ...enrollmentRefs];
			const chunkSize = 450;
			for (let i = 0; i < refsToDelete.length; i += chunkSize) {
				const batch = writeBatch(db);
				const chunk = refsToDelete.slice(i, i + chunkSize);
				for (const ref of chunk) batch.delete(ref);
				await batch.commit();
			}

			// Delete the course last
			{
				const batch = writeBatch(db);
				batch.delete(courseRef);
				await batch.commit();
			}

			onDeleted?.(course.id);
		} catch (err) {
			console.error('Delete error:', err);
			setError(err.message || 'Failed to delete');
			setLoading(false);
		}
	}

	async function handlePublish() {
		setLoading(true);
		setError('');
		try {
			const validation = await validatePublishableCourse();
			if (!validation.ok) {
				setError(validation.message);
				setLoading(false);
				return;
			}

			await updateDoc(doc(db, 'course', course.id), {
				status: 'published',
				updatedAt: serverTimestamp(),
			});
			// Force page reload to refresh the courses list
			window.location.reload();
		} catch (err) {
			console.error('Publish error:', err);
			setError(err.message || 'Failed to publish');
			setLoading(false);
		}
	}

	async function handleUnpublish() {
		if (!confirm(`Unpublish "${course.title}"? It will be moved back to draft and taken off the live server.`)) {
			return;
		}
		setLoading(true);
		setError('');
		try {
			await updateDoc(doc(db, 'course', course.id), {
				status: 'draft',
				updatedAt: serverTimestamp(),
			});
			// Force page reload to refresh the courses list
			window.location.reload();
		} catch (err) {
			console.error('Unpublish error:', err);
			setError(err.message || 'Failed to unpublish');
			setLoading(false);
		}
	}

	return (
		<Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-md overflow-hidden group">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-xl font-bold bg-gradient-to-br from-neutral-800 to-neutral-600 bg-clip-text text-transparent mb-2 line-clamp-2 group-hover:from-emerald-700 group-hover:to-teal-600 transition-all duration-300">
							{course.title}
						</CardTitle>
						<CardDescription className="line-clamp-2 mb-2 text-neutral-500">
							{course.description || 'No description provided'}
						</CardDescription>
					</div>
					<span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border shadow-sm ${course.status === 'published'
						? 'bg-emerald-50 text-emerald-700 border-emerald-200'
						: 'bg-yellow-50 text-yellow-700 border-yellow-200'
						}`}>
						{course.status === 'published' ? 'Published' : 'Draft'}
					</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-sm text-muted-foreground space-y-2 bg-white/50 p-3 rounded-lg border border-white/60">
					<div className="flex items-center gap-2">
						<span className="font-semibold text-neutral-700 min-w-[70px]">Author:</span>
						<span className="text-neutral-600">{course.authorName || 'Unknown'}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-semibold text-neutral-700 min-w-[70px]">Created:</span>
						<span className="text-neutral-600">{course.createdAt?.toDate ? course.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
					</div>
					{course.status === 'published' && course.updatedAt && (
						<div className="flex items-center gap-2">
							<span className="font-semibold text-neutral-700 min-w-[70px]">Published:</span>
							<span className="text-neutral-600">{course.updatedAt?.toDate ? course.updatedAt.toDate().toLocaleDateString() : 'N/A'}</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 flex-wrap pt-4 border-t border-neutral-100 mt-2">
					{course.status === 'draft' && canEdit && (
						<Button
							onClick={handlePublish}
							disabled={loading}
							size="sm"
							className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
						>
							Publish
						</Button>
					)}
					{course.status === 'published' && canEdit && (
						<Button
							onClick={handleUnpublish}
							disabled={loading}
							variant="outline"
							size="sm"
							className="border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800 flex-1 sm:flex-none bg-yellow-50/50"
						>
							Unpublish
						</Button>
					)}
					{canEdit && (
						<a href={`/dashboard/courses/${course.id}/edit`} className="flex-1 sm:flex-none">
							<Button
								variant="secondary"
								size="sm"
								className="w-full bg-neutral-100 hover:bg-white hover:shadow-md text-neutral-700 border border-transparent hover:border-neutral-200"
							>
								Edit
							</Button>
						</a>
					)}
					{canDelete && (
						<Button
							onClick={handleDelete}
							disabled={loading}
							variant="ghost"
							size="sm"
							className="flex-1 sm:flex-none text-red-500 hover:text-red-700 hover:bg-red-50"
						>
							Delete
						</Button>
					)}
				</div>
				{error && (
					<div className="p-3 rounded-lg bg-red-50 border border-red-100 animate-slideIn">
						<p className="text-xs font-medium text-red-600">{error}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

