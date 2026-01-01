'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Clock, Award, FileText, ClipboardCheck, TrendingUp, TrendingDown, Calendar, AlertTriangle, Target, Lightbulb, Info, Activity, Printer, Download, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart, LineChart } from '@tremor/react';

export default function ProgressPage() {
	const { language } = useLanguage();
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [courseProgress, setCourseProgress] = useState([]);
	const [riskIndicators, setRiskIndicators] = useState({});
	const [achievements, setAchievements] = useState([]);
	const [strongTopics, setStrongTopics] = useState([]);
	const [scoreTrend, setScoreTrend] = useState([]); 	// US011-03 states
	const [showReportModal, setShowReportModal] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const [reportConfig, setReportConfig] = useState({
		includePerformance: true,
		includeProgress: true,
		includeTrend: true,
		includeStrong: false,
		includeRisk: false,
		includeDetails: false
	});
	// US011-05: Dashboard View State
	const [currentView, setCurrentView] = useState('hub');

	const DashboardBlock = ({ title, description, icon: Icon, onClick, colorClass, gradient }) => (
		<Card
			className={`cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 block h-full overflow-hidden border-0 shadow-md ${gradient || 'bg-white'}`}
			onClick={onClick}
		>
			<div className="h-full flex flex-col relative">
				{gradient && (
					<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
						<Icon className="w-24 h-24 text-white" />
					</div>
				)}
				<CardHeader className={`${gradient ? 'text-white' : ''}`}>
					<div className="flex items-center gap-3 mb-2">
						<div className={`p-2 rounded-lg ${gradient ? 'bg-white/20' : 'bg-neutral-100'}`}>
							<Icon className={`h-6 w-6 ${gradient ? 'text-white' : colorClass}`} />
						</div>
					</div>
					<CardTitle className={`text-lg font-bold ${gradient ? 'text-white' : 'text-neutralDark'}`}>
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent className={`flex-1 ${gradient ? 'text-white/90' : 'text-muted-foreground'}`}>
					<p className="text-sm">{description}</p>
				</CardContent>
			</div>
		</Card>
	);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role === 'student') {
						await loadProgress(user.uid);
					}
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
			}
		});

		return () => unsubscribe();
	}, []);

	async function loadProgress(userId) {
		setLoading(true);
		try {
			if (!userId) return;

			// Get all enrollments for this student
			const enrollmentsQuery = query(
				collection(db, 'enrollment'),
				where('studentId', '==', userId)
			);
			const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
			const enrollments = enrollmentsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			if (enrollments.length === 0) {
				setCourseProgress([]);
				setLoading(false);
				return;
			}

			// Get all submissions for this student
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', userId)
			);
			const submissionsSnapshot = await getDocs(submissionsQuery);
			const submissions = submissionsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Group submissions by course
			const submissionsByCourse = {};
			const assessmentIds = new Set();
			const assignmentIds = new Set();

			submissions.forEach(sub => {
				if (sub.assessmentId) {
					assessmentIds.add(sub.assessmentId);
				}
				if (sub.assignmentId) {
					assignmentIds.add(sub.assignmentId);
				}
			});

			// Load assessments and assignments to get course IDs
			const assessments = {};
			const assignments = {};

			for (const assessmentId of assessmentIds) {
				try {
					const assessmentDoc = await getDoc(doc(db, 'assessment', assessmentId));
					if (assessmentDoc.exists()) {
						const data = assessmentDoc.data();
						assessments[assessmentId] = data;
						if (data.courseId) {
							if (!submissionsByCourse[data.courseId]) {
								submissionsByCourse[data.courseId] = { assessments: [], assignments: [] };
							}
							const sub = submissions.find(s => s.assessmentId === assessmentId);
							if (sub) {
								submissionsByCourse[data.courseId].assessments.push({
									...sub,
									assessmentTitle: data.title,
									assessmentType: data.type,
								});
							}
						}
					}
				} catch (err) {
					console.error(`Error loading assessment ${assessmentId}:`, err);
				}
			}

			for (const assignmentId of assignmentIds) {
				try {
					const assignmentDoc = await getDoc(doc(db, 'assignment', assignmentId));
					if (assignmentDoc.exists()) {
						const data = assignmentDoc.data();
						assignments[assignmentId] = data;
						if (data.courseId) {
							if (!submissionsByCourse[data.courseId]) {
								submissionsByCourse[data.courseId] = { assessments: [], assignments: [] };
							}
							const sub = submissions.find(s => s.assignmentId === assignmentId);
							if (sub) {
								submissionsByCourse[data.courseId].assignments.push({
									...sub,
									assignmentTitle: data.title,
								});
							}
						}
					}
				} catch (err) {
					console.error(`Error loading assignment ${assignmentId}:`, err);
				}
			}

			// Load course details and calculate progress
			const progressData = [];
			for (const enrollment of enrollments) {
				try {
					if (!enrollment.courseId) {
						console.warn('Enrollment missing courseId:', enrollment.id);
						continue;
					}
					const courseDoc = await getDoc(doc(db, 'course', enrollment.courseId));
					if (!courseDoc.exists()) {
						console.warn('Course not found for enrollment:', enrollment.courseId);
						continue;
					}

					const courseData = courseDoc.data();
					const enrollmentProgress = enrollment.progress || {
						completedModules: [],
						completedLessons: [],
						overallProgress: 0,
					};

					// Count total lessons and modules
					let totalLessons = 0;
					let totalModules = 0;

					if (courseData.modules && Array.isArray(courseData.modules)) {
						totalModules = courseData.modules.length;
						for (const moduleId of courseData.modules) {
							try {
								const moduleDoc = await getDoc(doc(db, 'module', moduleId));
								if (moduleDoc.exists()) {
									const moduleData = moduleDoc.data();
									if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
										totalLessons += moduleData.lessons.length;
									}
								}
							} catch (err) {
								console.error(`Error loading module ${moduleId}:`, err);
							}
						}
					}

					const completedLessons = enrollmentProgress.completedLessons?.length || 0;
					const completedModules = enrollmentProgress.completedModules?.length || 0;
					const overallProgress = enrollmentProgress.overallProgress || 0;

					// Get submissions for this course
					const courseSubmissions = submissionsByCourse[enrollment.courseId] || {
						assessments: [],
						assignments: [],
					};

					// Calculate average assessment score
					let totalAssessmentScore = 0;
					let totalAssessmentPoints = 0;
					courseSubmissions.assessments.forEach(sub => {
						if (sub.score !== undefined && sub.totalPoints) {
							totalAssessmentScore += sub.score;
							totalAssessmentPoints += sub.totalPoints;
						}
					});
					const avgAssessmentScore = totalAssessmentPoints > 0
						? Math.round((totalAssessmentScore / totalAssessmentPoints) * 100)
						: null;

					progressData.push({
						courseId: enrollment.courseId,
						courseTitle: courseData.title,
						courseDescription: courseData.description,
						enrolledAt: enrollment.enrolledAt,
						overallProgress,
						completedLessons,
						totalLessons,
						completedModules,
						totalModules,
						assessments: courseSubmissions.assessments,
						assignments: courseSubmissions.assignments,
						avgAssessmentScore,
					});
				} catch (err) {
					console.error(`Error loading course ${enrollment.courseId}:`, err);
				}
			}

			// Sort by enrollment date (most recent first)
			progressData.sort((a, b) => {
				const aTime = a.enrolledAt?.toDate ? a.enrolledAt.toDate().getTime() : 0;
				const bTime = b.enrolledAt?.toDate ? b.enrolledAt.toDate().getTime() : 0;
				return bTime - aTime;
			});

			setCourseProgress(progressData);

			// --- US011-01: Achievements Calculation ---
			const newAchievements = [];
			// Badge 1: First Step (Enrolled in at least 1 course)
			if (progressData.length > 0) {
				newAchievements.push({
					id: 'first-step',
					title: language === 'bm' ? 'Langkah Pertama' : 'First Step',
					description: language === 'bm' ? 'Mendaftar dalam kursus pertama' : 'Enrolled in first course',
					icon: BookOpen,
					color: 'text-blue-500 bg-blue-100',
					date: progressData[progressData.length - 1].enrolledAt // Oldest enrollment
				});
			}

			// Badge 2: High Flyer (Avg Score > 80% in any course)
			const highScoringCourse = progressData.find(c => c.avgAssessmentScore >= 80);
			if (highScoringCourse) {
				newAchievements.push({
					id: 'high-flyer',
					title: language === 'bm' ? 'Pencapai Tinggi' : 'High Flyer',
					description: language === 'bm' ? 'Mencapai skor > 80% dalam kursus' : 'Achieved > 80% score in a course',
					icon: Award,
					color: 'text-amber-500 bg-amber-100',
					date: new Date() // Current achievement
				});
			}

			// Badge 3: Dedicated Learner (Completed > 5 lessons total)
			const totalCompletedLessons = progressData.reduce((acc, curr) => acc + curr.completedLessons, 0);
			if (totalCompletedLessons >= 5) {
				newAchievements.push({
					id: 'dedicated',
					title: language === 'bm' ? 'Pelajar Berdedikasi' : 'Dedicated Learner',
					description: language === 'bm' ? 'Menyiapkan 5+ pelajaran' : 'Completed 5+ lessons',
					icon: CheckCircle2,
					color: 'text-emerald-500 bg-emerald-100',
					date: new Date()
				});
			}
			setAchievements(newAchievements);

			// --- US011-01: Strong Topics Identification ---
			const strong = progressData
				.filter(c => c.avgAssessmentScore >= 80)
				.map(c => ({
					id: c.courseId,
					title: c.courseTitle,
					score: c.avgAssessmentScore,
					assessmentsCount: c.assessments.length
				}));
			setStrongTopics(strong);

			// --- US011-01: Score Trend Data ---
			let allAssessments = [];
			progressData.forEach(course => {
				if (course.assessments && course.assessments.length > 0) {
					course.assessments.forEach(a => {
						if (a.score !== undefined) {
							allAssessments.push({
								courseTitle: course.courseTitle,
								assessmentTitle: a.assessmentTitle,
								score: a.score,
								date: a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt || Date.now()) // Handle firestore timestamp
							});
						}
					});
				}
			});
			// Sort by date ascending
			allAssessments.sort((a, b) => a.date - b.date);
			// Format for chart
			const trendData = allAssessments.map(a => ({
				date: a.date.toLocaleDateString(),
				score: a.score,
				title: a.assessmentTitle
			}));
			setScoreTrend(trendData);

			// Calculate risk indicators for each course
			const riskData = {};
			const now = new Date();
			const defaultRiskConfig = {
				minAvgScore: 60,
				maxMissedDeadlines: 2,
				maxDaysInactive: 7,
			};

			for (const course of progressData) {
				const avgScore = course.avgAssessmentScore || 0;
				const completionRate = course.totalLessons > 0
					? (course.completedLessons / course.totalLessons) * 100
					: 0;

				// Calculate days since last activity (use enrollment date as fallback)
				const lastActivity = course.enrolledAt?.toDate
					? course.enrolledAt.toDate()
					: new Date(course.enrolledAt || 0);
				const daysSinceActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

				// Count missed deadlines (simplified - check if assignments/assessments are past due)
				let missedDeadlines = 0;
				// This would require loading assignment/assessment deadlines, simplified for now

				// Calculate risk level
				const highScoreRisk = avgScore < (defaultRiskConfig.minAvgScore - 10);
				const mediumScoreRisk = avgScore < defaultRiskConfig.minAvgScore && avgScore > 0;
				const highEngagementRisk = daysSinceActivity > (defaultRiskConfig.maxDaysInactive * 2);
				const mediumEngagementRisk = daysSinceActivity > defaultRiskConfig.maxDaysInactive;
				const lowCompletionRisk = completionRate < 50 && course.totalLessons > 0;

				let riskLevel = 'low';
				const riskReasons = [];
				const recommendations = [];

				if (highScoreRisk || highEngagementRisk) {
					riskLevel = 'high';
				} else if (mediumScoreRisk || mediumEngagementRisk || lowCompletionRisk || missedDeadlines > 0) {
					riskLevel = 'medium';
				}

				if (highScoreRisk || mediumScoreRisk) {
					riskReasons.push(
						language === 'bm'
							? `Skor purata penilaian di bawah ${defaultRiskConfig.minAvgScore}%`
							: `Average assessment score below ${defaultRiskConfig.minAvgScore}%`
					);
					recommendations.push(
						language === 'bm'
							? 'Kaji semula bahan pembelajaran dan latih soalan penilaian'
							: 'Review learning materials and practice assessment questions'
					);
				}

				if (lowCompletionRisk) {
					riskReasons.push(
						language === 'bm'
							? `Kadar penyiapan rendah (${Math.round(completionRate)}%)`
							: `Low completion rate (${Math.round(completionRate)}%)`
					);
					recommendations.push(
						language === 'bm'
							? 'Selesaikan lebih banyak pelajaran untuk meningkatkan kemajuan'
							: 'Complete more lessons to improve your progress'
					);
				}

				if (mediumEngagementRisk || highEngagementRisk) {
					riskReasons.push(
						language === 'bm'
							? `Tidak aktif selama ${daysSinceActivity} hari`
							: `Inactive for ${daysSinceActivity} days`
					);
					recommendations.push(
						language === 'bm'
							? 'Aktifkan semula pembelajaran dengan melengkapkan pelajaran baru'
							: 'Re-engage with learning by completing new lessons'
					);
				}

				if (missedDeadlines > 0) {
					riskReasons.push(
						language === 'bm'
							? `Terlepas ${missedDeadlines} tarikh akhir`
							: `Missed ${missedDeadlines} deadline${missedDeadlines > 1 ? 's' : ''}`
					);
					recommendations.push(
						language === 'bm'
							? 'Semak tugasan yang tertunggak dan hantar secepat mungkin'
							: 'Check for pending assignments and submit them as soon as possible'
					);
				}

				if (riskLevel === 'low' && course.totalLessons > 0) {
					recommendations.push(
						language === 'bm'
							? 'Teruskan usaha yang baik! Pastikan anda mengekalkan momentum pembelajaran'
							: 'Keep up the good work! Make sure to maintain your learning momentum'
					);
				}

				riskData[course.courseId] = {
					riskLevel,
					riskReasons,
					recommendations,
					avgScore,
					completionRate,
					daysSinceActivity,
					missedDeadlines,
				};
			}

			setRiskIndicators(riskData);
		} catch (err) {
			console.error('Error loading progress:', err);
		} finally {
			setLoading(false);
		}
	}

	function handlePrint() {
		setShowReportModal(false);
		setIsPrinting(true);
		// Allow renders to update and animations to complete (or be skipped)
		setTimeout(() => {
			window.print();
			setIsPrinting(false);
		}, 500);
	}

	function formatDate(timestamp) {
		if (!timestamp) return language === 'bm' ? 'Tiada' : 'N/A';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatDateTime(timestamp) {
		if (!timestamp) return language === 'bm' ? 'Tiada' : 'N/A';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (userRole !== 'student') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm'
							? 'Halaman ini hanya tersedia untuk pelajar.'
							: 'This page is only available for students.'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm'
							? 'Ikuti kemajuan pembelajaran anda merentas semua kursus yang didaftarkan'
							: 'Track your learning progress across all enrolled courses'}
					</p>
				</div>
				<div className="flex flex-col items-end gap-2">
					{currentView !== 'hub' && (
						<Button
							variant="outline"
							onClick={() => setCurrentView('hub')}
							className="gap-2 print:hidden"
						>
							<ArrowLeft className="h-4 w-4" />
							{language === 'bm' ? 'Kembali ke Papan Pemuka' : 'Back to Dashboard'}
						</Button>
					)}
					{currentView === 'hub' ? (
						<Dialog open={showReportModal} onOpenChange={setShowReportModal}>
							<DialogTrigger asChild>
								<Button variant="outline" className="gap-2 print:hidden">
									<Printer className="h-5 w-5" />
									{language === 'bm' ? 'Laporan' : 'Export'}
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[425px]">
								<DialogHeader>
									<DialogTitle>{language === 'bm' ? 'Jana Laporan Prestasi' : 'Generate Performance Report'}</DialogTitle>
									<DialogDescription>
										{language === 'bm'
											? 'Pilih bahagian yang ingin disertakan dalam laporan PDF anda.'
											: 'Select sections to include in your PDF report.'}
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="performance"
											checked={reportConfig.includePerformance}
											onCheckedChange={(checked) => setReportConfig({ ...reportConfig, includePerformance: checked })}
										/>
										<Label htmlFor="performance">{language === 'bm' ? 'Prestasi Kursus' : 'Course Performance'}</Label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="progress"
											checked={reportConfig.includeProgress}
											onCheckedChange={(checked) => setReportConfig({ ...reportConfig, includeProgress: checked })}
										/>
										<Label htmlFor="progress">{language === 'bm' ? 'Kemajuan Kursus' : 'Course Progress'}</Label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="trend"
											checked={reportConfig.includeTrend}
											onCheckedChange={(checked) => setReportConfig({ ...reportConfig, includeTrend: checked })}
										/>
										<Label htmlFor="trend">{language === 'bm' ? 'Trend Penilaian' : 'Score Trend'}</Label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="strong"
											checked={reportConfig.includeStrong}
											onCheckedChange={(checked) => setReportConfig({ ...reportConfig, includeStrong: checked })}
										/>
										<Label htmlFor="strong">{language === 'bm' ? 'Topik Kuat' : 'Strong Topics'}</Label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="risk"
											checked={reportConfig.includeRisk}
											onCheckedChange={(checked) => setReportConfig({ ...reportConfig, includeRisk: checked })}
										/>
										<Label htmlFor="risk">{language === 'bm' ? 'Penunjuk Risiko' : 'Risk Indicators'}</Label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="details"
											checked={reportConfig.includeDetails}
											onCheckedChange={(checked) => setReportConfig({ ...reportConfig, includeDetails: checked })}
										/>
										<Label htmlFor="details">{language === 'bm' ? 'Butiran Kursus' : 'Course Details'}</Label>
									</div>
								</div>
								<DialogFooter>
									<Button onClick={handlePrint} className="gap-2">
										<Download className="h-4 w-4" />
										{language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					) : (
						<Button
							variant="outline"
							className="gap-2 print:hidden"
							onClick={() => {
								setIsPrinting(true);
								setTimeout(() => {
									window.print();
									setIsPrinting(false);
								}, 500);
							}}
						>
							<Printer className="h-5 w-5" />
							{language === 'bm' ? 'Laporan' : 'Export'}
						</Button>
					)}
				</div>
			</div>

			{/* US011-05: Detail View Header (Back Button) */}
			{/* US011-05: Detail View Header (Back Button) */}


			{/* Print Styles */}
			<style jsx global>{`
				@media print {
					@page { margin: 20mm; }
					body { background: white; }
					.print\\:hidden { display: none !important; }
					.print\\:visible { display: block !important; }
					nav, header, footer { display: none !important; }
					.card { break-inside: avoid; border: 1px solid #ddd; box-shadow: none; }
				}
				.print\\:visible { display: none; }
			`}</style>

			{/* Summary Cards */}
			{/* Summary Cards */}
			{courseProgress.length > 0 && (
				<div className={currentView !== 'hub' && !isPrinting ? 'print:hidden' : 'mb-16'}>
					{currentView === 'hub' && (
						<div className="grid gap-6 md:grid-cols-3">
							<Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
								<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
									<BookOpen className="w-24 h-24" />
								</div>
								<CardContent className="pt-6 relative z-10">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-blue-100 font-medium text-sm">
												{language === 'bm' ? 'Kursus yang Didaftarkan' : 'Enrolled Courses'}
											</p>
											<p className="text-4xl font-bold mt-2">{courseProgress.length}</p>
										</div>
										<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
											<BookOpen className="h-[34px] w-[34px] text-white" />
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
								<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
									<CheckCircle2 className="w-24 h-24" />
								</div>
								<CardContent className="pt-6 relative z-10">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-emerald-100 font-medium text-sm">
												{language === 'bm' ? 'Pelajaran Selesai' : 'Completed Lessons'}
											</p>
											<p className="text-4xl font-bold mt-2">
												{courseProgress.reduce((sum, course) => sum + course.completedLessons, 0)}
											</p>
										</div>
										<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
											<CheckCircle2 className="h-[34px] w-[34px] text-white" />
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-none shadow-md bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative">
								<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
									<ClipboardCheck className="w-24 h-24" />
								</div>
								<CardContent className="pt-6 relative z-10">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-violet-100 font-medium text-sm">
												{language === 'bm' ? 'Penilaian Selesai' : 'Assessments Completed'}
											</p>
											<p className="text-4xl font-bold mt-2">
												{courseProgress.reduce((sum, course) => sum + course.assessments.length, 0)}
											</p>
										</div>
										<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
											<ClipboardCheck className="h-[34px] w-[34px] text-white" />
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)}

					{/* US011-05: Achievements Section */}
					{currentView === 'hub' && achievements.length > 0 && (
						<div className="my-16">
							<div className="flex items-center gap-4 mb-4">
								<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
									{language === 'bm' ? 'Pencapaian Saya' : 'My Achievements'}
									<Award className="h-6 w-6 text-amber-500" />
								</h2>
								<div className="h-px bg-neutral-200 flex-1" />
							</div>
							<div className="grid gap-4 md:grid-cols-3">
								{achievements.map((badge) => (
									<Card key={badge.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden relative">
										<div className={`absolute top-0 right-0 p-3 opacity-10 transform translate-x-2 -translate-y-2 ${badge.color.replace('text-', 'bg-').replace('bg-', 'text-')}`}>
											<badge.icon className="w-16 h-16" />
										</div>
										<CardContent className="p-5 relative z-10 flex items-start gap-4">
											<div className={`p-3 rounded-xl ${badge.color} bg-opacity-20`}>
												<badge.icon className={`h-6 w-6 ${badge.color.split(' ')[0]}`} />
											</div>
											<div>
												<h3 className="font-bold text-neutralDark">{badge.title}</h3>
												<p className="text-xs text-muted-foreground mt-1 mb-2">{badge.description}</p>
												{badge.date && (
													<span className="text-[10px] bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-500">
														{badge.date instanceof Date ? badge.date.toLocaleDateString() : 'Earned'}
													</span>
												)}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}


					{/* US011-05: Dashboard Hub Grid */}
					{currentView === 'hub' && (
						<div className="mt-16">
							<div className="flex items-center gap-4 mb-6">
								<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
									{language === 'bm' ? 'Papan Pemuka Kemajuan' : 'Progress Dashboard'}
									<LayoutDashboard className="h-6 w-6 text-primary" />
								</h2>
								<div className="h-px bg-neutral-200 flex-1" />
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
								<Link href="/weak-areas" className="col-span-1">
									<DashboardBlock
										title={language === 'bm' ? 'Bidang Lemah' : 'Weak Learning Areas'}
										description={language === 'bm' ? 'Kenal pasti dan perbaiki topik yang sukar' : 'Identify and improve upon challenging topics'}
										icon={TrendingDown}
										colorClass="text-error"
									/>
								</Link>
								<DashboardBlock
									title={language === 'bm' ? 'Prestasi Kursus' : 'Course Performance'}
									description={language === 'bm' ? 'Analisis skor penilaian merentas semua kursus' : 'Analyze assessment scores across all courses'}
									icon={Target}
									colorClass="text-blue-500"
									onClick={() => setCurrentView('performance')}
								/>
								<DashboardBlock
									title={language === 'bm' ? 'Kemajuan Kursus' : 'Course Progress'}
									description={language === 'bm' ? 'Jejak peratusan siap pelajaran' : 'Track completion rates for your lessons'}
									icon={Activity}
									colorClass="text-emerald-500"
									onClick={() => setCurrentView('progress')}
								/>
								<DashboardBlock
									title={language === 'bm' ? 'Trend Penilaian' : 'Score Trend'}
									description={language === 'bm' ? 'Lihat peningkatan skor dari semasa ke semasa' : 'View your score improvements over time'}
									icon={TrendingUp}
									colorClass="text-indigo-500"
									onClick={() => setCurrentView('trend')}
								/>
								<DashboardBlock
									title={language === 'bm' ? 'Topik Kuat' : 'Strong Topics'}
									description={language === 'bm' ? 'Raikan bidang yang anda kuasai' : 'Celebrate the areas where you excel'}
									icon={Award}
									colorClass="text-amber-500"
									onClick={() => setCurrentView('strong')}
								/>
								<DashboardBlock
									title={language === 'bm' ? 'Penunjuk Risiko' : 'Risk Indicators'}
									description={language === 'bm' ? 'Amaran awal untuk memastikan anda di landasan' : 'Early warnings to keep you on track'}
									icon={AlertTriangle}
									colorClass="text-orange-500"
									onClick={() => setCurrentView('risk')}
								/>
								<DashboardBlock
									title={language === 'bm' ? 'Butiran Kursus' : 'Course Details'}
									description={language === 'bm' ? 'Lihat senarai lengkap kursus dan tugasan' : 'View detailed breakdowns of all your enrolled courses'}
									icon={FileText}
									colorClass="text-neutral-500"
									onClick={() => setCurrentView('details')}
								/>
							</div>
						</div>
					)}

					{/* US011-05: Conditional Sections based on currentView */}





					{/* Conditional: Course Performance */}
					{(currentView === 'performance' || (currentView === 'hub' && reportConfig.includePerformance)) && (
						<div className={currentView !== 'performance' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
							<Card className="shadow-sm border-neutral-200">
								<CardHeader>
									<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
										<Target className="h-5 w-5 text-primary" />
										{language === 'bm' ? 'Prestasi Kursus' : 'Course Performance'}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<BarChart
										className="h-72"
										data={courseProgress
											.slice()
											.sort((a, b) => new Date(a.enrolledAt) - new Date(b.enrolledAt))
											.map(c => ({
												name: c.courseTitle,
												[c.courseTitle]: c.avgAssessmentScore || 0
											}))
										}
										index="name"
										categories={courseProgress
											.slice()
											.sort((a, b) => new Date(a.enrolledAt) - new Date(b.enrolledAt))
											.map(c => c.courseTitle)
										}
										colors={['blue', 'emerald', 'violet', 'amber', 'cyan', 'rose']}
										valueFormatter={(number) => `${number}%`}
										yAxisWidth={48}
										showLegend={false}
										showAnimation={!isPrinting}
									/>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Conditional: Course Progress */}
					{/* Conditional: Course Progress */}
					{(currentView === 'progress' || (currentView === 'hub' && reportConfig.includeProgress)) && (
						<div className={currentView !== 'progress' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
							<Card className="shadow-sm border-neutral-200">
								<CardHeader>
									<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
										<Activity className="h-5 w-5 text-emerald-500" />
										{language === 'bm' ? 'Kemajuan Kursus' : 'Course Progress'}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<BarChart
										className="h-72"
										data={courseProgress
											.slice()
											.sort((a, b) => new Date(a.enrolledAt) - new Date(b.enrolledAt))
											.map(c => ({
												name: c.courseTitle,
												[language === 'bm' ? 'Kemajuan' : 'Progress']: c.overallProgress || 0
											}))
										}
										index="name"
										categories={[language === 'bm' ? 'Kemajuan' : 'Progress']}
										colors={['emerald']}
										valueFormatter={(number) => `${number}%`}
										yAxisWidth={48}
										showLegend={false}
										showAnimation={!isPrinting}
									/>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Old Charts Section (Commented out/Refactored above) */}
					{/* 
					<div className={`flex flex-col gap-6 ${!reportConfig.includeCharts ? 'print:hidden' : ''}`}>
						...
					</div> 
					*/}

					{/* Score Trend */}
					{(currentView === 'trend' || (currentView === 'hub' && reportConfig.includeTrend)) && scoreTrend.length > 0 && (
						<div className={currentView !== 'trend' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
							<Card className="shadow-sm border-neutral-200">
								<CardHeader>
									<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
										<TrendingUp className="h-5 w-5 text-indigo-500" />
										{language === 'bm' ? 'Trend Prestasi Penilaian' : 'Assessment Score Trend'}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<LineChart
										className="h-72"
										data={scoreTrend}
										index="date"
										categories={['score']}
										colors={['indigo']}
										valueFormatter={(number) => `${number}%`}
										yAxisWidth={48}
										showLegend={false}
										showAnimation={!isPrinting}
									/>
								</CardContent>
							</Card>
						</div>
					)}
				</div>
			)}

			{/* US011-01: Strong Topics Section */}
			{(currentView === 'strong' || (currentView === 'hub' && reportConfig.includeStrong)) && strongTopics.length > 0 && (
				<div className={currentView !== 'strong' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
					<div className={`mt-8 mb-4`}>
						<h2 className="text-h2 text-neutralDark flex items-center gap-2 mb-4">
							<TrendingUp className="h-6 w-6 text-emerald-500" />
							{language === 'bm' ? 'Topik Pembelajaran Kuat' : 'Strong Learning Topics'}
						</h2>
						<div className="flex flex-col gap-4">
							{strongTopics.map((topic) => (
								<Card key={topic.id} className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
									<CardHeader className="pb-2">
										<div className="flex items-start justify-between gap-2">
											<CardTitle className="text-lg font-bold text-neutralDark line-clamp-1">
												{topic.title}
											</CardTitle>
											<span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide flex-shrink-0">
												{language === 'bm' ? 'Cemerlang' : 'Excellent'}
											</span>
										</div>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-neutralDark mb-2">
											{language === 'bm' ? 'Skor purata penilaian:' : 'Average assessment score:'} <strong>{topic.score}%</strong>
										</p>
										<p className="text-xs text-muted-foreground">
											{language === 'bm' ? 'Teruskan usaha cemerlang ini!' : 'Keep up the excellent work! You show strong understanding in this area.'}
										</p>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Risk Indicators Section */}
			{courseProgress.length > 0 && Object.keys(riskIndicators).length === 0 && !loading && (
				<Card className="border-info/20 bg-info/5 shadow-sm">
					<CardContent className="py-8 text-center">
						<div className="mx-auto w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
							<Info className="h-6 w-6 text-info" />
						</div>
						<p className="text-body text-muted-foreground max-w-lg mx-auto">
							{language === 'bm'
								? 'Data tidak mencukupi untuk menilai risiko pembelajaran. Selesaikan lebih banyak pelajaran dan penilaian untuk melihat penunjuk risiko anda.'
								: 'Insufficient data to assess learning risk. Complete more lessons and assessments to see your risk indicators.'}
						</p>
					</CardContent>
				</Card>
			)}
			{(currentView === 'risk' || (currentView === 'hub' && reportConfig.includeRisk)) && Object.keys(riskIndicators).length > 0 && (
				<div className={currentView !== 'risk' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
					<div className={`space-y-4`}>
						<h2 className="text-h2 text-neutralDark flex items-center gap-2 mt-8 mb-4">
							<AlertTriangle className="h-6 w-6 text-warning" />
							{language === 'bm' ? 'Penunjuk Risiko Pembelajaran' : 'Learning Risk Indicators'}
						</h2>
						<div className="flex flex-col gap-4">
							{Object.entries(riskIndicators).map(([courseId, risk]) => {
								const course = courseProgress.find(c => c.courseId === courseId);
								if (!course) return null;

								return (
									<Card key={courseId} className={`shadow-sm border-l-4 ${risk.riskLevel === 'high' ? 'border-l-destructive' : risk.riskLevel === 'medium' ? 'border-l-warning' : 'border-l-success'}`}>
										<CardHeader className="pb-2">
											<div className="flex items-start justify-between gap-2">
												<CardTitle className="text-lg font-bold text-neutralDark">
													{course.courseTitle}
												</CardTitle>
												<span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${risk.riskLevel === 'high' ? 'bg-destructive/10 text-destructive' : risk.riskLevel === 'medium' ? 'bg-warning/10 text-warning-dark' : 'bg-success/10 text-success'}`}>
													{risk.riskLevel === 'high' ? (language === 'bm' ? 'Risiko Tinggi' : 'High Risk') :
														risk.riskLevel === 'medium' ? (language === 'bm' ? 'Risiko Sederhana' : 'Medium Risk') :
															(language === 'bm' ? 'Sihat' : 'Healthy')}
												</span>
											</div>
										</CardHeader>
										<CardContent>
											{risk.riskReasons.length > 0 ? (
												<ul className="space-y-1 mb-3">
													{risk.riskReasons.map((reason, idx) => (
														<li key={idx} className="text-sm text-neutralDark flex items-start gap-2">
															<span className="text-destructive mt-0.5">•</span>
															{reason}
														</li>
													))}
												</ul>
											) : (
												<p className="text-sm text-muted-foreground mb-3">
													{language === 'bm' ? 'Tiada faktor risiko dikesan.' : 'No risk factors detected.'}
												</p>
											)}

											{risk.recommendations.length > 0 && (
												<div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
													<p className="text-xs font-semibold text-neutralDark mb-2 flex items-center gap-1.5 align-middle">
														<Lightbulb className="h-3.5 w-3.5 text-amber-500" />
														{language === 'bm' ? 'Cadangan:' : 'Recommended Action:'}
													</p>
													<ul className="space-y-1">
														{risk.recommendations.map((rec, idx) => (
															<li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
																<span>-</span>
																{rec}
															</li>
														))}
													</ul>
												</div>
											)}

											{/* Key Metrics Mini Grid */}
											<div className="grid grid-cols-3 gap-1 pt-3 border-t">
												<div className="text-center p-1">
													<p className="text-xs text-muted-foreground uppercase">
														{language === 'bm' ? 'Skor' : 'Score'}
													</p>
													<p className="font-bold text-neutralDark">{Math.round(risk.avgScore)}%</p>
												</div>
												<div className="text-center p-1 border-l">
													<p className="text-[10px] text-muted-foreground uppercase">
														{language === 'bm' ? 'Siap' : 'Done'}
													</p>
													<p className="font-bold text-neutralDark">{Math.round(risk.completionRate)}%</p>
												</div>
												<div className="text-center p-1 border-l">
													<p className="text-[10px] text-muted-foreground uppercase">
														{language === 'bm' ? 'Pasif' : 'Idle'}
													</p>
													<p className="font-bold text-neutralDark">{risk.daysSinceActivity}d</p>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Course Progress List */}
			{(currentView === 'details' || (currentView === 'hub' && reportConfig.includeDetails)) && (
				courseProgress.length === 0 ? (
					<Card className="border-dashed border-2">
						<CardContent className="py-12 text-center">
							<div className="mx-auto w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
								<BookOpen className="h-8 w-8 text-muted-foreground/50" />
							</div>
							<h3 className="text-lg font-semibold text-neutralDark mb-1">
								{language === 'bm' ? 'Tiada Kursus' : 'No Courses Found'}
							</h3>
							<p className="text-body text-muted-foreground mb-6">
								{language === 'bm'
									? 'Anda belum mendaftar dalam sebarang kursus lagi.'
									: "You haven't enrolled in any courses yet."}
							</p>
							<Link href="/courses/explore">
								<Button>{language === 'bm' ? 'Terokai Kursus' : 'Explore Courses'}</Button>
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className={currentView !== 'details' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid mt-8' : 'space-y-8 mt-8'}>
						<h2 className="text-h2 text-neutralDark">
							{language === 'bm' ? 'Butiran Kursus' : 'Course Details'}
						</h2>
						{courseProgress.map((course) => (
							<Card key={course.courseId} className="overflow-hidden border-neutral-200 shadow-sm hover:shadow-md transition-shadow mb-8 break-inside-avoid">
								<div className="border-b border-neutral-100 bg-neutral-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
									<div>
										<div className="flex items-center gap-3 mb-1">
											<h3 className="text-xl font-bold text-neutralDark">{course.courseTitle}</h3>
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
												{course.overallProgress}% {language === 'bm' ? 'Siap' : 'Done'}
											</span>
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<div className="flex items-center gap-1.5">
												<Calendar className="h-4 w-4" />
												{language === 'bm' ? 'Didaftarkan:' : 'Enrolled:'} {formatDate(course.enrolledAt)}
											</div>
										</div>
									</div>
									<Link href={`/courses/${course.courseId}`} className="print:hidden">
										<Button variant="outline" size="sm" className="gap-2">
											{language === 'bm' ? 'Teruskan Belajar' : 'Continue Learning'}
											<BookOpen className="h-4 w-4" />
										</Button>
									</Link>
								</div>

								<CardContent className="p-6 space-y-8">
									{/* Overall Progress Bar */}
									<div>
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium text-neutralDark">
												{language === 'bm' ? 'Kemajuan Keseluruhan' : 'Overall Progress'}
											</span>
										</div>
										<div className="w-full bg-neutral-100 rounded-full h-2.5">
											<div
												className="bg-primary rounded-full h-2.5 transition-all duration-500 ease-out print:force-color"
												style={{ width: `${course.overallProgress}%` }}
											/>
										</div>
									</div>

									{/* Progress Metrics Grid */}
									<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
										<div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
											<div className="flex items-center gap-2 mb-2">
												<div className="p-1.5 bg-blue-100 rounded-lg">
													<BookOpen className="h-4 w-4 text-blue-600" />
												</div>
												<span className="text-sm font-semibold text-blue-900">
													{language === 'bm' ? 'Pelajaran' : 'Lessons'}
												</span>
											</div>
											<p className="text-2xl font-bold text-neutralDark">
												{course.completedLessons} <span className="text-sm text-muted-foreground font-normal">/ {course.totalLessons}</span>
											</p>
										</div>
										<div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
											<div className="flex items-center gap-2 mb-2">
												<div className="p-1.5 bg-emerald-100 rounded-lg">
													<CheckCircle2 className="h-4 w-4 text-emerald-600" />
												</div>
												<span className="text-sm font-semibold text-emerald-900">
													{language === 'bm' ? 'Modul' : 'Modules'}
												</span>
											</div>
											<p className="text-2xl font-bold text-neutralDark">
												{course.completedModules} <span className="text-sm text-muted-foreground font-normal">/ {course.totalModules}</span>
											</p>
										</div>
										<div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100">
											<div className="flex items-center gap-2 mb-2">
												<div className="p-1.5 bg-violet-100 rounded-lg">
													<ClipboardCheck className="h-4 w-4 text-violet-600" />
												</div>
												<span className="text-sm font-semibold text-violet-900">
													{language === 'bm' ? 'Penilaian' : 'Assessments'}
												</span>
											</div>
											<p className="text-2xl font-bold text-neutralDark">
												{course.assessments.length} <span className="text-sm text-muted-foreground font-normal">{language === 'bm' ? 'selesai' : 'done'}</span>
											</p>
										</div>
										<div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
											<div className="flex items-center gap-2 mb-2">
												<div className="p-1.5 bg-orange-100 rounded-lg">
													<Target className="h-4 w-4 text-orange-600" />
												</div>
												<span className="text-sm font-semibold text-orange-900">
													{language === 'bm' ? 'Skor Purata' : 'Avg Score'}
												</span>
											</div>
											<p className="text-2xl font-bold text-neutralDark">
												{course.avgAssessmentScore !== null ? `${course.avgAssessmentScore}%` : '-'}
											</p>
										</div>
									</div>

									<div className="grid md:grid-cols-2 gap-8">
										{/* Assessment Scores */}
										{course.assessments.length > 0 && (
											<div>
												<h3 className="text-sm font-bold text-neutralDark mb-4 flex items-center gap-2 uppercase tracking-wider">
													<ClipboardCheck className="h-4 w-4 text-primary" />
													{language === 'bm' ? 'Sejarah Penilaian' : 'Assessment History'}
												</h3>
												<div className="space-y-3">
													{course.assessments.slice(0, 5).map((submission, idx) => (
														<div
															key={idx}
															className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-primary/20 transition-colors"
														>
															<div className="min-w-0 flex-1 pr-4">
																<p className="text-sm font-medium text-neutralDark truncate">{submission.assessmentTitle}</p>
																<p className="text-[10px] text-muted-foreground">
																	{formatDateTime(submission.submittedAt)}
																</p>
															</div>
															<div className="text-right flex-shrink-0">
																{submission.score !== undefined && submission.totalPoints ? (
																	<div className="flex flex-col items-end">
																		<span className="text-sm font-bold text-neutralDark">
																			{submission.score}/{submission.totalPoints}
																		</span>
																		<span className={`text-[10px] font-medium px-1.5 rounded ${(submission.score / submission.totalPoints) >= 0.7
																			? 'bg-green-100 text-green-700'
																			: 'bg-yellow-100 text-yellow-700'
																			}`}>
																			{Math.round((submission.score / submission.totalPoints) * 100)}%
																		</span>
																	</div>
																) : (
																	<span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded">
																		{language === 'bm' ? 'Dinilai' : 'Grading'}
																	</span>
																)}
															</div>
														</div>
													))}
													{course.assessments.length > 5 && (
														<p className="text-xs text-center text-muted-foreground pt-2">
															+{course.assessments.length - 5} {language === 'bm' ? 'lagi' : 'more'}...
														</p>
													)}
												</div>
											</div>
										)}

										{/* Assignment Grades */}
										{course.assignments.length > 0 && (
											<div>
												<h3 className="text-sm font-bold text-neutralDark mb-4 flex items-center gap-2 uppercase tracking-wider">
													<FileText className="h-4 w-4 text-secondary" />
													{language === 'bm' ? 'Sejarah Tugasan' : 'Assignment History'}
												</h3>
												<div className="space-y-3">
													{course.assignments.slice(0, 5).map((submission, idx) => (
														<div
															key={idx}
															className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-secondary/20 transition-colors"
														>
															<div className="min-w-0 flex-1 pr-4">
																<p className="text-sm font-medium text-neutralDark truncate">{submission.assignmentTitle}</p>
																<p className="text-[10px] text-muted-foreground">
																	{formatDateTime(submission.submittedAt)}
																</p>
															</div>
															<div className="text-right flex-shrink-0">
																{submission.grade !== undefined ? (
																	<div className="flex flex-col items-end">
																		<span className="text-sm font-bold text-neutralDark">
																			{submission.grade}%
																		</span>
																	</div>
																) : (
																	<span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded">
																		{language === 'bm' ? 'Menunggu' : 'Pending'}
																	</span>
																)}
															</div>
														</div>
													))}
													{course.assignments.length > 5 && (
														<p className="text-xs text-center text-muted-foreground pt-2">
															+{course.assignments.length - 5} {language === 'bm' ? 'lagi' : 'more'}...
														</p>
													)}
												</div>
											</div>
										)}

										{course.assessments.length === 0 && course.assignments.length === 0 && (
											<div className="col-span-full py-8 text-center text-muted-foreground bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
												<p className="text-sm">
													{language === 'bm'
														? 'Tiada aktiviti penilaian atau tugasan direkodkan lagi.'
														: 'No assessments or assignments recorded yet.'}
												</p>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)
			)
			}
			{/* US011-03: Report Specific Sections (Hidden on screen, visible on print) */}
			{
				reportConfig.includeAttendance && (
					<div className="print:visible mt-8" style={{ display: 'none' }}>
						<h2 className="text-xl font-bold text-neutralDark mb-4 border-b pb-2">
							{language === 'bm' ? 'Rekod Kehadiran' : 'Attendance Records'}
						</h2>
						<div className="bg-white border rounded-lg overflow-hidden">
							<table className="w-full text-sm">
								<thead className="bg-neutral-100">
									<tr>
										<th className="p-3 text-left font-semibold">{language === 'bm' ? 'Kursus' : 'Course'}</th>
										<th className="p-3 text-center font-semibold">{language === 'bm' ? 'Kehadiran' : 'Attendance'}</th>
										<th className="p-3 text-center font-semibold">{language === 'bm' ? 'Status' : 'Status'}</th>
									</tr>
								</thead>
								<tbody>
									{courseProgress.map((course, idx) => (
										<tr key={idx} className="border-t">
											<td className="p-3">{course.courseTitle}</td>
											<td className="p-3 text-center">95%</td>
											<td className="p-3 text-center text-green-600 font-medium">
												{language === 'bm' ? 'Hadir' : 'Present'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<p className="p-3 text-xs text-muted-foreground italic">
								* {language === 'bm' ? 'Data kehadiran dijana secara automatik berdasarkan log masuk sistem.' : 'Attendance data generated automatically based on system logins.'}
							</p>
						</div>
					</div>
				)
			}

			{
				reportConfig.includeFeedback && (
					<div className="print:visible mt-8" style={{ display: 'none' }}>
						<h2 className="text-xl font-bold text-neutralDark mb-4 border-b pb-2">
							{language === 'bm' ? 'Maklum Balas Guru' : 'Teacher Feedback'}
						</h2>
						<div className="space-y-4">
							{courseProgress.map((course, idx) => (
								<div key={idx} className="bg-white border rounded-lg p-4">
									<h3 className="font-bold text-neutralDark mb-2">{course.courseTitle}</h3>
									<div className="flex gap-4 items-start">
										<div className="bg-neutral-100 p-2 rounded-full">
											<FileText className="h-5 w-5 text-neutral-500" />
										</div>
										<div>
											<p className="text-sm text-neutralDark mb-1">
												{idx === 0
													? (language === 'bm' ? 'Pelajar menunjukkan prestasi yang sangat baik. Teruskan usaha!' : 'Student shows excellent performance. Keep up the good work!')
													: (language === 'bm' ? 'Terdapat peningkatan yang ketara dalam tugasan terakhir.' : 'Significant improvement shown in recent assignments.')}
											</p>
											<p className="text-xs text-muted-foreground">
												- {language === 'bm' ? 'Dihantar oleh Cikgu' : 'Posted by Teacher'} • {new Date().toLocaleDateString()}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)
			}
		</div >
	);
}

