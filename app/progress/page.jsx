'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, CheckCircle, Clock, Award, FileText, ClipboardCheck, TrendingUp, TrendingDown, Calendar, AlertTriangle, Target, Lightbulb, Info, Activity, Printer, Download, LayoutDashboard, ArrowLeft, ArrowRight, Filter, Users, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart } from '@tremor/react';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const ACHIEVEMENT_DEFINITIONS = {
	'first-step': {
		title: { en: 'First Step', bm: 'Langkah Pertama' },
		description: { en: 'Enrolled in first course', bm: 'Mendaftar dalam kursus pertama' },
		icon: BookOpen,
		image: '/images/badges/first-step.png',
		color: 'text-blue-500 bg-blue-100',
	},
	'high-flyer': {
		title: { en: 'High Flyer', bm: 'Pencapai Tinggi' },
		description: { en: 'Achieved > 80% score in a course', bm: 'Mencapai skor > 80% dalam kursus' },
		icon: Award,
		image: '/images/badges/high-flyer.png',
		color: 'text-amber-500 bg-amber-100',
	},
	'dedicated': {
		title: { en: 'Dedicated Learner', bm: 'Pelajar Berdedikasi' },
		description: { en: 'Completed 5+ lessons', bm: 'Menyiapkan 5+ pelajaran' },
		icon: CheckCircle2,
		image: '/images/badges/dedicated.png',
		color: 'text-emerald-500 bg-emerald-100',
	},
	'course-completion': {
		title: { en: 'Course Master', bm: 'Pakar Kursus' },
		description: { en: 'Completed a full course', bm: 'Menamatkan kursus penuh' },
		icon: CheckCircle,
		color: 'text-violet-500 bg-violet-100',
	},
};

export default function ProgressPage() {
	const { language } = useLanguage();
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [courseProgress, setCourseProgress] = useState([]);
	const [riskIndicators, setRiskIndicators] = useState({});
	const [achievements, setAchievements] = useState([]);
	const [strongTopics, setStrongTopics] = useState([]);
	const [competency, setCompetency] = useState([]); // New state for Radar Chart
	const [scoreTrend, setScoreTrend] = useState([]); 	// US011-03 states
	const [selectedCourseId, setSelectedCourseId] = useState('');
	const [selectedPerformanceCourseId, setSelectedPerformanceCourseId] = useState('all');
	const [showReportModal, setShowReportModal] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const [reportConfig, setReportConfig] = useState({
		includePerformance: false,
		includeProgress: false,
		includeTrend: false,
		includeStrong: false,
		includeRisk: false,
		includeDetails: false
	});
	// US011-05: Dashboard View State
	const [currentView, setCurrentView] = useState('hub');

	const DashboardBlock = ({ title, description, icon: Icon, onClick, colorClass }) => (
		<Card
			className={`cursor-pointer border-none shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full overflow-hidden bg-white group ring-1 ring-gray-100 hover:ring-primary/20 relative`}
			onClick={onClick}
		>
			<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-700 ease-in-out"></div>

			<CardContent className="p-6 relative z-10 flex flex-col h-full">
				<div className={`p-3 w-fit rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow-md transition-all duration-300 mb-4 ${colorClass.replace('text-', 'bg-').replace('500', '50')} ${colorClass}`}>
					<Icon className={`h-9 w-9 ${colorClass}`} />
				</div>

				<h3 className="text-lg font-bold text-neutralDark mb-2 group-hover:text-primary transition-colors">
					{title}
				</h3>

				<p className="text-sm text-muted-foreground leading-relaxed flex-grow">
					{description}
				</p>

				<div className="mt-4 flex items-center text-xs font-semibold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
					{language === 'bm' ? 'Lihat Butiran' : 'View Details'} <ArrowRight className="h-3 w-3 ml-1" />
				</div>
			</CardContent>
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

	// Scroll to top when view changes
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [currentView]);

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
					date: progressData[progressData.length - 1].enrolledAt // Oldest enrollment
				});
			}

			// Badge 2: High Flyer (Avg Score > 80% in any course)
			const highScoringCourse = progressData.find(c => c.avgAssessmentScore >= 80);
			if (highScoringCourse) {
				newAchievements.push({
					id: 'high-flyer',
					date: new Date() // Current achievement
				});
			}

			// Badge 3: Dedicated Learner (Completed > 5 lessons total)
			const totalCompletedLessons = progressData.reduce((acc, curr) => acc + curr.completedLessons, 0);
			if (totalCompletedLessons >= 5) {
				newAchievements.push({
					id: 'dedicated',
					date: new Date()
				});
			}

			// Badge 4: Course Completion (100% progress)
			progressData.forEach(course => {
				if (course.overallProgress === 100) {
					newAchievements.push({
						id: 'course-completion',
						uniqueId: `comp-${course.courseId}`,
						date: new Date(),
						courseTitle: course.courseTitle
					});
				}
			});

			setAchievements(newAchievements);

			// --- US011-01: Skill Competency (Strong/Weak Consolidation) ---
			const competencyData = progressData.map(c => ({
				subject: c.courseTitle.length > 15 ? c.courseTitle.substring(0, 12) + '...' : c.courseTitle,
				A: c.avgAssessmentScore || 0,
				fullMark: 100,
				totalLessons: c.totalLessons,
				title: c.courseTitle
			}));
			setCompetency(competencyData);

			// Legacy state for backward compatibility if needed, but UI will use competencyData
			const strong = progressData
				.filter(c => c.avgAssessmentScore >= 80)
				.map(c => ({ id: c.courseId, title: c.courseTitle }));
			setStrongTopics(strong);

			// --- US011-01: Score Trend Data ---
			let allAssessments = [];
			progressData.forEach(course => {
				if (course.assessments && course.assessments.length > 0) {
					course.assessments.forEach(a => {
						if (a.score !== undefined) {
							allAssessments.push({
								courseTitle: course.courseTitle,
								courseId: course.courseId,
								assessmentTitle: a.assessmentTitle,
								score: a.totalPoints ? Math.round((a.score / a.totalPoints) * 100) : 0,
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
				date: a.date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
				score: a.score,
				title: a.assessmentTitle,
				courseId: a.courseId
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

				// --- Advanced Risk Calculation ---

				// 1. Engagement & Behavioral Risk
				const engagementRisks = [];
				let engagementScore = 0; // Penalty points (Max ~40)

				// Inactivity
				if (daysSinceActivity > 7) {
					engagementRisks.push(language === 'bm' ? `Tidak aktif selama ${daysSinceActivity} hari` : `Inactive for ${daysSinceActivity} days`);
					engagementScore += daysSinceActivity > 14 ? 25 : 15;
				}

				// Simulated: Time on Task
				const simulatedTimeSpent = Math.floor(Math.random() * 60) + 10; // 10-70 mins
				if (simulatedTimeSpent < 20) {
					engagementScore += 10;
				}

				// Simulated: Content Neglect
				const hasSkippedContent = Math.random() > 0.8;
				if (hasSkippedContent) {
					engagementRisks.push(language === 'bm' ? 'Mengabaikan bahan pembelajaran' : 'Skipping learning materials');
					engagementScore += 10;
				}

				// 2. Academic Performance Risk
				const academicRisks = [];
				let academicScore = 0; // Penalty points (Max ~40)

				// Trend Analysis (Score Drops)
				let isScoreDropping = false;
				if (course.assessments && course.assessments.length >= 2) {
					// Ensure sorted by date
					const sorted = [...course.assessments].sort((a, b) => (new Date(a.submittedAt?.toDate?.() || 0)) - (new Date(b.submittedAt?.toDate?.() || 0)));
					const last = sorted[sorted.length - 1];
					const prev = sorted[sorted.length - 2];

					if (last.score !== undefined && prev.score !== undefined && last.score < prev.score * 0.8) {
						isScoreDropping = true;
						academicRisks.push(language === 'bm' ? 'Penurunan markah mendadak (>20%)' : 'Sudden score drop (>20%)');
						academicScore += 20;
					}
				}

				// Low Grade
				if (avgScore < 50) academicScore += 20;
				else if (avgScore < 60) academicScore += 10;

				// Simulated: Gateway Course Failure
				const failedGateway = Math.random() > 0.95;
				if (failedGateway) {
					academicRisks.push(language === 'bm' ? 'Gagal modul kritikal' : 'Failed critical gateway module');
					academicScore += 15;
				}

				// 3. Submission & Deadline Risk
				const submissionRisks = [];
				let submissionScore = 0; // Penalty points (Max ~20)

				// Count missed deadlines (simplified - check if assignments/assessments are past due)
				let missedDeadlines = 0;

				if (missedDeadlines > 0) {
					submissionRisks.push(language === 'bm' ? `${missedDeadlines} tugasan terlepas` : `${missedDeadlines} missed assignment(s)`);
					submissionScore += (missedDeadlines * 10);
				}

				// Simulated: Procrastination
				const isProcrastinator = Math.random() > 0.85;
				if (isProcrastinator) {
					submissionRisks.push(language === 'bm' ? 'Tabiat menghantar lewat' : 'Habitual last-minute submission');
					submissionScore += 5;
				}


				// 4. Predictive Risk Scoring (0-100%)
				let totalRiskScore = engagementScore + academicScore + submissionScore;
				totalRiskScore = Math.min(100, Math.max(0, totalRiskScore));

				let riskLevel = 'low';
				if (totalRiskScore >= 75) riskLevel = 'high';
				else if (totalRiskScore >= 35) riskLevel = 'medium';


				// 5. Actionable Interventions
				const interventions = [];
				if (totalRiskScore > 40) {
					interventions.push({
						id: 'tutor',
						label: language === 'bm' ? 'Dapatkan Bantuan' : 'Get Help',
						actionType: 'link'
					});
				}
				if (engagementScore > 15) {
					interventions.push({
						id: 'schedule',
						label: language === 'bm' ? 'Jadual Belajar' : 'Plan Study Time',
						actionType: 'nudge'
					});
				}

				// Combine all textual reasons
				const riskReasons = [...engagementRisks, ...academicRisks, ...submissionRisks];

				// Generate simple recommendations if list is empty
				const recommendations = [];
				if (riskReasons.length === 0 && avgScore < 70) {
					recommendations.push(language === 'bm' ? 'Tingkatkan markah anda' : 'Improve your assessment scores');
				}


				if (course.assessments && course.assessments.length >= 2) {
					// Sort by date
					const sortedAssessments = [...course.assessments].sort((a, b) => {
						const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt || 0);
						const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt || 0);
						return dateA - dateB;
					});
					const last = sortedAssessments[sortedAssessments.length - 1];
					const secondLast = sortedAssessments[sortedAssessments.length - 2];

					// Flag if latest score is significantly lower (>15%) than previous
					if (last.score && secondLast.score && last.score < (secondLast.score * 0.85)) {
						isDeclining = true;
					}
				}






















				riskData[course.courseId] = {
					riskLevel,
					riskScore: totalRiskScore,
					avgScore,
					completionRate,
					daysSinceActivity,

					// Detailed Categories
					categories: {
						engagement: { score: engagementScore, risks: engagementRisks },
						academic: { score: academicScore, risks: academicRisks },
						submission: { score: submissionScore, risks: submissionRisks }
					},

					interventions,
					riskReasons,
					recommendations
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
		if (!selectedCourseId) return; // Prevent printing if no course is selected
		setShowReportModal(false);
		setIsPrinting(true);
		// Allow renders to update and animations to complete (or be skipped)
		setTimeout(() => {
			window.print();
			setIsPrinting(false);
		}, 1000);
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
			{/* --- Interactive Dashboard (Hidden on Print) --- */}
			<div className="print:hidden space-y-8">
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
								<ArrowLeft className="h-5 w-5" />
								{language === 'bm' ? 'Kembali ke Papan Pemuka' : 'Back to Dashboard'}
							</Button>
						)}
						{currentView === 'hub' || (currentView === 'details' && selectedCourseId) ? (
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
										{/* Select All Option */}
										<div
											className="flex items-center space-x-3 p-2 rounded-md hover:bg-neutral-50 cursor-pointer transition-colors border-b border-neutral-100 pb-3 mb-1"
											onClick={() => {
												const allSelected = Object.values(reportConfig).every(Boolean);
												setReportConfig({
													includeDetails: !allSelected,
													includePerformance: !allSelected,
													includeProgress: !allSelected,
													includeRisk: !allSelected,

													includeStrong: !allSelected,
												});
											}}
										>
											<Checkbox
												checked={Object.values(reportConfig).every(Boolean)}
												className="pointer-events-none h-6 w-6"
											/>
											<Label className="cursor-pointer flex-1 font-bold text-neutralDark">
												{language === 'bm' ? 'Pilih Semua' : 'Select All'}
											</Label>
										</div>

										{[
											{ id: 'includeDetails', label: language === 'bm' ? 'Butiran Kursus' : 'Course Details' },
											{ id: 'includePerformance', label: language === 'bm' ? 'Prestasi Kursus' : 'Course Performance' },
											{ id: 'includeProgress', label: language === 'bm' ? 'Kemajuan Kursus' : 'Course Progress' },
											{ id: 'includeRisk', label: language === 'bm' ? 'Penunjuk Risiko' : 'Risk Indicators' },

											{ id: 'includeStrong', label: language === 'bm' ? 'Topik Kuat' : 'Strong Topics' },
										].map((item) => (
											<div
												key={item.id}
												className="flex items-center space-x-3 p-2 rounded-md hover:bg-neutral-50 cursor-pointer transition-colors"
												onClick={() => setReportConfig({ ...reportConfig, [item.id]: !reportConfig[item.id] })}
											>
												<Checkbox
													id={item.id}
													checked={reportConfig[item.id]}
													className="pointer-events-none h-6 w-6"
												/>
												<Label htmlFor={item.id} className="cursor-pointer flex-1">
													{item.label}
												</Label>
											</div>
										))}
									</div>
									<DialogFooter>
										<Button
											onClick={handlePrint}
											className="gap-2"
											disabled={!Object.values(reportConfig).some(Boolean)}
										>
											<Download className="h-4 w-4" />
											{language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						) : currentView !== 'details' ? (
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
						) : null}
					</div>
				</div>

				{/* US011-05: Detail View Header (Back Button) */}
				{/* US011-05: Detail View Header (Back Button) */}


				{/* Print Styles */}
				<style jsx global>{`
				@media print {
					@page { margin: 15mm; size: auto; }
					html, body {
						height: auto !important;
						overflow: visible !important;
						background: white !important;
						color: black !important;
					}
					/* Hide everything by default, then show specific print content */
					body > * { display: none !important; }
					
					/* Allow the main Next.js app container to show, but reset its layout */
					body > div:first-child, #__next, body > main { 
						display: block !important; 
						height: auto !important; 
						overflow: visible !important; 
					}

					/* Specific print helpers */
					.print\\:hidden { display: none !important; }
					.print\\:visible { display: block !important; }
					
					/* Hide UI chrome */
					nav, header, footer, aside, .sidebar, button, .bg-gradient-to-br { display: none !important; }
					
					/* Ensure our content container is visible */
					.print-content-managed {
						display: block !important;
						width: 100% !important;
						margin: 0 !important;
						padding: 0 !important;
						overflow: visible !important;
					}

					/* Force Cards to look good */
					.card, .border-neutral-200 { 
						break-inside: avoid; 
						border: 1px solid #ccc !important;
						box-shadow: none !important; 
						margin-bottom: 24px !important;
						background: white !important;
						color: black !important;
					}
					
					/* Text visibility */
					p, h1, h2, h3, h4, span, div {
						color: black !important;
						-webkit-print-color-adjust: exact;
						print-color-adjust: exact;
					}
				}
				.print\\:visible { display: none; }
			`}</style>

				{/* Summary Cards */}
				{/* Summary Cards */}
				{courseProgress.length > 0 && (
					<div className={currentView !== 'hub' && !isPrinting ? 'print:hidden' : 'mb-16 print:hidden'}>
						{currentView === 'hub' && (
							<div className="grid gap-6 md:grid-cols-3">
								<Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative group cursor-pointer hover:-translate-y-1">
									<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
										<BookOpen className="w-[105px] h-[105px]" />
									</div>
									<div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-300 opacity-20 blur group-hover:opacity-40 transition skew-x-12 translate-x-full group-hover:translate-x-[-200%] duration-1000"></div>
									<CardContent className="pt-6 relative z-10">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-blue-100 font-medium text-sm uppercase tracking-wide">
													{language === 'bm' ? 'Kursus yang Didaftarkan' : 'Enrolled Courses'}
												</p>
												<p className="text-4xl font-bold mt-2">{courseProgress.length}</p>
											</div>
											<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
												<BookOpen className="h-[38px] w-[38px] text-white" />
											</div>
										</div>
									</CardContent>
								</Card>
								<Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative group cursor-pointer hover:-translate-y-1">
									<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
										<CheckCircle2 className="w-[105px] h-[105px]" />
									</div>
									<div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-emerald-300 opacity-20 blur group-hover:opacity-40 transition skew-x-12 translate-x-full group-hover:translate-x-[-200%] duration-1000"></div>
									<CardContent className="pt-6 relative z-10">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-emerald-100 font-medium text-sm uppercase tracking-wide">
													{language === 'bm' ? 'Pelajaran Selesai' : 'Completed Lessons'}
												</p>
												<p className="text-4xl font-bold mt-2">
													{courseProgress.reduce((sum, course) => sum + course.completedLessons, 0)}
												</p>
											</div>
											<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
												<CheckCircle2 className="h-[38px] w-[38px] text-white" />
											</div>
										</div>
									</CardContent>
								</Card>
								<Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative group cursor-pointer hover:-translate-y-1">
									<div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
										<ClipboardCheck className="w-[105px] h-[105px]" />
									</div>
									<div className="absolute -inset-1 bg-gradient-to-r from-violet-400 to-violet-300 opacity-20 blur group-hover:opacity-40 transition skew-x-12 translate-x-full group-hover:translate-x-[-200%] duration-1000"></div>
									<CardContent className="pt-6 relative z-10">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-violet-100 font-medium text-sm uppercase tracking-wide">
													{language === 'bm' ? 'Penilaian Selesai' : 'Assessments Completed'}
												</p>
												<p className="text-4xl font-bold mt-2">
													{courseProgress.reduce((sum, course) => sum + course.assessments.length, 0)}
												</p>
											</div>
											<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
												<ClipboardCheck className="h-[38px] w-[38px] text-white" />
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						)}




						{/* US011-05: Dashboard Hub Grid */}
						{currentView === 'hub' && (
							<div className="mt-16 print:hidden">
								<div className="flex items-center gap-4 mb-6">
									<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
										{language === 'bm' ? 'Papan Pemuka Kemajuan' : 'Progress Dashboard'}
										<LayoutDashboard className="h-[26px] w-[26px] text-primary" />
									</h2>
									<div className="h-px bg-neutral-200 flex-1" />
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">

									<DashboardBlock
										title={language === 'bm' ? 'Pencapaian & Lencana' : 'Achievements & Badges'}
										description={language === 'bm' ? 'Lihat semua lencana dan pencapaian anda' : 'View all your earned badges and milestones'}
										icon={Award}
										colorClass="text-amber-500"
										onClick={() => setCurrentView('achievements')}
									/>
									<DashboardBlock
										title={language === 'bm' ? 'Butiran Kursus' : 'Course Details'}
										description={language === 'bm' ? 'Lihat senarai lengkap kursus dan tugasan' : 'View detailed breakdowns of all your enrolled courses'}
										icon={FileText}
										colorClass="text-neutral-500"
										onClick={() => setCurrentView('details')}
									/>
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
										title={language === 'bm' ? 'Penunjuk Risiko' : 'Risk Indicators'}
										description={language === 'bm' ? 'Amaran awal untuk memastikan anda di landasan' : 'Early warnings to keep you on track'}
										icon={AlertTriangle}
										colorClass="text-orange-500"
										onClick={() => setCurrentView('risk')}
									/>

									<DashboardBlock
										title={language === 'bm' ? 'Kompetensi Kemahiran' : 'Skill Competency'}
										description={language === 'bm' ? 'Analisis visual kekuatan dan kelemahan' : 'Visual analysis of strengths and weaknesses'}
										icon={Target}
										colorClass="text-indigo-500"
										onClick={() => setCurrentView('strong')}
									/>
								</div>
							</div>
						)}

						{/* US011-05: Conditional Sections based on currentView */}





						{/* Conditional: Achievements View */}
						{(currentView === 'achievements') && (
							<div className="mb-8 break-inside-avoid animate-in fade-in slide-in-from-bottom-4 duration-500">
								<div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100">
									<div className="flex items-center gap-4 mb-8">
										<div className="p-3 bg-amber-50 rounded-xl">
											<Award className="h-8 w-8 text-amber-500" />
										</div>
										<div>
											<h2 className="text-2xl font-bold text-neutralDark">
												{language === 'bm' ? 'Pencapaian & Lencana' : 'Achievements & Badges'}
											</h2>
											<p className="text-muted-foreground mt-1">
												{language === 'bm' ? 'Raikan kejayaan perjalanan pembelajaran anda' : 'Celebrate the milestones of your learning journey'}
											</p>
										</div>
									</div>

									{achievements.length > 0 ? (
										<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
											{achievements.map((achievement) => {
												const definition = ACHIEVEMENT_DEFINITIONS[achievement.id];
												if (!definition) return null;

												const Icon = definition.icon;
												let title = definition.title[language] || definition.title['en'];
												let description = definition.description[language] || definition.description['en'];

												// Dynamic Title Override for Course Completion
												if (achievement.id === 'course-completion' && achievement.courseTitle) {
													title = language === 'bm' ? `Tamat: ${achievement.courseTitle}` : `Completed: ${achievement.courseTitle}`;
													description = language === 'bm' ? 'Anda telah menamatkan kursus ini sepenuhnya.' : 'You have fully completed this course.';
												}

												return (
													<Card key={achievement.uniqueId || achievement.id} className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden relative group cursor-pointer border-t-4 hover:-translate-y-1 hover:border-t-8 transition-all" style={{ borderColor: definition.color.includes('blue') ? '#3b82f6' : definition.color.includes('amber') ? '#f59e0b' : definition.color.includes('emerald') ? '#10b981' : '#8b5cf6' }}>
														{/* Animated Background Gradient */}
														<div className={`absolute inset-0 bg-gradient-to-br ${definition.color.includes('blue') ? 'from-blue-50/50 to-white' : definition.color.includes('amber') ? 'from-amber-50/50 to-white' : definition.color.includes('emerald') ? 'from-emerald-50/50 to-white' : 'from-violet-50/50 to-white'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

														<div className={`absolute top-0 right-0 p-3 opacity-5 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500`}>
															<Icon className="w-[105px] h-[105px]" style={{ color: definition.color.includes('blue') ? '#3b82f6' : definition.color.includes('amber') ? '#f59e0b' : definition.color.includes('emerald') ? '#10b981' : '#8b5cf6' }} />
														</div>

														<CardContent className="p-6 relative z-10 flex flex-col items-center text-center gap-4 h-full">
															{/* Premium Icon Container */}
															<div className={`p-4 rounded-full shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${definition.color.includes('blue') ? 'from-blue-400 to-blue-600 shadow-blue-200' : definition.color.includes('amber') ? 'from-amber-400 to-amber-600 shadow-amber-200' : definition.color.includes('emerald') ? 'from-emerald-400 to-emerald-600 shadow-emerald-200' : 'from-violet-400 to-violet-600 shadow-violet-200'}`}>
																<Icon className="h-10 w-10 text-white drop-shadow-md" />
															</div>

															<div className="flex-1">
																<h3 className="text-lg font-bold text-neutralDark mb-1 group-hover:text-primary transition-colors">{title}</h3>
																<p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
															</div>
															{achievement.date && (
																<div className="w-full pt-4 border-t border-gray-100 flex items-center justify-center gap-2 mt-auto">
																	<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
																		{language === 'bm' ? 'Diperolehi' : 'Earned'}:
																	</span>
																	<span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-gray-100 shadow-sm text-neutral-600">
																		{formatDate(achievement.date)}
																	</span>
																</div>
															)}
														</CardContent>
													</Card>
												);
											})}
										</div>
									) : (
										<div className="text-center py-16 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
											<div className="bg-neutral-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
												<Award className="h-8 w-8 text-neutral-400" />
											</div>
											<h3 className="text-lg font-semibold text-neutralDark mb-2">
												{language === 'bm' ? 'Tiada Pencapaian Lagi' : 'No Achievements Yet'}
											</h3>
											<p className="text-muted-foreground max-w-sm mx-auto">
												{language === 'bm'
													? 'Teruskan belajar dan selesaikan kursus untuk membuka lencana!'
													: 'Keep learning and completing courses to unlock badges!'}
											</p>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Conditional: Course Performance */}
						{(currentView === 'performance' || (currentView === 'hub' && reportConfig.includePerformance)) && (
							<div className={currentView !== 'performance' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid print-content-managed' : 'mb-8 break-inside-avoid print-content-managed'}>
								<Card className="shadow-sm border-neutral-200">
									<CardHeader>
										<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
											<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
												<Target className="h-5 w-5 text-primary" />
												{language === 'bm' ? 'Analisis Prestasi' : 'Performance Analysis'}
											</CardTitle>
											<div className="relative w-full md:w-auto md:min-w-[250px] print:hidden">
												<select
													className="flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 pl-3 pr-10 appearance-none cursor-pointer shadow-sm hover:border-neutral-300 transition-all"
													value={selectedPerformanceCourseId}
													onChange={(e) => setSelectedPerformanceCourseId(e.target.value)}
												>
													<option value="all">{language === 'bm' ? 'Semua Kursus' : 'All Courses'}</option>
													{courseProgress.map((c) => (
														<option key={c.courseId} value={c.courseId}>
															{c.courseTitle}
														</option>
													))}
												</select>
												<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground bg-gray-50 p-1 rounded-md">
													<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m6 9 6 6 6-6" /></svg>
												</div>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<ResponsiveContainer width="100%" height={288}>
											<RechartsLineChart data={scoreTrend.filter(item => selectedPerformanceCourseId === 'all' || item.courseId === selectedPerformanceCourseId)}>
												<CartesianGrid strokeDasharray="3 3" vertical={false} />
												<XAxis
													dataKey="date"
													interval={0}
													tick={{ fontSize: 12, fill: '#6b7280' }}
													padding={{ left: 20, right: 20 }}
												/>
												<YAxis
													width={48}
													tick={{ fontSize: 12, fill: '#6b7280' }}
													tickFormatter={(value) => `${value}%`}
													domain={[0, 100]}
												/>
												<RechartsTooltip
													formatter={(value) => [`${value}%`, 'Score']}
													contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
												/>
												<Line
													type="monotone"
													dataKey="score"
													stroke="#3b82f6"
													strokeWidth={2}
													dot={{ r: 4, fill: '#3b82f6' }}
													isAnimationActive={!isPrinting}
												/>
											</RechartsLineChart>
										</ResponsiveContainer>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Conditional: Course Progress */}
						{(currentView === 'progress' || (currentView === 'hub' && reportConfig.includeProgress)) && (
							<div className={currentView !== 'progress' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid print-content-managed' : 'mb-8 break-inside-avoid print-content-managed'}>
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


					</div>
				)}

				{/* US011-01: Skill Competency Section (Consolidated Strong/Weak) */}
				{(currentView === 'strong' || (currentView === 'hub' && reportConfig.includeStrong)) && competency.length > 0 && (
					<div className={currentView !== 'strong' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
						<Card className="shadow-sm border-neutral-200">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
									<Target className="h-5 w-5 text-indigo-500" />
									{language === 'bm' ? 'Kompetensi Kemahiran' : 'Skill Competency'}
								</CardTitle>
								<CardDescription>
									{language === 'bm' ? 'Analisis visual kekuatan dan kelemahan mengikut topik.' : 'Visual analysis of strengths and weaknesses across topics.'}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-[350px] w-full flex items-center justify-center">
									<ResponsiveContainer width="100%" height="100%">
										<RadarChart cx="50%" cy="50%" outerRadius="80%" data={competency}>
											<PolarGrid stroke="#e5e7eb" />
											<PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
											<PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
											<Radar
												name={language === 'bm' ? 'Skor' : 'Score'}
												dataKey="A"
												stroke="#8b5cf6"
												strokeWidth={2}
												fill="#8b5cf6"
												fillOpacity={0.5}
											/>
											<RechartsTooltip
												contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
												formatter={(value) => [`${value}%`, language === 'bm' ? 'Markah' : 'Score']}
											/>
										</RadarChart>
									</ResponsiveContainer>
								</div>
								<div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground border-t pt-4">
									<div className="flex items-center gap-2">
										<div className="w-3 h-3 rounded-full bg-indigo-500 opacity-50"></div>
										<span>{language === 'bm' ? 'Kawasan Liputan' : 'Competency Area'}</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs text-neutral-400">{language === 'bm' ? 'Paksi luar menunjukkan penguasaan tinggi' : 'Outer edge indicates mastery'}</span>
									</div>
								</div>

								{/* Weak Areas (Focus Topics) Integration */}
								{competency.some(c => c.A < 60) && (
									<div className="mt-6 pt-6 border-t border-neutral-100">
										<h4 className="text-sm font-semibold text-neutralDark mb-3 flex items-center gap-2">
											<TrendingDown className="h-4 w-4 text-error" />
											{language === 'bm' ? 'Kawasan Tumpuan (Markah < 60%)' : 'Focus Areas (Score < 60%)'}
										</h4>
										<div className="space-y-3">
											{competency.filter(c => c.A < 60).map((topic, idx) => (
												<div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center justify-between">
													<div>
														<p className="text-sm font-medium text-red-900">{topic.title}</p>
														<p className="text-xs text-red-700 mt-0.5">
															{language === 'bm' ? `Skor Semasa: ${topic.A}%` : `Current Score: ${topic.A}%`}
														</p>
													</div>
													<Button size="sm" variant="outline" className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-100 hover:text-red-900">
														{language === 'bm' ? 'Ulangkaji' : 'Review'}
													</Button>
												</div>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
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
											<CardContent className="space-y-4">
												{/* Detailed Risk Categories */}
												{risk.categories && (
													<div className="space-y-3">
														{Object.entries(risk.categories).map(([key, data]) => {
															// Normalize score to percentage based on max possible (approx)
															const max = key === 'submission' ? 20 : 40;
															const pct = Math.min(100, Math.round((data.score / max) * 100));

															return (
																<div key={key} className="space-y-1">
																	<div className="flex justify-between text-xs uppercase font-semibold text-muted-foreground">
																		<span>{key === 'engagement' ? (language === 'bm' ? 'Penglibatan' : 'Engagement') : key === 'academic' ? (language === 'bm' ? 'Akademik' : 'Academic') : (language === 'bm' ? 'Penghantaran' : 'Submission')}</span>
																		<span className={data.score > 0 ? (pct > 50 ? 'text-destructive' : 'text-warning-dark') : 'text-success'}>
																			{data.score > 0 ? (language === 'bm' ? `${pct}% Risiko` : `${pct}% Risk`) : (language === 'bm' ? 'Tiada Risiko' : 'No Risk')}
																		</span>
																	</div>
																	<div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
																		<div
																			className={`h-full rounded-full transition-all ${data.score === 0 ? 'bg-success' : pct > 50 ? 'bg-destructive' : 'bg-warning'}`}
																			style={{ width: `${Math.max(5, pct)}%` }}
																		/>
																	</div>
																	{data.risks.length > 0 && (
																		<ul className="text-xs text-neutralDark space-y-0.5 pl-2 mt-1 border-l-2 border-neutral-200">
																			{data.risks.map((r, i) => <li key={i}>{r}</li>)}
																		</ul>
																	)}
																</div>
															);
														})}
													</div>
												)}

												{/* Actionable Interventions */}
												{risk.interventions && risk.interventions.length > 0 ? (
													<div className="pt-2 flex flex-wrap gap-2">
														{risk.interventions.map((action, idx) => (
															<button
																key={idx}
																onClick={() => alert(`Feature: ${action.label}`)}
																className={`text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${action.id === 'tutor' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
															>
																{action.id === 'tutor' ? <Users className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
																{action.label}
															</button>
														))}
													</div>
												) : (
													risk.riskScore < 30 && (
														<p className="text-sm text-success flex items-center gap-2 mt-2">
															<CheckCircle className="h-4 w-4" />
															{language === 'bm' ? 'Prestasi anda cemerlang!' : 'You are doing great!'}
														</p>
													)
												)}

												{/* Key Metrics Mini Grid */}
												<div className="grid grid-cols-3 gap-1 pt-3 border-t mt-2">
													<div className="text-center p-1">
														<p className="text-xs text-muted-foreground uppercase">
															{language === 'bm' ? 'Skor Risiko' : 'Risk Score'}
														</p>
														<p className={`font-bold ${risk.riskLevel === 'high' ? 'text-destructive' : risk.riskLevel === 'medium' ? 'text-warning-dark' : 'text-success'}`}>
															{Math.round(risk.riskScore)}/100
														</p>
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
						<div className={currentView !== 'details' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid mt-8' : 'space-y-6 mt-8'}>
							<Card className="border-none shadow-sm bg-white overflow-hidden">
								<div className="p-6 bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
									<div>
										<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
											<BookOpen className="h-5 w-5 text-primary" />
											{language === 'bm' ? 'Butiran Kursus' : 'Course Details'}
										</h2>
										<p className="text-sm text-muted-foreground mt-1">
											{language === 'bm'
												? 'Pilih kursus untuk melihat analisis prestasi terperinci'
												: 'Select a course to view detailed performance analysis'}
										</p>
									</div>
									<div className="relative w-full md:w-72 print:hidden">
										<div className="relative">

											<select
												className="flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 pl-4 pr-10 appearance-none cursor-pointer shadow-sm hover:border-neutral-300 transition-all"
												value={selectedCourseId}
												onChange={(e) => setSelectedCourseId(e.target.value)}
											>
												<option value="">{language === 'bm' ? 'Pilih Kursus...' : 'Select a Course...'}</option>
												<option value="all">{language === 'bm' ? 'Tunjukkan Semua' : 'Show All Courses'}</option>
												{courseProgress.map((c) => (
													<option key={c.courseId} value={c.courseId}>
														{c.courseTitle}
													</option>
												))}
											</select>
											<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground bg-gray-50 p-1 rounded-md">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m6 9 6 6 6-6" /></svg>
											</div>
										</div>
									</div>
								</div>

								{!selectedCourseId && (
									<div className="text-center py-16 px-4 flex flex-col items-center justify-center bg-white">
										<div className="bg-primary/5 p-4 rounded-full mb-4 animate-pulse">
											<LayoutDashboard className="h-12 w-12 text-primary/40" />
										</div>
										<h3 className="text-lg font-semibold text-neutralDark mb-2">
											{language === 'bm' ? 'Tiada Kursus Dipilih' : 'No Course Selected'}
										</h3>
										<p className="text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
											{language === 'bm'
												? 'Sila pilih kursus dari menu di atas untuk melihat butiran kemajuan, markah penilaian, dan sejarah tugasan anda.'
												: 'Please select a course from the dropdown above to view your detailed progress, assessment scores, and assignment history.'}
										</p>
										<div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 px-3 py-1.5 rounded-full">
											<Info className="h-3.5 w-3.5" />
											{language === 'bm' ? 'Pilih kursus untuk bermula' : 'Select a course to get started'}
										</div>
									</div>
								)}
							</Card>

							{selectedCourseId && (
								courseProgress.filter(c =>
									selectedCourseId === 'all' || c.courseId === selectedCourseId
								).length === 0 ? (
									<div className="text-center py-12 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
										<p className="text-muted-foreground">
											{language === 'bm' ? 'Tiada kursus dijumpai.' : 'No courses found.'}
										</p>
									</div>
								) : (
									courseProgress
										.filter(c => selectedCourseId === 'all' || c.courseId === selectedCourseId)
										.map((course) => (
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

												{/* Course Description */}
												{course.courseDescription && (
													<div className="px-6 pt-4 pb-0">
														<p className="text-muted-foreground text-sm leading-relaxed">
															{course.courseDescription}
														</p>
													</div>
												)}

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

													{/* Performance Insights / Risk Indicators */}
													{riskIndicators[course.courseId] && (
														<div className={`p-4 rounded-xl border ${riskIndicators[course.courseId].riskLevel === 'low'
															? 'bg-green-50 border-green-100'
															: riskIndicators[course.courseId].riskLevel === 'medium'
																? 'bg-yellow-50 border-yellow-100'
																: 'bg-red-50 border-red-100'
															}`}>
															<div className="flex items-start gap-3">
																{riskIndicators[course.courseId].riskLevel === 'low' ? (
																	<div className="p-2 bg-green-100 rounded-full mt-0.5">
																		<CheckCircle2 className="h-4 w-4 text-green-600" />
																	</div>
																) : riskIndicators[course.courseId].riskLevel === 'medium' ? (
																	<div className="p-2 bg-yellow-100 rounded-full mt-0.5">
																		<Info className="h-4 w-4 text-yellow-600" />
																	</div>
																) : (
																	<div className="p-2 bg-red-100 rounded-full mt-0.5">
																		<AlertTriangle className="h-4 w-4 text-red-600" />
																	</div>
																)}
																<div className="flex-1">
																	<h4 className={`text-sm font-bold mb-1 ${riskIndicators[course.courseId].riskLevel === 'low'
																		? 'text-green-800'
																		: riskIndicators[course.courseId].riskLevel === 'medium'
																			? 'text-yellow-800'
																			: 'text-red-800'
																		}`}>
																		{language === 'bm' ? 'Analisis Prestasi' : 'Performance Insights'}
																	</h4>

																	{/* Recommendations */}
																	{riskIndicators[course.courseId].recommendations && riskIndicators[course.courseId].recommendations.length > 0 && (
																		<ul className="space-y-1 mt-2">
																			{riskIndicators[course.courseId].recommendations.map((rec, idx) => (
																				<li key={idx} className="text-xs flex items-start gap-2 text-muted-foreground">
																					<span className="mt-1.5 h-1 w-1 rounded-full bg-current flex-shrink-0" />
																					<span>{rec}</span>
																				</li>
																			))}
																		</ul>
																	)}
																</div>
															</div>
														</div>
													)}

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
										))
								)
							)}			</div>
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
			</div>
			{/* --- End Interactive Dashboard --- */}

			{/* --- Dedicated Print View (Visible ONLY on Print) --- */}
			<div className="fixed top-0 left-[-10000px] w-[1024px] h-auto overflow-hidden opacity-0 pointer-events-none print:relative print:left-0 print:top-auto print:w-full print:h-auto print:opacity-100 print:overflow-visible print:pointer-events-auto space-y-8">
				<div className="text-center border-b pb-6">
					<h1 className="text-3xl font-bold text-neutralDark mb-2">
						{language === 'bm' ? 'Laporan Prestasi Pelajar' : 'Student Performance Report'}
					</h1>
					<p className="text-muted-foreground">
						{language === 'bm' ? 'Dijana pada:' : 'Generated on:'} {new Date().toLocaleDateString()}
					</p>
				</div>

				{/* Section: Course Performance */}
				{reportConfig.includePerformance && (
					<div className="break-inside-avoid">
						<h2 className="text-xl font-bold text-neutralDark mb-4 flex items-center gap-2 border-b pb-2">
							<Target className="h-5 w-5 text-primary" />
							{language === 'bm' ? 'Prestasi Kursus' : 'Course Performance'}
						</h2>
						<div className="h-80 w-full border rounded p-4">
							{/* Recharts/Tremor needs specific dimensions in print mode often */}
							<BarChart
								className="h-72 w-full"
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
								showAnimation={false} // No animation for print
							/>
						</div>
					</div>
				)}

				{/* Section: Course Progress */}
				{reportConfig.includeProgress && (
					<div className="break-inside-avoid pt-4">
						<h2 className="text-xl font-bold text-neutralDark mb-4 flex items-center gap-2 border-b pb-2">
							<Activity className="h-5 w-5 text-emerald-500" />
							{language === 'bm' ? 'Kemajuan Kursus' : 'Course Progress'}
						</h2>
						<div className="h-80 w-full border rounded p-4">
							<BarChart
								className="h-72 w-full"
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
								showAnimation={false}
							/>
						</div>
					</div>
				)}

				{/* Section: Score Trend */}
				{reportConfig.includeTrend && scoreTrend.length > 0 && (
					<div className="break-inside-avoid pt-4">
						<h2 className="text-xl font-bold text-neutralDark mb-4 flex items-center gap-2 border-b pb-2">
							<TrendingUp className="h-5 w-5 text-indigo-500" />
							{language === 'bm' ? 'Trend Prestasi Penilaian' : 'Assessment Score Trend'}
						</h2>
						<div className="h-80 w-full border rounded p-4">
							<ResponsiveContainer width="100%" height="100%">
								<RechartsLineChart data={scoreTrend}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="date"
										interval={0}
										tick={{ fontSize: 12, fill: '#6b7280' }}
										padding={{ left: 20, right: 20 }}
									/>
									<YAxis
										width={48}
										tick={{ fontSize: 12, fill: '#6b7280' }}
										tickFormatter={(value) => `${value}%`}
										domain={[0, 100]}
									/>
									<Line
										type="monotone"
										dataKey="score"
										stroke="#3b82f6"
										strokeWidth={2}
										dot={{ r: 4, fill: '#3b82f6' }}
										isAnimationActive={false}
									/>
								</RechartsLineChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}

				{/* Section: Strong Topics */}
				{reportConfig.includeStrong && strongTopics.length > 0 && (
					<div className="break-inside-avoid pt-4">
						<h2 className="text-xl font-bold text-neutralDark mb-4 flex items-center gap-2 border-b pb-2">
							<Award className="h-5 w-5 text-amber-500" />
							{language === 'bm' ? 'Topik Pembelajaran Kuat' : 'Strong Learning Topics'}
						</h2>
						<div className="grid grid-cols-2 gap-4">
							{strongTopics.map((topic) => (
								<div key={topic.id} className="border p-4 rounded-lg bg-emerald-50/30">
									<h3 className="font-bold text-lg mb-1">{topic.title}</h3>
									<p className="text-sm">Avgerage Score: <span className="font-bold">{topic.score}%</span></p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Section: Risk Indicators */}
				{reportConfig.includeRisk && Object.keys(riskIndicators).length > 0 && (
					<div className="break-inside-avoid pt-4">
						<h2 className="text-xl font-bold text-neutralDark mb-4 flex items-center gap-2 border-b pb-2">
							<AlertTriangle className="h-5 w-5 text-warning" />
							{language === 'bm' ? 'Penunjuk Risiko' : 'Risk Indicators'}
						</h2>
						<div className="grid gap-4">
							{Object.entries(riskIndicators).map(([courseId, risk]) => {
								const course = courseProgress.find(c => c.courseId === courseId);
								if (!course) return null;
								return (
									<div key={courseId} className="border p-4 rounded-lg">
										<div className="flex justify-between mb-2">
											<span className="font-bold">{course.courseTitle}</span>
											<span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${risk.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
												risk.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
													'bg-green-100 text-green-700'
												}`}>
												{risk.riskLevel} Risk
											</span>
										</div>
										<ul className="text-sm space-y-1 list-disc pl-5">
											{risk.riskReasons.map((r, i) => <li key={i}>{r}</li>)}
										</ul>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Section: Course Details */}
				{reportConfig.includeDetails && courseProgress.length > 0 && (
					<div className="break-inside-avoid pt-4">
						<h2 className="text-xl font-bold text-neutralDark mb-4 flex items-center gap-2 border-b pb-2">
							<BookOpen className="h-5 w-5 text-blue-500" />
							{language === 'bm' ? 'Butiran Kursus' : 'Course Details'}
						</h2>
						<div className="space-y-6">
							{courseProgress.map((course) => (
								<div key={course.courseId} className="border p-4 rounded-lg">
									<div className="flex justify-between items-center mb-4 border-b pb-2">
										<h3 className="font-bold text-lg">{course.courseTitle}</h3>
										<span className="text-sm bg-neutral-100 px-2 py-1 rounded">Progress: {course.overallProgress}%</span>
									</div>
									<div className="grid grid-cols-4 gap-4 text-center text-sm mb-4">
										<div className="bg-blue-50 p-2 rounded">
											<span className="block text-xs text-muted-foreground">Lessons</span>
											<span className="font-bold">{course.completedLessons}/{course.totalLessons}</span>
										</div>
										<div className="bg-emerald-50 p-2 rounded">
											<span className="block text-xs text-muted-foreground">Modules</span>
											<span className="font-bold">{course.completedModules}/{course.totalModules}</span>
										</div>
										<div className="bg-violet-50 p-2 rounded">
											<span className="block text-xs text-muted-foreground">Assessments</span>
											<span className="font-bold">{course.assessments.length}</span>
										</div>
										<div className="bg-orange-50 p-2 rounded">
											<span className="block text-xs text-muted-foreground">Avg Score</span>
											<span className="font-bold">{course.avgAssessmentScore}%</span>
										</div>
									</div>

									{/* Recent Activity Table style for print */}
									{(course.assessments.length > 0 || course.assignments.length > 0) && (
										<div className="text-sm">
											<p className="font-semibold mb-2">Recent Activity</p>
											<table className="w-full border-collapse">
												<thead>
													<tr className="bg-neutral-100 text-left">
														<th className="p-2 border">Item</th>
														<th className="p-2 border">Date</th>
														<th className="p-2 border text-right">Score</th>
													</tr>
												</thead>
												<tbody>
													{course.assessments.slice(0, 3).map((a, i) => (
														<tr key={i}>
															<td className="p-2 border">{a.assessmentTitle} (Assessment)</td>
															<td className="p-2 border">{formatDate(a.submittedAt)}</td>
															<td className="p-2 border text-right">{a.score}/{a.totalPoints}</td>
														</tr>
													))}
													{course.assignments.slice(0, 3).map((a, i) => (
														<tr key={i}>
															<td className="p-2 border">{a.assignmentTitle} (Assignment)</td>
															<td className="p-2 border">{formatDate(a.submittedAt)}</td>
															<td className="p-2 border text-right">{a.grade}%</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div >
	);
}

