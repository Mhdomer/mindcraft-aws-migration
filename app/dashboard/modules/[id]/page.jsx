'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/app/components/RichTextEditor';
import AILearningHelper from '@/app/components/AILearningHelper';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ModuleDetailPage() {
	const params = useParams();
	const router = useRouter();
	const moduleId = params.id;
	const { userData, loading: authLoading } = useAuth();

	const [module, setModule] = useState(null);
	const [course, setCourse] = useState(null);
	const [lessons, setLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editingTitle, setEditingTitle] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newLessonTitle, setNewLessonTitle] = useState('');
	const [newLessonContent, setNewLessonContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [editingLessonId, setEditingLessonId] = useState(null);
	const [editLessonTitle, setEditLessonTitle] = useState('');
	const [editLessonContent, setEditLessonContent] = useState('');

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		loadModule();
	}, [authLoading, userData, moduleId]);

	async function loadModule() {
		setLoading(true);
		try {
			const data = await api.get(`/api/modules/${moduleId}`);
			const mod = data.module;
			setModule({ ...mod, id: mod._id?.toString() || mod.id });
			setNewTitle(mod.title);

			// Load course if linked
			if (mod.courseId) {
				try {
					const courseData = await api.get(`/api/courses/${mod.courseId}`);
					const c = courseData.course;
					setCourse({ ...c, id: c._id?.toString() || c.id });
				} catch (_) { /* standalone module */ }
			}

			await loadLessons();
		} catch (err) {
			setError(err.message || 'Failed to load module');
		} finally {
			setLoading(false);
		}
	}

	async function loadLessons() {
		try {
			const data = await api.get(`/api/lessons?moduleId=${moduleId}`);
			setLessons((data.lessons || []).map(l => ({ ...l, id: l._id?.toString() || l.id })));
		} catch (err) {
			setLessons([]);
		}
	}

	async function updateModuleTitle() {
		if (!newTitle.trim()) { setEditingTitle(false); return; }
		setSubmitting(true);
		try {
			await api.put(`/api/modules/${moduleId}`, { title: newTitle.trim() });
			setModule(prev => ({ ...prev, title: newTitle.trim() }));
			setEditingTitle(false);
		} catch (err) {
			alert(err.message || 'Failed to update module title');
		} finally {
			setSubmitting(false);
		}
	}

	async function addLesson() {
		if (!newLessonTitle.trim()) return;
		setSubmitting(true);
		try {
			await api.post('/api/lessons', {
				moduleId,
				title: newLessonTitle.trim(),
				contentHtml: newLessonContent || '',
				order: lessons.length,
			});
			setNewLessonTitle('');
			setNewLessonContent('');
			setSuccessMessage('Lesson added successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
			await loadLessons();
		} catch (err) {
			alert(err.message || 'Failed to add lesson');
		} finally {
			setSubmitting(false);
		}
	}

	function startEditLesson(lesson) {
		setEditingLessonId(lesson.id);
		setEditLessonTitle(lesson.title);
		setEditLessonContent(lesson.contentHtml || '');
	}

	function cancelEditLesson() {
		setEditingLessonId(null);
		setEditLessonTitle('');
		setEditLessonContent('');
	}

	async function saveLessonEdit(lessonId) {
		if (!editLessonTitle.trim()) { alert('Lesson title is required'); return; }
		setSubmitting(true);
		try {
			await api.put(`/api/lessons/${lessonId}`, {
				title: editLessonTitle.trim(),
				contentHtml: editLessonContent || '',
			});
			cancelEditLesson();
			setSuccessMessage('Lesson updated successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
			await loadLessons();
		} catch (err) {
			alert(err.message || 'Failed to update lesson');
		} finally {
			setSubmitting(false);
		}
	}

	async function deleteLesson(lessonId) {
		if (!confirm('Delete this lesson?')) return;
		setSubmitting(true);
		try {
			await api.delete(`/api/lessons/${lessonId}`);
			await loadLessons();
		} catch (err) {
			alert(err.message || 'Failed to delete lesson');
		} finally {
			setSubmitting(false);
		}
	}

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading module...</p>
			</div>
		);
	}

	if (error || !module) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Module not found'}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Link href={course ? `/dashboard/courses/${course.id}/edit` : '/dashboard/modules'}>
					<Button variant="ghost" size="sm" className="hover:bg-neutralLight transition-colors">
						<ArrowLeft className="h-5 w-5 mr-2" />
						{course ? 'Back to Course' : 'Back to Modules'}
					</Button>
				</Link>
				{course && (
					<div className="text-caption text-muted-foreground">
						Course: <span className="font-medium text-neutralDark">{course.title}</span>
					</div>
				)}
			</div>

			{/* Module Title */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						{editingTitle ? (
							<div className="flex items-center gap-2 flex-1">
								<Input
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									className="flex-1"
									onKeyDown={(e) => {
										if (e.key === 'Enter') { e.preventDefault(); updateModuleTitle(); }
										if (e.key === 'Escape') { setEditingTitle(false); setNewTitle(module.title); }
									}}
								/>
								<Button size="sm" onClick={updateModuleTitle} disabled={submitting}>
									<Save className="h-5 w-5" />
								</Button>
								<Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setNewTitle(module.title); }}>
									<X className="h-5 w-5" />
								</Button>
							</div>
						) : (
							<>
								<CardTitle className="text-h2">{module.title}</CardTitle>
								<Button variant="ghost" size="sm" onClick={() => setEditingTitle(true)}>
									<Edit2 className="h-5 w-5 mr-2" />Edit Title
								</Button>
							</>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-caption text-muted-foreground">
						{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
					</p>
				</CardContent>
			</Card>

			{/* Lessons */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h3">Lessons</CardTitle>
					<CardDescription>Manage lessons within this module</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{lessons.length > 0 ? (
						<div className="space-y-2">
							{lessons.map((lesson, index) => (
								<div key={lesson.id}>
									{editingLessonId === lesson.id ? (
										<div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
											<Input
												value={editLessonTitle}
												onChange={(e) => setEditLessonTitle(e.target.value)}
												placeholder="Lesson title"
											/>
											<RichTextEditor
												value={editLessonContent}
												onChange={setEditLessonContent}
												placeholder="Start typing your lesson content..."
											/>
											<AILearningHelper
												currentContent={editLessonContent}
												lessonTitle={editLessonTitle}
												onFormatContent={(formatted) => setEditLessonContent(formatted)}
												onGenerateContent={(generated) => setEditLessonContent(generated)}
											/>
											<div className="flex items-center gap-2">
												<Button size="sm" onClick={() => saveLessonEdit(lesson.id)} disabled={submitting || !editLessonTitle.trim()}>
													<Save className="h-5 w-5 mr-2" />Save
												</Button>
												<Link href={`/dashboard/modules/${moduleId}/lessons/${lesson.id}/preview`}>
													<Button size="sm" variant="outline" disabled={submitting}>
														<Eye className="h-5 w-5 mr-2" />Preview
													</Button>
												</Link>
												<Button size="sm" variant="ghost" onClick={cancelEditLesson} disabled={submitting}>
													<X className="h-5 w-5 mr-2" />Cancel
												</Button>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-neutralLight hover:border-primary/30 transition-colors">
											<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-caption font-medium flex-shrink-0">
												{index + 1}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-body font-medium text-neutralDark">{lesson.title}</p>
												{lesson.contentHtml && (
													<p className="text-caption text-muted-foreground line-clamp-1">
														{lesson.contentHtml.replace(/<[^>]*>/g, '').substring(0, 60)}...
													</p>
												)}
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												<Link href={`/dashboard/modules/${moduleId}/lessons/${lesson.id}/preview`}>
													<Button variant="ghost" size="sm" disabled={submitting} className="hover:bg-primary/10">
														<Eye className="h-5 w-5" />
													</Button>
												</Link>
												<Button variant="ghost" size="sm" onClick={() => startEditLesson(lesson)} disabled={submitting} className="hover:bg-primary/10">
													<Edit2 className="h-5 w-5" />
												</Button>
												<Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)} disabled={submitting} className="text-error hover:text-error hover:bg-error/10">
													<Trash2 className="h-5 w-5" />
												</Button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-body text-muted-foreground py-4 text-center">No lessons in this module yet</p>
					)}

					{successMessage && (
						<div className="p-3 rounded-lg bg-success/10 border border-success/20">
							<p className="text-caption text-success">{successMessage}</p>
						</div>
					)}

					{/* Add Lesson */}
					<div className="space-y-4 pt-4 border-t border-border">
						<Input
							value={newLessonTitle}
							onChange={(e) => setNewLessonTitle(e.target.value)}
							placeholder="Lesson title"
							onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addLesson(); } }}
						/>
						<RichTextEditor
							value={newLessonContent}
							onChange={setNewLessonContent}
							placeholder="Start typing your lesson content..."
						/>
						<AILearningHelper
							currentContent={newLessonContent}
							lessonTitle={newLessonTitle}
							onFormatContent={(formatted) => setNewLessonContent(formatted)}
							onGenerateContent={(generated) => setNewLessonContent(generated)}
						/>
						<Button onClick={addLesson} disabled={submitting || !newLessonTitle.trim()} variant="outline">
							<Plus className="h-5 w-5 mr-2" />
							{submitting ? 'Adding...' : 'Add Lesson'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
