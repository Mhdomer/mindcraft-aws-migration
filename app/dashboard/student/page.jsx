'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, FileQuestion, TrendingUp, Brain, ArrowRight, FileText, ClipboardCheck, Gamepad2, ChevronDown, ChevronUp, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';
import { Metric, Flex, Text, ProgressBar } from '@tremor/react';

export default function StudentDashboard() {
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [enrolledCourses, setEnrolledCourses] = useState(0);
	const [pendingTasks, setPendingTasks] = useState(0);
	const [overallProgress, setOverallProgress] = useState(0);
	const [recentAssessments, setRecentAssessments] = useState([]);
	const [recentCourses, setRecentCourses] = useState([]);
	const [recommendations, setRecommendations] = useState([]);
	const [expandedRecIndex, setExpandedRecIndex] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				await loadDashboardData(user.uid);
			} else {
				setCurrentUserId(null);
			}
		});

		return () => unsubscribe();
	}, []);

	async function loadDashboardData(userId) {
		setLoading(true);
		try {
			// Load enrollments
			const enrollmentsQuery = query(
				collection(db, 'enrollment'),
				where('studentId', '==', userId)
			);
			const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
			const enrollments = enrollmentsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			const enrolledCourseIds = enrollments.map(e => e.courseId).filter(Boolean);
			setEnrolledCourses(enrolledCourseIds.length);

			// Load courses for preview
			const coursesData = [];
			for (const courseId of enrolledCourseIds.slice(0, 3)) {
				try {
					const courseDoc = await getDoc(doc(db, 'course', courseId));
					if (courseDoc.exists()) {
						coursesData.push({ id: courseDoc.id, ...courseDoc.data() });
					}
				} catch (err) {
					console.error(`Error loading course ${courseId}:`, err);
				}
			}
			setRecentCourses(coursesData);

			// Load assessments for enrolled courses
			let allAssessments = [];
			if (enrolledCourseIds.length > 0) {
				try {
					const assessmentsQuery = query(
						collection(db, 'assessment'),
						where('published', '==', true)
					);
					const assessmentsSnapshot = await getDocs(assessmentsQuery);
					allAssessments = assessmentsSnapshot.docs
						.map(doc => ({ id: doc.id, ...doc.data() }))
						.filter(a => enrolledCourseIds.includes(a.courseId));
				} catch (err) {
					console.error('Error loading assessments:', err);
				}
			}

			// Load assignments for enrolled courses
			let allAssignments = [];
			if (enrolledCourseIds.length > 0) {
				try {
					const assignmentsQuery = query(
						collection(db, 'assignment'),
						where('published', '==', true)
					);
					const assignmentsSnapshot = await getDocs(assignmentsQuery);
					allAssignments = assignmentsSnapshot.docs
						.map(doc => ({ id: doc.id, ...doc.data() }))
						.filter(a => enrolledCourseIds.includes(a.courseId));
				} catch (err) {
					console.error('Error loading assignments:', err);
				}
			}

			// Load submissions to check pending tasks
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', userId)
			);
			const submissionsSnapshot = await getDocs(submissionsQuery);
			const submissions = submissionsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Count pending tasks (assessments/assignments not yet submitted)
			const submittedAssessmentIds = new Set(
				submissions.filter(s => s.assessmentId).map(s => s.assessmentId)
			);
			const submittedAssignmentIds = new Set(
				submissions.filter(s => s.assignmentId).map(s => s.assignmentId)
			);

			const pendingAssessments = allAssessments.filter(a => !submittedAssessmentIds.has(a.id));
			const pendingAssignments = allAssignments.filter(a => !submittedAssignmentIds.has(a.id));
			setPendingTasks(pendingAssessments.length + pendingAssignments.length);

			// Set recent assessments (pending ones, limit to 3)
			setRecentAssessments(pendingAssessments.slice(0, 3));

			// Calculate overall progress
			// Calculate overall progress
			const totalTasks = allAssessments.length + allAssignments.length;

			// Count unique completed tasks that are part of the currently enrolled courses
			const validSubmittedAssessmentIds = new Set(
				submissions
					.filter(s => s.assessmentId && allAssessments.some(a => a.id === s.assessmentId))
					.map(s => s.assessmentId)
			);
			const validSubmittedAssignmentIds = new Set(
				submissions
					.filter(s => s.assignmentId && allAssignments.some(a => a.id === s.assignmentId))
					.map(s => s.assignmentId)
			);

			const completedTasks = validSubmittedAssessmentIds.size + validSubmittedAssignmentIds.size;
			const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
			setOverallProgress(Math.min(progress, 100)); // Ensure it never exceeds 100%

			// Load recommendations preview
			loadRecommendationsPreview();
		} catch (err) {
			console.error('Error loading dashboard data:', err);
		} finally {
			setLoading(false);
		}
	}

	async function loadRecommendationsPreview() {
		if (!currentUserId) return;

		try {
			// Fetch recommendations client-side to avoid server permission issues
			const response = await fetch('/api/ai/recommendations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ language: 'en' }),
				credentials: 'include', // Include cookies for authentication
			});

			if (response.ok) {
				const data = await response.json();
				setRecommendations((data.recommendations || []).slice(0, 3)); // Show only first 3
			} else {
				// If API fails, just show empty state - don't crash
				setRecommendations([]);
			}
		} catch (err) {
			console.error('Error loading recommendations:', err);
			// Silently fail - recommendations are optional
			setRecommendations([]);
		}
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Student Dashboard</h1>
				<p className="text-body text-muted-foreground">Continue your learning journey</p>
			</div>

			{/* Progress Overview */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<BookOpen className="h-5 w-5 text-primary" />
							<CardTitle className="text-h3">Enrolled Courses</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">
							{loading ? '-' : enrolledCourses}
						</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Active courses</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<TrendingUp className="h-5 w-5 text-green-500" />
							<CardTitle className="text-h3">Overall Progress</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">{overallProgress}%</Metric>
						<ProgressBar value={overallProgress} color="indigo" className="mt-2" />
						<Text className="text-caption text-muted-foreground mt-2">Completion rate</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<FileQuestion className="h-5 w-5 text-orange-500" />
							<CardTitle className="text-h3">Pending Tasks</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">
							{loading ? '-' : pendingTasks}
						</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Assessments & assignments</Text>
					</CardContent>
				</Card>
			</div>

			{/* Action Cards */}
			<div>
				<h2 className="text-h2 text-neutralDark mb-6">Continue Learning</h2>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<BookOpen className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle>My Courses</CardTitle>
									<CardDescription>Continue learning</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/courses">
								<Button className="w-full justify-between group bg-primary hover:bg-primary/90 text-white">
									View Courses
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-orange-500/10 rounded-lg">
									<FileQuestion className="h-6 w-6 text-orange-500" />
								</div>
								<div>
									<CardTitle>Assessments</CardTitle>
									<CardDescription>Take quizzes</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/assessments">
								<Button className="w-full justify-between group bg-orange-500 hover:bg-orange-600 text-white">
									View {pendingTasks > 0 && `(${pendingTasks})`}
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<FileText className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle>Assignments</CardTitle>
									<CardDescription>View assignments</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/assignments">
								<Button className="w-full justify-between group bg-primary hover:bg-primary/90 text-white">
									View
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-green-500/10 rounded-lg">
									<TrendingUp className="h-6 w-6 text-green-500" />
								</div>
								<div>
									<CardTitle>Progress</CardTitle>
									<CardDescription>Track learning</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/progress">
								<Button className="w-full justify-between group bg-green-500 hover:bg-green-600 text-white">
									View Progress
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-purple-500/10 rounded-lg">
									<Brain className="h-6 w-6 text-purple-500" />
								</div>
								<div>
									<CardTitle>AI Assistant</CardTitle>
									<CardDescription>Get AI assistance</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/ai" className="block">
								<Button className="w-full justify-between group bg-purple-500 hover:bg-purple-600 text-white">
									Access AI Assistant
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Recent Assessments Preview */}
			{recentAssessments.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-h2 text-neutralDark">Pending Assessments</h2>
						<Link href="/assessments">
							<Button variant="outline" className="flex items-center gap-2">
								View All
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						{recentAssessments.map((assessment) => (
							<Card key={assessment.id} className="border-l-4 border-l-orange-500">
								<CardHeader>
									<CardTitle className="text-h3 flex items-center gap-2">
										<FileQuestion className="h-5 w-5 text-orange-500" />
										{assessment.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription className="mb-3">
										{assessment.type || 'Assessment'}
									</CardDescription>
									<Link href={`/assessments/${assessment.id}/take`}>
										<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
											Take Assessment
										</Button>
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Recent Courses Preview */}
			{recentCourses.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-h2 text-neutralDark">My Courses</h2>
						<Link href="/courses">
							<Button variant="outline" className="flex items-center gap-2">
								View All
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						{recentCourses.map((course) => (
							<Card key={course.id} className="border-l-4 border-l-primary">
								<CardHeader>
									<CardTitle className="text-h3 flex items-center gap-2">
										<BookOpen className="h-5 w-5 text-primary" />
										{course.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription className="mb-3 line-clamp-2">
										{course.description || 'No description available'}
									</CardDescription>
									<Link href={`/courses/${course.id}`}>
										<Button className="w-full bg-primary hover:bg-primary/90 text-white">
											Continue Learning
										</Button>
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Learning Recommendations */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-h2 text-neutralDark">Learning Recommendations</h2>
					<Link href="/ai">
						<Button variant="outline" className="flex items-center gap-2">
							<Brain className="h-4 w-4" />
							View All
						</Button>
					</Link>
				</div>
				{recommendations.length > 0 ? (
					<div className="space-y-2">
						{recommendations.map((rec, index) => {
							const isExpanded = expandedRecIndex === index;
							const getPriorityIcon = (priority) => {
								switch (priority) {
									case 'high':
										return <AlertCircle className="h-6 w-6 text-red-500" />;
									case 'medium':
										return <TrendingUp className="h-6 w-6 text-yellow-500" />;
									case 'low':
										return <CheckCircle className="h-6 w-6 text-green-500" />;
									default:
										return <Lightbulb className="h-6 w-6 text-primary" />;
								}
							};
							const getPriorityColor = (priority) => {
								switch (priority) {
									case 'high':
										return 'border-l-red-500';
									case 'medium':
										return 'border-l-yellow-500';
									case 'low':
										return 'border-l-green-500';
									default:
										return 'border-l-primary';
								}
							};

							return (
								<Card
									key={index}
									className={`border-l-4 ${getPriorityColor(rec.priority)} cursor-pointer hover:shadow-md transition-all`}
									onClick={() => setExpandedRecIndex(isExpanded ? null : index)}
								>
									<CardContent className="p-4">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3 flex-1 min-w-0">
												<div className="flex-shrink-0 mt-0.5">
													{getPriorityIcon(rec.priority)}
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="text-sm font-semibold text-neutralDark truncate">
														{rec.title}
													</h3>
													{isExpanded && (
														<p className="text-xs text-muted-foreground mt-1 line-clamp-1">
															{rec.description}
														</p>
													)}
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="flex-shrink-0"
												onClick={(e) => {
													e.stopPropagation();
													if (rec.action?.path) {
														window.location.href = rec.action.path;
													}
												}}
											>
												{isExpanded ? (
													<>
														{rec.action?.label || 'View'}
														<ArrowRight className="h-6 w-6 ml-1" />
													</>
												) : (
													isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />
												)}
											</Button>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				) : (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center py-6">
								<Brain className="h-10 w-10 text-primary mx-auto mb-3 opacity-50" />
								<p className="text-sm text-muted-foreground">
									No recommendations available. Keep learning to receive personalized suggestions!
								</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
