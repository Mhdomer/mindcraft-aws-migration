'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { useAuth } from '@/app/contexts/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import Link from 'next/link';
import { BookOpen, FileQuestion, TrendingUp, Brain, ArrowRight, FileText, ClipboardCheck, Gamepad2, ChevronDown, ChevronUp, Lightbulb, AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Metric, Flex, Text, ProgressBar } from '@tremor/react';

export default function StudentDashboard() {
	const { user, userData } = useAuth();
	const { language } = useLanguage();

	const [loading, setLoading] = useState(true);
	const [userName, setUserName] = useState('');
	const [enrolledCourses, setEnrolledCourses] = useState(0);
	const [pendingTasks, setPendingTasks] = useState(0);
	const [overallProgress, setOverallProgress] = useState(0);
	const [recentAssessments, setRecentAssessments] = useState([]);
	const [recentCourses, setRecentCourses] = useState([]);
	const [recommendations, setRecommendations] = useState([]);
	const [recommendationsLoading, setRecommendationsLoading] = useState(true);
	const [expandedRecIndex, setExpandedRecIndex] = useState(null);

	const tooltips = {
		en: {
			myCourses: 'View all your enrolled courses and continue learning',
			assessments: 'Take quizzes and exams to test your knowledge',
			assignments: 'View and submit your assignments',
			progress: 'Track your learning progress and achievements',
			aiAssistant: 'Get help from AI assistant for concepts and questions',
			gameLevels: 'Play interactive learning games',
		},
		bm: {
			myCourses: 'Lihat semua kursus yang anda daftar dan teruskan pembelajaran',
			assessments: 'Ambil kuiz dan peperiksaan untuk menguji pengetahuan anda',
			assignments: 'Lihat dan hantar tugasan anda',
			progress: 'Jejaki kemajuan pembelajaran dan pencapaian anda',
			aiAssistant: 'Dapatkan bantuan daripada pembantu AI untuk konsep dan soalan',
			gameLevels: 'Main permainan pembelajaran interaktif',
		},
	};
	const t = tooltips[language] || tooltips.en;

	useEffect(() => {
		if (user) {
			setUserName(user.displayName || userData?.name || '');
			loadDashboardData(user.uid);
		} else if (!user && !userData) {
			// If we know auth check is done (loading is false in context, but here loading is local dashboard loading)
			// effectively if no user, we stop loading dashboard
			if (userData === null) setLoading(false);
		}
	}, [user, userData]);

    async function loadDashboardData(userId) {
        setLoading(true);
        try {
            // 1. Fetch Enrollments
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

            if (enrolledCourseIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Parallel Fetching for dependent data
            // Fetch first 3 courses for recent courses display
            const fetchCoursesPromise = (async () => {
                const recentIds = enrolledCourseIds.slice(0, 3);
                if (recentIds.length === 0) return [];
                const coursePromises = recentIds.map(id => getDoc(doc(db, 'course', id)));
                const courseDocs = await Promise.all(coursePromises);
                return courseDocs.map(d => d.exists() ? { id: d.id, ...d.data() } : null).filter(Boolean);
            })();

            // Fetch tasks (Assessments & Assignments) using 'in' query optimization
            // Chunking into groups of 10 to satisfy Firestore 'in' query limit
            const chunks = [];
            const chunkSize = 10;
            for (let i = 0; i < enrolledCourseIds.length; i += chunkSize) {
                chunks.push(enrolledCourseIds.slice(i, i + chunkSize));
            }

            const fetchAssessmentsPromise = (async () => {
                const results = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'assessment'),
                        where('courseId', 'in', chunk),
                        where('published', '==', true)
                    );
                    const snap = await getDocs(q);
                    results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                return results;
            })();

            const fetchAssignmentsPromise = (async () => {
                const results = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'assignment'),
                        where('courseId', 'in', chunk),
                        where('published', '==', true)
                    );
                    const snap = await getDocs(q);
                    results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                return results;
            })();

            const fetchSubmissionsPromise = getDocs(query(collection(db, 'submission'), where('studentId', '==', userId)));

            // Wait for all parallel requests to complete
            const [recentCoursesData, allAssessments, allAssignments, submissionsSnapshot] = await Promise.all([
                fetchCoursesPromise,
                fetchAssessmentsPromise,
                fetchAssignmentsPromise,
                fetchSubmissionsPromise
            ]);

            setRecentCourses(recentCoursesData);

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

            // Calculate overall progress from all enrollments
            // We now use the pre-calculated stats in the enrollment object which updates when lessons are completed
            let totalProgressSum = 0;
            let activeEnrollmentsCount = 0;

            enrollments.forEach(enrollment => {
                if (enrollment.progress && typeof enrollment.progress.overallProgress === 'number') {
                    totalProgressSum += enrollment.progress.overallProgress;
                    activeEnrollmentsCount++;
                }
            });

            // If we have enrollments but no progress data yet, fallback to 0 or assessments logic if preferred
            // But for now let's rely on the enrollment progress which we started updating
            const avgProgress = activeEnrollmentsCount > 0 ? Math.round(totalProgressSum / activeEnrollmentsCount) : 0;
            setOverallProgress(Math.min(avgProgress, 100)); // Ensure it never exceeds 100%

            // Load recommendations preview
            loadRecommendationsPreview(userId);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadRecommendationsPreview(userId) {
        if (!userId) {
            setRecommendationsLoading(false);
            return;
        }

        setRecommendationsLoading(true);
        try {
            // Use the same static recommendations as the main page for consistency
            // Get one of each priority: high, medium, low
            const staticRecommendations = [
                {
                    id: 'db-normalization',
                    title: 'Database Normalization',
                    priority: 'high',
                    why: 'Normalization is fundamental to database design. Understanding how to organize data into well-structured tables reduces redundancy and improves data integrity.',
                    overview: 'Learn about the different normal forms (1NF, 2NF, 3NF, BCNF) and how to apply them to your database designs.',
                    topics: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)', 'Practical examples'],
                    actionPath: '/courses'
                },
                {
                    id: 'indexing-strategies',
                    title: 'Database Indexing Strategies',
                    priority: 'medium',
                    why: 'Proper indexing dramatically improves query performance. Understanding when and how to create indexes is critical.',
                    overview: 'Explore different types of indexes and learn when to create indexes for optimal performance.',
                    topics: ['Types of indexes', 'Composite indexes', 'Index maintenance', 'Query optimization', 'Index monitoring'],
                    actionPath: '/courses'
                },
                {
                    id: 'stored-procedures',
                    title: 'Stored Procedures & Functions',
                    priority: 'low',
                    why: 'Stored procedures and functions encapsulate business logic in the database, improving performance and maintainability.',
                    overview: 'Learn to create, use, and optimize stored procedures and functions.',
                    topics: ['Creating stored procedures', 'Input and output parameters', 'User-defined functions', 'Error handling in procedures', 'Performance considerations'],
                    actionPath: '/courses'
                },
            ];

            // One of each priority: high, medium, low
            setRecommendations(staticRecommendations);
        } catch (err) {
            console.error('Error loading recommendations:', err);
            setRecommendations([]);
        } finally {
            setRecommendationsLoading(false);
        }
    }

    return (
        <div className="-m-6 md:-m-8 lg:-m-10 min-h-full relative overflow-hidden">
            {/* Premium Background Design */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

            <div className="space-y-10 animate-fadeIn p-6 md:p-8 lg:p-10 relative z-10">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-h1 text-neutralDark flex items-center gap-3">
                            <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                                {userName ? `Welcome back, ${userName}` : 'Student Dashboard'}
                            </span>
                            <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse hidden md:block" />
                        </h1>
                        <p className="text-body text-muted-foreground mt-1">Ready to continue your learning journey today?</p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-muted-foreground bg-white/50 px-4 py-2 rounded-full border border-gray-100">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Progress Overview */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Link href="/courses" className="group">
                        <Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-primary/5 relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-all duration-500"></div>
                            <CardHeader className="pb-2 z-10 relative">
                                <Flex justifyContent="start" className="gap-3">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">Enrolled Courses</CardTitle>
                                </Flex>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <Metric className="text-4xl font-bold text-neutralDark">
                                    {loading ? '-' : enrolledCourses}
                                </Metric>
                                <Text className="text-sm text-muted-foreground mt-1">Active learning paths</Text>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/progress" className="group">
                        <Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-indigo-50/50 relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                            <CardHeader className="pb-2 z-10 relative">
                                <Flex justifyContent="start" className="gap-3">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
                                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">Overall Progress</CardTitle>
                                </Flex>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <div className="flex items-end gap-2">
                                    <Metric className="text-4xl font-bold text-neutralDark">{overallProgress}%</Metric>
                                </div>
                                <ProgressBar value={overallProgress} color="indigo" className="mt-3 h-2 rounded-full" />
                                <Text className="text-sm text-muted-foreground mt-2">Completion rate across all courses</Text>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/assessments" className="group">
                        <Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-orange-50/50 relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all duration-500"></div>
                            <CardHeader className="pb-2 z-10 relative">
                                <Flex justifyContent="start" className="gap-3">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
                                        <FileQuestion className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">Pending Tasks</CardTitle>
                                </Flex>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <Metric className="text-4xl font-bold text-neutralDark">
                                    {loading ? '-' : pendingTasks}
                                </Metric>
                                <Text className="text-sm text-muted-foreground mt-1">Assessments & assignments to do</Text>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Action Cards */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-6 w-1 bg-primary rounded-full"></div>
                        <h2 className="text-h2 text-neutralDark">Quick Access</h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Link href="/courses" className="group">
                            <Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-primary/20">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
                                    <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300">
                                        <BookOpen className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">My Courses</h3>
                                        <p className="text-sm text-muted-foreground">Access your learning materials</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-primary mt-2 group-hover:bg-primary/10">
                                        View Courses <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/assessments" className="group">
                            <Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-orange-500/20">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
                                    <div className="p-4 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors duration-300">
                                        <FileQuestion className="h-8 w-8 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">Assessments</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {pendingTasks > 0 ? `${pendingTasks} pending tasks` : 'Take quizzes and exams'}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-orange-600 mt-2 group-hover:bg-orange-100">
                                        View Assessments <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/assignments" className="group">
                            <Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-blue-500/20">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
                                    <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors duration-300">
                                        <FileText className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">Assignments</h3>
                                        <p className="text-sm text-muted-foreground">Submit your homework</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-blue-600 mt-2 group-hover:bg-blue-100">
                                        View Assignments <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/progress" className="group">
                            <Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-green-500/20">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
                                    <div className="p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors duration-300">
                                        <TrendingUp className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">My Progress</h3>
                                        <p className="text-sm text-muted-foreground">Track your performance</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-green-600 mt-2 group-hover:bg-green-100">
                                        View Stats <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Recent Assessments Section */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
                                <h2 className="text-h2 text-neutralDark">Priorities</h2>
                            </div>
                            {recentAssessments.length > 0 && (
                                <Link href="/assessments">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-neutralDark">
                                        View All
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {recentAssessments.length > 0 ? (
                            <div className="space-y-4">
                                {recentAssessments.map((assessment) => (
                                    <div key={assessment.id} className="group flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100/50">
                                        <div className="flex-shrink-0 p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                                            <FileQuestion className="h-6 w-6 text-orange-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-neutralDark truncate">{assessment.title}</h4>
                                            <p className="text-sm text-muted-foreground capitalize">{assessment.type || 'Assessment'}</p>
                                        </div>
                                        <Link href={`/assessments/${assessment.id}/take`}>
                                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 shadow-sm hover:shadow">
                                                Start
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                <div className="inline-flex p-4 bg-gray-50 rounded-full mb-3">
                                    <CheckCircle className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-neutralDark font-medium">All caught up!</p>
                                <p className="text-sm text-muted-foreground">No pending assessments at the moment.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Courses/Recommendation Split */}
                    <div className="space-y-8">
                        {/* Recent Courses */}
                        {recentCourses.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-1 bg-primary rounded-full"></div>
                                        <h2 className="text-h2 text-neutralDark">Recent Courses</h2>
                                    </div>
                                    <Link href="/courses">
                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-neutralDark">
                                            View All
                                        </Button>
                                    </Link>
                                </div>

                                <div className="space-y-3">
                                    {recentCourses.map((course) => (
                                        <Link key={course.id} href={`/courses/${course.id}`} className="block">
                                            <div className="group flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100/50 hover:border-primary/20">
                                                <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg group-hover:bg-primary/5 transition-colors">
                                                    <BookOpen className="h-5 w-5 text-gray-500 group-hover:text-primary transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-neutralDark truncate group-hover:text-primary transition-colors">{course.title}</h4>
                                                </div>
                                                <ChevronDown className="h-5 w-5 text-gray-300 -rotate-90 group-hover:text-primary transition-colors" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Recommendations */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
                                    <h2 className="text-h2 text-neutralDark flex items-center gap-2">
                                        AI Insights
                                        <Sparkles className="h-5 w-5 text-purple-500" />
                                    </h2>
                                </div>
                                <Link href="/ai">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-neutralDark">
                                        AI Assistant
                                    </Button>
                                </Link>
                            </div>

                            {recommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {recommendations.map((rec, index) => {
                                        const isExpanded = expandedRecIndex === index;
                                        const getPriorityIcon = (priority) => {
                                            switch (priority) {
                                                case 'high': return <AlertCircle className="h-6 w-6 text-red-500" />;
                                                case 'medium': return <TrendingUp className="h-6 w-6 text-yellow-500" />;
                                                case 'low': return <CheckCircle className="h-6 w-6 text-green-500" />;
                                                default: return <Lightbulb className="h-6 w-6 text-purple-500" />;
                                            }
                                        };
                                        const getPriorityBorderColor = (priority) => {
                                            switch (priority) {
                                                case 'high': return 'border-l-red-500';
                                                case 'medium': return 'border-l-yellow-500';
                                                case 'low': return 'border-l-green-500';
                                                default: return 'border-l-purple-500';
                                            }
                                        };

                                        return (
                                            <div
                                                key={rec.id || index}
                                                className={`
													bg-white rounded-xl border-l-4 ${getPriorityBorderColor(rec.priority)} border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer
													${isExpanded ? 'ring-2 ring-purple-100' : ''}
												`}
                                                onClick={() => setExpandedRecIndex(isExpanded ? null : index)}
                                            >
                                                <div className="p-4 flex items-start gap-4">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        {getPriorityIcon(rec.priority)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-sm font-semibold text-neutralDark">{rec.title}</h3>
                                                            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                                                        </div>
                                                        {isExpanded && (
                                                            <div className={`mt-3 text-sm text-muted-foreground border-t pt-3 animate-fadeIn space-y-3 ${
                                                                rec.priority === 'high' ? 'border-red-500/20' :
                                                                rec.priority === 'medium' ? 'border-yellow-500/20' :
                                                                rec.priority === 'low' ? 'border-green-500/20' : 'border-gray-50'
                                                            }`}>
                                                                <div>
                                                                    <h4 className={`text-xs font-semibold mb-1 flex items-center gap-1 ${
                                                                        rec.priority === 'high' ? 'text-red-700 dark:text-red-400' :
                                                                        rec.priority === 'medium' ? 'text-yellow-700 dark:text-yellow-400' :
                                                                        rec.priority === 'low' ? 'text-green-700 dark:text-green-400' : 'text-neutralDark'
                                                                    }`}>
                                                                        <Lightbulb className={`h-4 w-4 ${
                                                                            rec.priority === 'high' ? 'text-red-500' :
                                                                            rec.priority === 'medium' ? 'text-yellow-500' :
                                                                            rec.priority === 'low' ? 'text-green-500' : 'text-primary'
                                                                        }`} />
                                                                        Why This Matters
                                                                    </h4>
                                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                                        {rec.why}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <h4 className={`text-xs font-semibold mb-1 flex items-center gap-1 ${
                                                                        rec.priority === 'high' ? 'text-red-700 dark:text-red-400' :
                                                                        rec.priority === 'medium' ? 'text-yellow-700 dark:text-yellow-400' :
                                                                        rec.priority === 'low' ? 'text-green-700 dark:text-green-400' : 'text-neutralDark'
                                                                    }`}>
                                                                        <BookOpen className={`h-4 w-4 ${
                                                                            rec.priority === 'high' ? 'text-red-500' :
                                                                            rec.priority === 'medium' ? 'text-yellow-500' :
                                                                            rec.priority === 'low' ? 'text-green-500' : 'text-primary'
                                                                        }`} />
                                                                        Overview
                                                                    </h4>
                                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                                        {rec.overview}
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-2 pt-2">
                                                                    <Button
                                                                        size="sm"
                                                                        className={
                                                                            rec.priority === 'high' ? 'bg-red-500 hover:bg-red-600 text-white' :
                                                                            rec.priority === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                                                                            rec.priority === 'low' ? 'bg-green-500 hover:bg-green-600 text-white' : ''
                                                                        }
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.location.href = rec.actionPath || '/courses';
                                                                        }}
                                                                    >
                                                                        Explore Courses
                                                                        <ArrowRight className="h-5 w-5 ml-1" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className={
                                                                            rec.priority === 'high' ? 'border-red-500 text-red-500 hover:bg-red-50' :
                                                                            rec.priority === 'medium' ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-50' :
                                                                            rec.priority === 'low' ? 'border-green-500 text-green-500 hover:bg-green-50' : ''
                                                                        }
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.location.href = `/ai/explain?topic=${encodeURIComponent(`Database topic: ${rec.title}`)}`;
                                                                        }}
                                                                    >
                                                                        Ask AI
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-purple-50/50 rounded-xl p-6 text-center border border-purple-100">
                                    <Brain className="h-8 w-8 text-purple-300 mx-auto mb-2" />
                                    <p className="text-sm text-purple-900 font-medium">AI is analyzing your progress...</p>
                                    <p className="text-xs text-purple-600/70 mt-1">Check back later for personalized tips.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
