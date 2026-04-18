'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, CheckCircle2, Lock, ChevronRight, User, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CourseDetailPage() {
	const params = useParams();
	const router = useRouter();
	const courseId = params.id;
	const { userData } = useAuth();

	const [course, setCourse] = useState(null);
	const [modules, setModules] = useState([]);
	const [lessons, setLessons] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [enrollmentId, setEnrollmentId] = useState(null);
	const [completedLessons, setCompletedLessons] = useState(new Set());
	const [overallProgress, setOverallProgress] = useState(0);
	const [enrollLoading, setEnrollLoading] = useState(false);

	const role = userData?.role;
	const userId = userData?._id;

	useEffect(() => {
		if (!courseId) return;
		loadCourse();
	}, [courseId, userData]);

	async function loadCourse() {
		setLoading(true);
		setError('');
		try {
			const [{ course: courseData }, { modules: moduleList }] = await Promise.all([
				api.get(`/api/courses/${courseId}`),
				api.get(`/api/modules?courseId=${courseId}`),
			]);
			setCourse(courseData);

			// Load lessons for each module in parallel
			const lessonFetches = moduleList.map(m =>
				api.get(`/api/lessons?moduleId=${m._id}`)
					.then(({ lessons: ls }) => ({ moduleId: m._id, lessons: ls }))
					.catch(() => ({ moduleId: m._id, lessons: [] }))
			);
			const lessonResults = await Promise.all(lessonFetches);
			const lessonMap = {};
			lessonResults.forEach(({ moduleId, lessons: ls }) => { lessonMap[moduleId] = ls; });

			setModules(moduleList);
			setLessons(lessonMap);

			// Check enrollment for students
			if (role === 'student') {
				try {
					const { enrolled, enrollment } = await api.get(`/api/enrollments?courseId=${courseId}`);
					setIsEnrolled(enrolled);
					if (enrolled && enrollment) {
						setEnrollmentId(enrollment._id);
						setCompletedLessons(new Set(enrollment.progress?.completedLessons?.map(String) || []));
						setOverallProgress(enrollment.progress?.overallProgress || 0);
					}
				} catch {
					setIsEnrolled(false);
				}
			} else if (role === 'teacher' || role === 'admin') {
				setIsEnrolled(true);
			}
		} catch (err) {
			setError(err.message || 'Failed to load course');
		} finally {
			setLoading(false);
		}
	}

	async function handleEnroll() {
		if (!userId) { router.push('/login'); return; }
		setEnrollLoading(true);
		setError('');
		try {
			await api.post('/api/enrollments', { courseId });
			setIsEnrolled(true);
		} catch (err) {
			setError(err.message || 'Failed to enroll. Please try again.');
		} finally {
			setEnrollLoading(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading course...</p>
			</div>
		);
	}

	if (error && !course) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error}</p>
				</CardContent>
			</Card>
		);
	}

	if (!course) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">Course not found</p>
				</CardContent>
			</Card>
		);
	}

	const isStudent = role === 'student';
	const canEnroll = isStudent && !isEnrolled && course.status === 'published';

	return (
		<div className="space-y-8">
			{/* Course Header */}
			<div>
				<div className="flex items-center gap-3 mb-4">
					<Link href="/courses">
						<Button variant="ghost" size="sm">← Back to Courses</Button>
					</Link>
				</div>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<h1 className="text-h1 text-neutralDark mb-2">{course.title}</h1>
						<p className="text-body text-muted-foreground mb-4">{course.description || 'No description'}</p>
						<div className="flex items-center gap-4 text-caption text-muted-foreground">
							<div className="flex items-center gap-2">
								<User className="h-4 w-4" />
								<span>By: {course.authorName || 'Unknown'}</span>
							</div>
							{modules.length > 0 && (
								<div className="flex items-center gap-2">
									<BookOpen className="h-4 w-4" />
									<span>{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
								</div>
							)}
						</div>
					</div>
					{canEnroll && (
						<Button onClick={handleEnroll} size="lg" disabled={enrollLoading}>
							{enrollLoading ? 'Enrolling...' : 'Enroll in Course'}
						</Button>
					)}
					{isEnrolled && isStudent && (
						<div className="flex flex-col items-end gap-2">
							<span className="px-4 py-2 rounded-lg bg-success/10 text-success text-caption font-medium flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4" />
								Enrolled
							</span>
							<div className="w-48 text-right">
								<div className="text-xs text-muted-foreground mb-1">Course Progress: {overallProgress}%</div>
								<div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
									<div className="h-full bg-success transition-all duration-500" style={{ width: `${overallProgress}%` }} />
								</div>
							</div>
						</div>
					)}
				</div>
				{error && (
					<div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
			</div>

			{/* Modules & Lessons */}
			{modules.length > 0 ? (
				<div className="space-y-6">
					<h2 className="text-h2 text-neutralDark">Course Content</h2>
					{modules.map((module, moduleIndex) => {
						const moduleLessons = lessons[module._id] || [];
						const isModuleLocked = isStudent && !isEnrolled && moduleIndex > 0;

						return (
							<Card key={module._id} className={isModuleLocked ? 'opacity-60' : ''}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											{isModuleLocked ? (
												<Lock className="h-5 w-5 text-muted-foreground" />
											) : (
												<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-body font-semibold">
													{moduleIndex + 1}
												</div>
											)}
											<div>
												<div className="flex items-center gap-3">
													<CardTitle className="text-h3">{module.title}</CardTitle>
													{moduleLessons.length > 0 && (
														moduleLessons.every(l => completedLessons.has(String(l._id))) ? (
															<span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1">
																<CheckCircle2 className="h-3 w-3" /> Completed
															</span>
														) : isEnrolled ? (
															<span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium flex items-center gap-1">
																<Clock className="h-3 w-3" /> Incomplete
															</span>
														) : null
													)}
												</div>
												{moduleLessons.length > 0 && (
													<CardDescription className="mt-1">
														{moduleLessons.length} {moduleLessons.length === 1 ? 'lesson' : 'lessons'}
													</CardDescription>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{moduleLessons.length > 0 ? (
										<div className="space-y-2">
											{moduleLessons.map((lesson, lessonIndex) => {
												const isLessonLocked = isModuleLocked || (isStudent && !isEnrolled);
												const lessonId = lesson._id;

												return (
													<Link
														key={lessonId}
														href={isLessonLocked ? '#' : `/courses/${courseId}/modules/${module._id}/lessons/${lessonId}`}
														className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
															isLessonLocked
																? 'border-border bg-neutralLight cursor-not-allowed opacity-60'
																: 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
														}`}
													>
														{isLessonLocked ? (
															<Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
														) : isEnrolled && completedLessons.has(String(lessonId)) ? (
															<div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success flex-shrink-0">
																<CheckCircle2 className="h-4 w-4" />
															</div>
														) : (
															<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-caption font-medium flex-shrink-0">
																{lessonIndex + 1}
															</div>
														)}
														<div className="flex-1 min-w-0">
															<h4 className="text-body font-medium text-neutralDark">{lesson.title}</h4>
															{lesson.contentHtml && (
																<p className="text-caption text-muted-foreground mt-1 line-clamp-1">
																	{lesson.contentHtml.replace(/<[^>]*>/g, '').substring(0, 60)}...
																</p>
															)}
														</div>
														{!isLessonLocked && <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
													</Link>
												);
											})}
										</div>
									) : (
										<p className="text-body text-muted-foreground py-4 text-center">
											No lessons in this module yet
										</p>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-8">
							<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-body text-muted-foreground mb-4">
								This course doesn't have any modules or lessons yet.
							</p>
							{(role === 'teacher' || role === 'admin') && (
								<Link href={`/dashboard/courses/${courseId}/edit`}>
									<Button>Add Modules & Lessons</Button>
								</Link>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
