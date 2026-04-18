'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, FileQuestion, TrendingUp, Brain, ArrowRight, FileText, ClipboardCheck, Gamepad2, ChevronDown, ChevronUp, Lightbulb, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Metric, Flex, Text, ProgressBar } from '@tremor/react';

export default function StudentDashboard() {
    const { userData } = useAuth();
    const { language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [enrolledCourses, setEnrolledCourses] = useState(0);
    const [pendingTasks, setPendingTasks] = useState(0);
    const [overallProgress, setOverallProgress] = useState(0);
    const [recentAssessments, setRecentAssessments] = useState([]);
    const [recentCourses, setRecentCourses] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [expandedRecIndex, setExpandedRecIndex] = useState(null);

    useEffect(() => {
        if (userData) {
            setUserName(userData.name || '');
            loadDashboardData();
        } else if (userData === null) {
            setLoading(false);
        }
    }, [userData]);

    async function loadDashboardData() {
        setLoading(true);
        try {
            const [{ enrollments }, { assessments }, { assignments }, { submissions }] = await Promise.all([
                api.get('/api/enrollments/student'),
                api.get('/api/assessments'),
                api.get('/api/assignments'),
                api.get('/api/submissions'),
            ]);

            const enrolledCourseIds = new Set(
                enrollments.map(e => (e.courseId?._id || e.courseId)?.toString()).filter(Boolean)
            );
            setEnrolledCourses(enrolledCourseIds.size);

            const recentCoursesList = enrollments
                .slice(0, 3)
                .map(e => ({ id: e.courseId?._id, title: e.courseId?.title }))
                .filter(c => c.id && c.title);
            setRecentCourses(recentCoursesList);

            const avgProgress = enrollments.length > 0
                ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress?.overallProgress || 0), 0) / enrollments.length)
                : 0;
            setOverallProgress(Math.min(avgProgress, 100));

            const submittedAssessmentIds = new Set(
                submissions.filter(s => s.assessmentId).map(s => s.assessmentId?.toString())
            );
            const submittedAssignmentIds = new Set(
                submissions.filter(s => s.assignmentId).map(s => s.assignmentId?.toString())
            );

            const pendingAssessments = assessments.filter(a =>
                enrolledCourseIds.has(a.courseId?.toString()) &&
                !submittedAssessmentIds.has(a._id?.toString())
            );
            const pendingAssignments = assignments.filter(a =>
                enrolledCourseIds.has(a.courseId?.toString()) &&
                !submittedAssignmentIds.has(a._id?.toString())
            );

            setPendingTasks(pendingAssessments.length + pendingAssignments.length);
            setRecentAssessments(pendingAssessments.slice(0, 3));

            loadRecommendationsPreview();
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadRecommendationsPreview() {
        try {
            const data = await api.post('/api/ai/recommendations', { language });
            setRecommendations((data.recommendations || []).slice(0, 3));
        } catch {
            setRecommendations([]);
        }
    }

    return (
        <div className="-m-6 md:-m-8 lg:-m-10 min-h-full relative overflow-hidden">
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
                                {userName
                                    ? (language === 'bm' ? `Selamat kembali, ${userName}` : `Welcome back, ${userName}`)
                                    : (language === 'bm' ? 'Papan Pemuka Pelajar' : 'Student Dashboard')}
                            </span>
                            <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse hidden md:block" />
                        </h1>
                        <p className="text-body text-muted-foreground mt-1">
                            {language === 'bm' ? 'Bersedia untuk meneruskan perjalanan pembelajaran anda hari ini?' : 'Ready to continue your learning journey today?'}
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-muted-foreground bg-white/50 px-4 py-2 rounded-full border border-gray-100">
                            {new Date().toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
                                    <CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">
                                        {language === 'bm' ? 'Kursus Berdaftar' : 'Enrolled Courses'}
                                    </CardTitle>
                                </Flex>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <Metric className="text-4xl font-bold text-neutralDark">
                                    {loading ? '-' : enrolledCourses}
                                </Metric>
                                <Text className="text-sm text-muted-foreground mt-1">
                                    {language === 'bm' ? 'Laluan pembelajaran aktif' : 'Active learning paths'}
                                </Text>
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
                                    <CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">
                                        {language === 'bm' ? 'Kemajuan Keseluruhan' : 'Overall Progress'}
                                    </CardTitle>
                                </Flex>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <div className="flex items-end gap-2">
                                    <Metric className="text-4xl font-bold text-neutralDark">{overallProgress}%</Metric>
                                </div>
                                <ProgressBar value={overallProgress} color="indigo" className="mt-3 h-2 rounded-full" />
                                <Text className="text-sm text-muted-foreground mt-2">
                                    {language === 'bm' ? 'Kadar penyelesaian semua kursus' : 'Completion rate across all courses'}
                                </Text>
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
                                    <CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">
                                        {language === 'bm' ? 'Tugasan Tertunda' : 'Pending Tasks'}
                                    </CardTitle>
                                </Flex>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <Metric className="text-4xl font-bold text-neutralDark">
                                    {loading ? '-' : pendingTasks}
                                </Metric>
                                <Text className="text-sm text-muted-foreground mt-1">
                                    {language === 'bm' ? 'Penilaian & tugasan untuk dilakukan' : 'Assessments & assignments to do'}
                                </Text>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Quick Access */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-6 w-1 bg-primary rounded-full"></div>
                        <h2 className="text-h2 text-neutralDark">
                            {language === 'bm' ? 'Akses Pantas' : 'Quick Access'}
                        </h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Link href="/courses" className="group">
                            <Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-primary/20">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
                                    <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300">
                                        <BookOpen className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">
                                            {language === 'bm' ? 'Kursus Saya' : 'My Courses'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'bm' ? 'Akses bahan pembelajaran anda' : 'Access your learning materials'}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-primary mt-2 group-hover:bg-primary/10">
                                        {language === 'bm' ? 'Lihat Kursus' : 'View Courses'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">
                                            {language === 'bm' ? 'Penilaian' : 'Assessments'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {pendingTasks > 0
                                                ? (language === 'bm' ? `${pendingTasks} tugasan tertunda` : `${pendingTasks} pending tasks`)
                                                : (language === 'bm' ? 'Ambil kuiz dan peperiksaan' : 'Take quizzes and exams')}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-orange-600 mt-2 group-hover:bg-orange-100">
                                        {language === 'bm' ? 'Lihat Penilaian' : 'View Assessments'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">
                                            {language === 'bm' ? 'Tugasan' : 'Assignments'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'bm' ? 'Hantar kerja rumah anda' : 'Submit your homework'}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-blue-600 mt-2 group-hover:bg-blue-100">
                                        {language === 'bm' ? 'Lihat Tugasan' : 'View Assignments'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
                                        <h3 className="text-lg font-semibold text-neutralDark mb-1">
                                            {language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'bm' ? 'Jejak prestasi anda' : 'Track your performance'}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-green-600 mt-2 group-hover:bg-green-100">
                                        {language === 'bm' ? 'Lihat Statistik' : 'View Stats'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Pending Assessments */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
                                <h2 className="text-h2 text-neutralDark">
                                    {language === 'bm' ? 'Keutamaan' : 'Priorities'}
                                </h2>
                            </div>
                            {recentAssessments.length > 0 && (
                                <Link href="/assessments">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-neutralDark">
                                        {language === 'bm' ? 'Lihat Semua' : 'View All'}
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {recentAssessments.length > 0 ? (
                            <div className="space-y-4">
                                {recentAssessments.map((assessment) => (
                                    <div key={assessment._id} className="group flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100/50">
                                        <div className="flex-shrink-0 p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                                            <FileQuestion className="h-6 w-6 text-orange-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-neutralDark truncate">{assessment.title}</h4>
                                            <p className="text-sm text-muted-foreground capitalize">{assessment.type || (language === 'bm' ? 'Penilaian' : 'Assessment')}</p>
                                        </div>
                                        <Link href={`/assessments/${assessment._id}/take`}>
                                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 shadow-sm hover:shadow">
                                                {language === 'bm' ? 'Mula' : 'Start'}
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
                                <p className="text-neutralDark font-medium">
                                    {language === 'bm' ? 'Semua telah selesai!' : 'All caught up!'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {language === 'bm' ? 'Tiada penilaian tertunda pada masa ini.' : 'No pending assessments at the moment.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* Recent Courses */}
                        {recentCourses.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-1 bg-primary rounded-full"></div>
                                        <h2 className="text-h2 text-neutralDark">
                                            {language === 'bm' ? 'Kursus Terkini' : 'Recent Courses'}
                                        </h2>
                                    </div>
                                    <Link href="/courses">
                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-neutralDark">
                                            {language === 'bm' ? 'Lihat Semua' : 'View All'}
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
                                                <ChevronDown className="h-4 w-4 text-gray-300 -rotate-90 group-hover:text-primary transition-colors" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Insights */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
                                    <h2 className="text-h2 text-neutralDark flex items-center gap-2">
                                        {language === 'bm' ? 'Wawasan AI' : 'AI Insights'}
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                    </h2>
                                </div>
                                <Link href="/ai">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-neutralDark">
                                        {language === 'bm' ? 'Pembantu AI' : 'AI Assistant'}
                                    </Button>
                                </Link>
                            </div>

                            {recommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {recommendations.map((rec, index) => {
                                        const isExpanded = expandedRecIndex === index;
                                        const getPriorityIcon = (priority) => {
                                            switch (priority) {
                                                case 'high': return <AlertCircle className="h-5 w-5 text-red-500" />;
                                                case 'medium': return <TrendingUp className="h-5 w-5 text-yellow-500" />;
                                                case 'low': return <CheckCircle className="h-5 w-5 text-green-500" />;
                                                default: return <Lightbulb className="h-5 w-5 text-purple-500" />;
                                            }
                                        };
                                        return (
                                            <div
                                                key={index}
                                                className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${isExpanded ? 'ring-2 ring-purple-100' : ''}`}
                                                onClick={() => setExpandedRecIndex(isExpanded ? null : index)}
                                            >
                                                <div className="p-4 flex items-start gap-4">
                                                    <div className="flex-shrink-0 mt-0.5">{getPriorityIcon(rec.priority)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-sm font-semibold text-neutralDark">{rec.title}</h3>
                                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="mt-3 text-sm text-muted-foreground border-t border-gray-50 pt-3 animate-fadeIn">
                                                                <p className="mb-3">{rec.description}</p>
                                                                {rec.action?.path && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border-none"
                                                                        onClick={(e) => { e.stopPropagation(); window.location.href = rec.action.path; }}
                                                                    >
                                                                        {rec.action.label || (language === 'bm' ? 'Lihat' : 'View')} <ArrowRight className="h-3 w-3 ml-2" />
                                                                    </Button>
                                                                )}
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
                                    <p className="text-sm text-purple-900 font-medium">
                                        {language === 'bm' ? 'AI sedang menganalisis kemajuan anda...' : 'AI is analyzing your progress...'}
                                    </p>
                                    <p className="text-xs text-purple-600/70 mt-1">
                                        {language === 'bm' ? 'Semak semula kemudian untuk petua peribadi.' : 'Check back later for personalized tips.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
