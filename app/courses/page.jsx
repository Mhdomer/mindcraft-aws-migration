'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Search, PlayCircle } from 'lucide-react';
import { ProgressBar } from '@tremor/react';

export default function MyCoursesPage() {
	const { userData, loading: authLoading } = useAuth();
	const [courses, setCourses] = useState([]);
	const [enrollmentMap, setEnrollmentMap] = useState({});
	const [loading, setLoading] = useState(true);

	const role = userData?.role;

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { setLoading(false); return; }
		loadCourses();
	}, [userData, authLoading]);

	async function loadCourses() {
		setLoading(true);
		try {
			if (role === 'student') {
				const { enrollments } = await api.get('/api/enrollments/student');
				const map = {};
				const courseList = enrollments
					.map(e => {
						const c = e.courseId;
						if (!c) return null;
						map[c._id] = e.progress;
						return { ...c, id: c._id };
					})
					.filter(Boolean);
				setEnrollmentMap(map);
				setCourses(courseList);
			} else {
				const { courses: courseList } = await api.get('/api/courses');
				setCourses(courseList.map(c => ({ ...c, id: c._id })));
			}
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoading(false);
		}
	}

	const canCreate = role === 'admin' || role === 'teacher';
	const isStudent = role === 'student';

	function getProgress(courseId) {
		const progress = enrollmentMap[courseId];
		return progress?.overallProgress || 0;
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading courses...</p>
			</div>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="space-y-8 relative z-10 animate-fadeIn">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-h1 text-neutralDark mb-2">My Courses</h1>
						<p className="text-body text-muted-foreground">
							{isStudent
								? 'Continue learning from your enrolled courses'
								: role === 'teacher'
									? 'Manage your courses'
									: 'Manage all courses'}
						</p>
					</div>
					<div className="flex items-center gap-3">
						{isStudent && (
							<Link href="/courses/explore">
								<Button size="lg" variant="outline">
									<Search className="h-5 w-5 mr-2" />
									Explore Courses
								</Button>
							</Link>
						)}
						{canCreate && (
							<Link href="/dashboard/courses/new">
								<Button size="lg">Create Course</Button>
							</Link>
						)}
					</div>
				</div>

				{courses.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center py-12">
								<BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
								<h3 className="text-h3 text-neutralDark mb-2">
									{isStudent ? 'No enrolled courses yet' : 'No courses available'}
								</h3>
								{isStudent && (
									<>
										<p className="text-body text-muted-foreground mb-6">
											Start your learning journey by exploring and enrolling in courses
										</p>
										<Link href="/courses/explore">
											<Button size="lg">
												<Search className="h-5 w-5 mr-2" />
												Explore Courses
											</Button>
										</Link>
									</>
								)}
							</div>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{courses.map((course) => {
							const progress = getProgress(course.id || course._id);
							const courseId = course.id || course._id;

							return (
								<Card key={courseId} className="card-hover">
									<CardHeader>
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 min-w-0">
												<CardTitle className="text-h3 mb-2 line-clamp-2">{course.title}</CardTitle>
												<CardDescription className="line-clamp-2">
													{course.description || 'No description provided'}
												</CardDescription>
											</div>
											<span className={`px-3 py-1 rounded-full text-caption font-medium whitespace-nowrap ${
												course.status === 'published'
													? 'bg-success/10 text-success'
													: 'bg-warning/10 text-warning'
											}`}>
												{course.status === 'published' ? 'Published' : 'Draft'}
											</span>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex items-center gap-2 text-caption text-muted-foreground">
											<BookOpen className="h-5 w-5" />
											<span>By: {course.authorName || 'Unknown'}</span>
										</div>

										{isStudent && progress > 0 && (
											<div className="space-y-2">
												<div className="flex items-center justify-between text-caption">
													<span className="text-muted-foreground">Progress</span>
													<span className="font-medium text-neutralDark">{progress}%</span>
												</div>
												<ProgressBar value={progress} color="indigo" className="h-2" />
											</div>
										)}

										<div className="flex items-center gap-2 pt-2 border-t border-border">
											<Link href={`/courses/${courseId}`} className="flex-1">
												<Button variant="default" className="w-full">
													{isStudent ? (
														<>
															<PlayCircle className="h-5 w-5 mr-2" />
															Continue Learning
														</>
													) : 'View Course'}
												</Button>
											</Link>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
