'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	TrendingUp,
	TrendingDown,
	Users,
	AlertTriangle,
	Download,
	BookOpen,
	BarChart3,
	Activity,
	Target,
	FileText,
	Clock,
	Send,
	X,
	Lightbulb,
	AlertCircle,
	FileWarning,
	CheckCircle2,
	ClipboardCheck,
	LayoutDashboard,
	Printer
} from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart, LineChart, AreaChart } from '@tremor/react';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Toast } from '@/components/ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AnalyticsPage() {
	const { language } = useLanguage();
	const { userData, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);
	const [selectedCourseId, setSelectedCourseId] = useState(null);
	const [courses, setCourses] = useState([]);
	const [analyticsData, setAnalyticsData] = useState(null);
	const [selectedStudent, setSelectedStudent] = useState(null);
	const [showStudentDetail, setShowStudentDetail] = useState(false);
	const [showNotificationModal, setShowNotificationModal] = useState(false);
	const [notificationStudent, setNotificationStudent] = useState(null);
	const [notificationGuidance, setNotificationGuidance] = useState('');
	const [sendingNotification, setSendingNotification] = useState(false);
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [toast, setToast] = useState(null);

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { setLoading(false); return; }
		if (userData.role !== 'teacher' && userData.role !== 'admin') { setLoading(false); return; }
		loadTeacherCourses();
	}, [authLoading, userData]);

	useEffect(() => {
		if (selectedCourseId && userData?.role === 'teacher') {
			loadAnalytics(selectedCourseId);
		}
	}, [selectedCourseId]);

	async function loadTeacherCourses() {
		try {
			const data = await api.get('/api/courses');
			const coursesList = (data.courses || []).map(c => ({ ...c, id: c._id?.toString() || c.id }));
			setCourses(coursesList);
			if (coursesList.length > 0 && !selectedCourseId) {
				const sqlCourse = coursesList.find(c => c.title === 'SQL Fundamentals' || c.title?.includes('SQL'));
				setSelectedCourseId(sqlCourse ? sqlCourse.id : coursesList[0].id);
			}
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoading(false);
		}
	}

	async function loadAnalytics(courseId) {
		if (!courseId) { setAnalyticsLoading(false); return; }
		setAnalyticsLoading(true);
		try {
			// Fetch enrollments (with student data populated), course details,
			// assessments, and assignments in parallel
			const [enrollData, courseData, assessData, assignData] = await Promise.all([
				api.get(`/api/enrollments/teacher?courseId=${courseId}`),
				api.get(`/api/courses/${courseId}`),
				api.get(`/api/assessments?courseId=${courseId}`),
				api.get(`/api/assignments?courseId=${courseId}`),
			]);

			const enrollments = enrollData.enrollments || [];
			const course = courseData.course;
			const assessments = (assessData.assessments || []).map(a => ({ ...a, id: a._id?.toString() || a.id }));
			const assignments = (assignData.assignments || []).map(a => ({ ...a, id: a._id?.toString() || a.id }));
			const modules = course.modules || [];

			// Risk configuration
			const riskConfig = {
				minAvgScore: 60,
				maxMissedDeadlines: 2,
				maxDaysInactive: 7,
				...(course.riskConfig || {}),
			};

			// Calculate total lessons from module data (modules populated with lessons array)
			let totalLessons = 0;
			modules.forEach(mod => {
				if (mod.lessons && Array.isArray(mod.lessons)) totalLessons += mod.lessons.length;
			});

			// Fetch all submissions for each assessment and assignment
			const [assessSubmResults, assignSubmResults] = await Promise.all([
				Promise.allSettled(assessments.map(a => api.get(`/api/submissions?assessmentId=${a.id}`))),
				Promise.allSettled(assignments.map(a => api.get(`/api/submissions?assignmentId=${a.id}`))),
			]);

			const allSubmissions = [];
			assessSubmResults.forEach((r, i) => {
				if (r.status === 'fulfilled') {
					(r.value.submissions || []).forEach(s => allSubmissions.push({ ...s, id: s._id?.toString() || s.id, type: 'assessment' }));
				}
			});
			assignSubmResults.forEach((r, i) => {
				if (r.status === 'fulfilled') {
					(r.value.submissions || []).forEach(s => allSubmissions.push({ ...s, id: s._id?.toString() || s.id, type: 'assignment' }));
				}
			});

			// Build student data map from enrollments
			// enrollment.studentId is populated: { _id, name, email }
			const studentData = {};
			enrollments.forEach(enrollment => {
				const studentObj = enrollment.studentId;
				if (!studentObj) return;
				const studentId = studentObj._id?.toString() || studentObj.id || studentObj;
				if (!studentData[studentId]) {
					studentData[studentId] = {
						studentId,
						studentName: studentObj.name || 'Unknown',
						email: studentObj.email || 'N/A',
						enrollment,
						submissions: [],
						completedLessons: enrollment.progress?.completedLessons?.length || 0,
						completedModules: enrollment.progress?.completedModules?.length || 0,
						overallProgress: enrollment.progress?.overallProgress || 0,
						totalLessons,
						totalModules: modules.length,
						scores: [],
						lastActivity: enrollment.enrolledAt,
					};
				}
			});

			// Process submissions — attach to students
			allSubmissions.forEach(submission => {
				const studentId = submission.studentId?.toString() || submission.studentId;
				if (!studentData[studentId]) {
					studentData[studentId] = {
						studentId,
						studentName: submission.studentName || 'Unknown',
						email: 'N/A',
						enrollment: null,
						submissions: [],
						completedLessons: 0,
						completedModules: 0,
						overallProgress: 0,
						totalLessons,
						totalModules: modules.length,
						scores: [],
						lastActivity: submission.submittedAt || null,
					};
				}
				studentData[studentId].submissions.push(submission);
				if (submission.submittedAt) {
					const submitDate = new Date(submission.submittedAt);
					const lastActivity = new Date(studentData[studentId].lastActivity || 0);
					if (submitDate > lastActivity) studentData[studentId].lastActivity = submission.submittedAt;
				}
				if (typeof submission.score === 'number' && submission.totalPoints) {
					studentData[studentId].scores.push((submission.score / submission.totalPoints) * 100);
				} else if (typeof submission.grade === 'number') {
					studentData[studentId].scores.push(submission.grade);
				}
			});

			const now = new Date();

			// Calculate missed deadlines
			Object.values(studentData).forEach(student => {
				let missed = 0;
				assessments.forEach(assessment => {
					const endDate = assessment.config?.endDate;
					if (!endDate) return;
					const deadlineDate = new Date(endDate);
					if (deadlineDate > now) return;
					const submission = allSubmissions.find(s => s.studentId?.toString() === student.studentId && s.assessmentId === assessment.id);
					if (!submission) { missed++; }
					else if (submission.submittedAt && new Date(submission.submittedAt) > deadlineDate) { missed++; }
				});
				assignments.forEach(assignment => {
					const deadline = assignment.deadline;
					if (!deadline) return;
					const deadlineDate = new Date(deadline);
					if (deadlineDate > now) return;
					const submission = allSubmissions.find(s => s.studentId?.toString() === student.studentId && s.assignmentId === assignment.id);
					if (!submission) { missed++; }
					else if (submission.submittedAt && new Date(submission.submittedAt) > deadlineDate && !assignment.allowLateSubmissions) { missed++; }
				});
				student.missedDeadlines = missed;
			});

			// Calculate completion rate trends (last 7 weeks)
			const completionRates = [];
			for (let i = 6; i >= 0; i--) {
				const weekStart = new Date(now); weekStart.setDate(now.getDate() - (i * 7)); weekStart.setHours(0, 0, 0, 0);
				const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
				let totalProgress = 0, studentCount = 0;
				Object.values(studentData).forEach(student => {
					const enrolledAt = new Date(student.enrollment?.enrolledAt || 0);
					if (enrolledAt <= weekEnd) { totalProgress += (student.overallProgress || 0); studentCount++; }
				});
				completionRates.push({
					week: `Week ${7 - i}`,
					date: weekStart.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
					'Completion Rate': studentCount > 0 ? Math.round(totalProgress / studentCount) : 0,
				});
			}

			// Calculate score trends (last 7 weeks)
			const scoreTrends = [];
			for (let i = 6; i >= 0; i--) {
				const weekStart = new Date(now); weekStart.setDate(now.getDate() - (i * 7)); weekStart.setHours(0, 0, 0, 0);
				const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
				const weekSubs = allSubmissions.filter(s => {
					if (!s.submittedAt) return false;
					const d = new Date(s.submittedAt);
					return d >= weekStart && d < weekEnd;
				});
				let totalScore = 0, count = 0;
				weekSubs.forEach(s => {
					if (typeof s.score === 'number' && s.totalPoints) { totalScore += (s.score / s.totalPoints) * 100; count++; }
					else if (typeof s.grade === 'number') { totalScore += s.grade; count++; }
				});
				scoreTrends.push({
					week: `Week ${7 - i}`,
					date: weekStart.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
					'Average Score': count > 0 ? Math.round(totalScore / count) : 0,
				});
			}

			// Build student array with risk analysis
			const studentsArray = Object.values(studentData).map(student => {
				const avgScore = student.scores.length > 0
					? student.scores.reduce((sum, s) => sum + s, 0) / student.scores.length : 0;
				const daysSinceActivity = student.lastActivity
					? Math.floor((now - new Date(student.lastActivity)) / (1000 * 60 * 60 * 24)) : 999;
				const completionRate = student.totalLessons > 0
					? (student.completedLessons / student.totalLessons) * 100 : 0;
				const missedDeadlines = student.missedDeadlines || 0;

				const highScoreRisk = avgScore < (riskConfig.minAvgScore - 10);
				const mediumScoreRisk = avgScore < riskConfig.minAvgScore;
				const highDeadlineRisk = missedDeadlines > riskConfig.maxMissedDeadlines;
				const mediumDeadlineRisk = missedDeadlines > 0;
				const highEngagementRisk = daysSinceActivity > (riskConfig.maxDaysInactive * 2);
				const mediumEngagementRisk = daysSinceActivity > riskConfig.maxDaysInactive;

				let riskLevel = 'low';
				if (highScoreRisk || highDeadlineRisk || highEngagementRisk) riskLevel = 'high';
				else if (mediumScoreRisk || mediumDeadlineRisk || mediumEngagementRisk) riskLevel = 'medium';

				const reasons = [];
				if (highScoreRisk || mediumScoreRisk) reasons.push(`Average assessment score below ${riskConfig.minAvgScore}%`);
				if (missedDeadlines > 0) reasons.push(`Missed ${missedDeadlines} deadline${missedDeadlines > 1 ? 's' : ''}`);
				if (mediumEngagementRisk || highEngagementRisk) reasons.push(`Low engagement (inactive for ${daysSinceActivity} day${daysSinceActivity !== 1 ? 's' : ''})`);

				return { ...student, avgScore, daysSinceActivity, completionRate, missedDeadlines, riskLevel, riskReasons: reasons };
			});

			const atRiskStudents = studentsArray
				.filter(s => s.riskLevel !== 'low')
				.sort((a, b) => {
					if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
					if (b.riskLevel === 'high' && a.riskLevel !== 'high') return 1;
					return a.avgScore - b.avgScore;
				});

			const highRiskCount = atRiskStudents.filter(s => s.riskLevel === 'high').length;
			const mediumRiskCount = atRiskStudents.filter(s => s.riskLevel === 'medium').length;
			const avgMissedDeadlines = studentsArray.length > 0
				? studentsArray.reduce((sum, s) => sum + (s.missedDeadlines || 0), 0) / studentsArray.length : 0;
			const avgDaysInactive = studentsArray.length > 0
				? studentsArray.reduce((sum, s) => sum + (s.daysSinceActivity || 0), 0) / studentsArray.length : 0;

			// Topic heatmap
			const topicHeatmap = modules.map(module => {
				let totalStudents = 0, completedStudents = 0, totalScore = 0, scoreCount = 0;
				Object.values(studentData).forEach(student => {
					totalStudents++;
					if (student.completedModules >= modules.indexOf(module) + 1) completedStudents++;
					student.submissions.forEach(sub => {
						if (typeof sub.score === 'number' && sub.totalPoints) { totalScore += (sub.score / sub.totalPoints) * 100; scoreCount++; }
						else if (typeof sub.grade === 'number') { totalScore += sub.grade; scoreCount++; }
					});
				});
				return {
					topic: module.title || 'Module',
					completionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
					avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
					totalStudents,
					completedStudents,
				};
			});

			const totalStudents = studentsArray.length;
			const avgCompletionRate = totalStudents > 0
				? studentsArray.reduce((sum, s) => sum + s.completionRate, 0) / totalStudents : 0;
			const avgScore = studentsArray.filter(s => s.scores.length > 0).length > 0
				? studentsArray.filter(s => s.scores.length > 0).reduce((sum, s) => sum + s.avgScore, 0) / studentsArray.filter(s => s.scores.length > 0).length : 0;

			setAnalyticsData({
				enrollments,
				students: studentsArray,
				completionRates,
				scoreTrends,
				atRiskStudents,
				topicHeatmap,
				riskSummary: {
					highRiskCount,
					mediumRiskCount,
					avgMissedDeadlines: Math.round(avgMissedDeadlines * 10) / 10,
					avgDaysInactive: Math.round(avgDaysInactive * 10) / 10,
				},
				overallStats: { totalStudents, avgCompletionRate: Math.round(avgCompletionRate), avgScore: Math.round(avgScore) },
				courseTitle: course.title,
			});
		} catch (err) {
			console.error('Error loading analytics:', err);
			setAnalyticsData({
				enrollments: [], completionRates: [], scoreTrends: [], atRiskStudents: [], topicHeatmap: [],
				overallStats: { totalStudents: 0, avgCompletionRate: 0, avgScore: 0 },
				courseTitle: '',
			});
		} finally {
			setAnalyticsLoading(false);
		}
	}


	function handleExport() {
		if (!analyticsData) return;

		const exportData = {
			course: analyticsData.courseTitle,
			generatedAt: new Date().toISOString(),
			overallStats: analyticsData.overallStats,
			completionRates: analyticsData.completionRates,
			scoreTrends: analyticsData.scoreTrends,
			// Anonymized risk data at class level (no names)
			riskSummary: analyticsData.riskSummary,
			atRiskStudents: analyticsData.atRiskStudents.map((s, index) => ({
				id: index + 1,
				averageScore: Math.round(s.avgScore),
				completionRate: Math.round(s.completionRate),
				daysSinceActivity: s.daysSinceActivity,
				missedDeadlines: s.missedDeadlines || 0,
				riskLevel: s.riskLevel,
			})),
			topicHeatmap: analyticsData.topicHeatmap,
		};

		// Export as JSON
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `class-performance-${selectedCourseId}-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function exportAsPDF() {
		if (!selectedCourseId || !analyticsData) return;

		const doc = new jsPDF();

		// Title
		doc.setFontSize(18);
		doc.text(language === 'bm' ? 'Laporan Prestasi Kelas' : 'Class Performance Report', 14, 22);

		// Course Info
		doc.setFontSize(12);
		doc.text(`${language === 'bm' ? 'Kursus' : 'Course'}: ${analyticsData.courseTitle}`, 14, 32);
		doc.text(`${language === 'bm' ? 'Tarikh' : 'Date'}: ${new Date().toLocaleDateString()}`, 14, 40);

		// Stats Summary
		const stats = [
			[`${language === 'bm' ? 'Jumlah Pelajar' : 'Total Students'}: ${analyticsData.totalStudents}`],
			[`${language === 'bm' ? 'Kadar Penyiapan Purata' : 'Avg Completion Rate'}: ${Math.round(analyticsData.avgCompletion)}%`],
			[`${language === 'bm' ? 'Skor Purata' : 'Average Score'}: ${Math.round(analyticsData.avgScore)}%`],
			[`${language === 'bm' ? 'Pelajar Berisiko' : 'At-Risk Students'}: ${analyticsData.atRiskStudents.length}`]
		];

		autoTable(doc, {
			startY: 45,
			head: [[language === 'bm' ? 'Ringkasan Statistik' : 'Statistics Summary']],
			body: stats,
			theme: 'plain',
			styles: { fontSize: 10, cellPadding: 2 },
			headStyles: { fontStyle: 'bold' }
		});

		// Students Table
		const tableColumn = [
			language === 'bm' ? 'Nama' : 'Name',
			language === 'bm' ? 'Email' : 'Email',
			language === 'bm' ? 'Penyiapan (%)' : 'Completion (%)',
			language === 'bm' ? 'Skor (%)' : 'Score (%)',
			language === 'bm' ? 'Risiko' : 'Risk'
		];

		const tableRows = [];
		analyticsData.students.forEach(student => {
			const studentData = [
				student.name || 'N/A',
				student.email || 'N/A',
				Math.round(student.completionRate),
				Math.round(student.avgScore),
				student.riskLevel === 'high' ? 'High' : (student.riskLevel === 'medium' ? 'Medium' : 'Low')
			];
			tableRows.push(studentData);
		});

		autoTable(doc, {
			startY: doc.lastAutoTable.finalY + 10,
			head: [tableColumn],
			body: tableRows,
			theme: 'striped',
			headStyles: { fillColor: [16, 185, 129] }, // Emerald color
		});

		doc.save(`class-performance-${selectedCourseId}-${Date.now()}.pdf`);
	}

	function exportAsCSV() {
		if (!selectedCourseId || !analyticsData) return;

		// Prepare CSV data
		const headers = [
			language === 'bm' ? 'Nama Pelajar' : 'Student Name',
			language === 'bm' ? 'Email' : 'Email',
			language === 'bm' ? 'Kadar Penyiapan (%)' : 'Completion Rate (%)',
			language === 'bm' ? 'Skor Purata (%)' : 'Average Score (%)',
			language === 'bm' ? 'Pelajaran Selesai' : 'Lessons Completed',
			language === 'bm' ? 'Modul Selesai' : 'Modules Completed',
			language === 'bm' ? 'Tarikh Aktiviti Terakhir' : 'Last Activity Date',
			language === 'bm' ? 'Tingkat Risiko' : 'Risk Level',
			language === 'bm' ? 'Sebab Risiko' : 'Risk Reasons',
		];

		const rows = analyticsData.students.map(student => [
			student.name || 'N/A',
			student.email || 'N/A',
			Math.round(student.completionRate),
			Math.round(student.avgScore),
			student.completedLessons || 0,
			student.completedModules || 0,
			student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'N/A',
			student.riskLevel || 'low',
			(student.riskReasons || []).join('; '),
		]);

		// Create CSV content
		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		].join('\n');

		// Download CSV
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `class-performance-${selectedCourseId}-${Date.now()}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	if (userData?.role !== 'teacher' && userData?.role !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Analitik' : 'Analytics'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm'
							? 'Halaman ini hanya tersedia untuk guru.'
							: 'This page is only available for teachers.'}
					</p>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Prestasi Kelas' : 'Class Performance'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (courses.length === 0) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Prestasi Kelas' : 'Class Performance'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm'
							? 'Anda belum membuat sebarang kursus lagi.'
							: "You haven't created any courses yet."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="relative z-10 space-y-8">
				{/* Header */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-h1 text-neutralDark mb-2">
							{language === 'bm' ? 'Prestasi Kelas' : 'Class Performance'}
						</h1>
						<p className="text-body text-muted-foreground">
							{language === 'bm'
								? 'Lihat kemajuan dan prestasi pelajar dalam kursus anda'
								: 'View student progress and performance in your courses'}
						</p>
					</div>
					{analyticsData && (
						<div className="relative self-start md:self-auto">
							<Button
								onClick={() => setShowExportMenu(!showExportMenu)}
								variant="outline"
								className="gap-2 print:hidden"
							>
								<Printer className="h-5 w-5" />
								{language === 'bm' ? 'Laporan' : 'Export'}
							</Button>

							{showExportMenu && (
								<>
									<div
										className="fixed inset-0 z-10"
										onClick={() => setShowExportMenu(false)}
									/>
									<div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-neutral-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
										<div className="px-2 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
											{language === 'bm' ? 'Pilihan Eksport' : 'Export Options'}
										</div>
										<button
											onClick={() => { exportAsPDF(); setShowExportMenu(false); }}
											className="w-full text-left px-4 py-3 hover:bg-neutral-50 text-sm flex items-center gap-3 transition-all text-neutral-700 hover:text-red-600 whitespace-nowrap group"
										>
											<div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
												<FileText className="h-4 w-4 text-red-500 group-hover:text-red-600" />
											</div>
											<span className="font-medium">{language === 'bm' ? 'Eksport sebagai PDF' : 'Export as PDF'}</span>
										</button>
										<button
											onClick={() => { exportAsCSV(); setShowExportMenu(false); }}
											className="w-full text-left px-4 py-3 hover:bg-neutral-50 text-sm flex items-center gap-3 transition-all text-neutral-700 hover:text-emerald-600 whitespace-nowrap group"
										>
											<div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
												<FileText className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600" />
											</div>
											<span className="font-medium">{language === 'bm' ? 'Eksport sebagai Excel' : 'Export as Excel'}</span>
										</button>
									</div>
								</>
							)}
						</div>
					)}
				</div>

				{/* Course Selector */}
				<Card className="border-neutral-200 shadow-sm">
					<CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4">
						<div className="flex items-center gap-2 text-neutral-900 min-w-fit">
							<div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
								<BookOpen className="h-7 w-7" />
							</div>
							<span className="font-semibold text-lg">{language === 'bm' ? 'Kursus Semasa:' : 'Current Course:'}</span>
						</div>
						<div className="relative flex-1">
							<select
								id="course-select"
								value={selectedCourseId || ''}
								onChange={(e) => setSelectedCourseId(e.target.value)}
								className="w-full appearance-none pl-4 pr-10 py-2.5 bg-neutral-50 border-none rounded-xl text-neutral-900 font-medium text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-neutral-100"
							>
								{courses.map(course => (
									<option key={course.id} value={course.id}>
										{course.title}
									</option>
								))}
							</select>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down h-4 w-4"><path d="m6 9 6 6 6-6" /></svg>
							</div>
						</div>
					</CardContent>
				</Card>

				{analyticsLoading && (
					<div className="text-center py-8">
						<p className="text-body text-muted-foreground">
							{language === 'bm' ? 'Memuatkan data analitik...' : 'Loading analytics data...'}
						</p>
					</div>
				)}

				{analyticsData && !analyticsLoading && (
					<>
						{/* Overall Stats */}
						{/* Overall Stats */}
						<div className="grid gap-6 md:grid-cols-3">
							<Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
								<div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1">
									<Users className="w-16 h-16" />
								</div>
								<CardContent className="p-5 relative z-10">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-blue-100 font-medium text-xs">
												{language === 'bm' ? 'Jumlah Pelajar' : 'Total Students'}
											</p>
											<p className="text-2xl font-bold mt-1">
												{analyticsData.overallStats.totalStudents}
											</p>
										</div>
										<div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
											<Users className="h-5 w-5 text-white" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
								<div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1">
									<CheckCircle2 className="w-16 h-16" />
								</div>
								<CardContent className="p-5 relative z-10">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-emerald-100 font-medium text-xs">
												{language === 'bm' ? 'Kadar Penyiapan Purata' : 'Avg Completion Rate'}
											</p>
											<p className="text-2xl font-bold mt-1">
												{analyticsData.overallStats.avgCompletionRate}%
											</p>
										</div>
										<div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
											<Target className="h-5 w-5 text-white" />
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-none shadow-md bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative">
								<div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1">
									<ClipboardCheck className="w-16 h-16" />
								</div>
								<CardContent className="p-5 relative z-10">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-violet-100 font-medium text-xs">
												{language === 'bm' ? 'Skor Purata' : 'Average Score'}
											</p>
											<p className="text-2xl font-bold mt-1">
												{analyticsData.overallStats.avgScore}%
											</p>
										</div>
										<div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
											<BarChart3 className="h-5 w-5 text-white" />
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Class Risk Overview (anonymized indicators) */}
						{analyticsData.riskSummary && (
							<div className="space-y-6">
								<div className="flex items-center gap-4">
									<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
										{language === 'bm' ? 'Ringkasan Risiko Kelas' : 'Class Risk Overview'}
										<AlertCircle className="h-6 w-6 text-red-500" />
									</h2>
									<div className="h-px bg-neutral-200 flex-1" />
								</div>
								<Card className="border-none shadow-sm">
									<CardHeader>
										<CardDescription>
											{language === 'bm'
												? 'Ringkasan pelajar berisiko tanpa mendedahkan identiti'
												: 'Summary of at-risk learners without revealing identities'}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="grid gap-4 md:grid-cols-4">
											<div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
												<div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
													<AlertCircle className="h-5 w-5" />
												</div>
												<div>
													<p className="text-xs font-medium text-red-600 uppercase tracking-wide">
														{language === 'bm' ? 'Pelajar Risiko Tinggi' : 'High-Risk Students'}
													</p>
													<p className="text-2xl font-bold text-red-700">
														{analyticsData.riskSummary.highRiskCount}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100">
												<div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
													<AlertTriangle className="h-5 w-5" />
												</div>
												<div>
													<p className="text-xs font-medium text-orange-600 uppercase tracking-wide">
														{language === 'bm' ? 'Pelajar Risiko Sederhana' : 'Medium-Risk Students'}
													</p>
													<p className="text-2xl font-bold text-orange-700">
														{analyticsData.riskSummary.mediumRiskCount}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
												<div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
													<FileWarning className="h-5 w-5" />
												</div>
												<div>
													<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
														{language === 'bm' ? 'Purata Tarikh Akhir Terlepas' : 'Average Missed Deadlines'}
													</p>
													<p className="text-2xl font-bold text-neutral-900">
														{analyticsData.riskSummary.avgMissedDeadlines}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
												<div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
													<Clock className="h-5 w-5" />
												</div>
												<div>
													<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
														{language === 'bm' ? 'Purata Hari Tanpa Aktiviti' : 'Average Days Inactive'}
													</p>
													<p className="text-2xl font-bold text-neutral-900">
														{analyticsData.riskSummary.avgDaysInactive}
													</p>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Completion Rate Trend */}
						{/* Completion Rate Trend */}
						<div className="mt-8">
							<div className="flex items-center gap-4 mb-6">
								<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
									{language === 'bm' ? 'Kadar Penyiapan Kelas' : 'Class Completion Rate'}
									<Activity className="h-6 w-6 text-emerald-500" />
								</h2>
								<div className="h-px bg-neutral-200 flex-1" />
							</div>
							<Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-neutral-200 overflow-hidden">
								<CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent border-b border-neutral-100">
									<CardDescription className="text-emerald-700/80 font-medium">
										{language === 'bm'
											? 'Trend kadar penyiapan selama 7 minggu terakhir'
											: 'Completion rate trend over the last 7 weeks'}
									</CardDescription>
								</CardHeader>
								<CardContent className="pl-0 pt-6 pr-6">
									<ResponsiveContainer width="100%" height={320}>
										<RechartsAreaChart data={analyticsData.completionRates}>
											<defs>
												<linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
													<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
											<XAxis
												dataKey="week"
												interval={0}
												tick={{ fontSize: 12, fill: '#6b7280' }}
												axisLine={false}
												tickLine={false}
												padding={{ left: 20, right: 20 }}
											/>
											<YAxis
												tickFormatter={(value) => `${value}%`}
												tick={{ fontSize: 12, fill: '#6b7280' }}
												axisLine={false}
												tickLine={false}
												width={40}
											/>
											<Tooltip
												formatter={(value) => [`${value}%`, 'Completion Rate']}
												contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
												cursor={{ stroke: '#10b981', strokeWidth: 1 }}
											/>
											<Area
												type="natural"
												dataKey="Completion Rate"
												stroke="#10b981"
												strokeWidth={3}
												fillOpacity={1}
												fill="url(#colorCompletion)"
												animationDuration={1500}
											/>
										</RechartsAreaChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</div>

						{/* Average Score Trend */}
						{/* Average Score Trend */}
						<div className="mt-8">
							<div className="flex items-center gap-4 mb-6">
								<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
									{language === 'bm' ? 'Trend Skor Purata' : 'Average Score Trend'}
									<Target className="h-6 w-6 text-emerald-500" />
								</h2>
								<div className="h-px bg-neutral-200 flex-1" />
							</div>
							<Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-neutral-200 overflow-hidden">
								<CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent border-b border-neutral-100">
									<CardDescription className="text-emerald-700/80 font-medium">
										{language === 'bm'
											? 'Trend skor purata selama 7 minggu terakhir'
											: 'Average score trend over the last 7 weeks'}
									</CardDescription>
								</CardHeader>
								<CardContent className="pl-0 pt-6 pr-6">
									<ResponsiveContainer width="100%" height={320}>
										<RechartsAreaChart data={analyticsData.scoreTrends}>
											<defs>
												<linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
													<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
											<XAxis
												dataKey="week"
												interval={0}
												tick={{ fontSize: 12, fill: '#6b7280' }}
												axisLine={false}
												tickLine={false}
												padding={{ left: 20, right: 20 }}
											/>
											<YAxis
												tickFormatter={(value) => `${value}%`}
												tick={{ fontSize: 12, fill: '#6b7280' }}
												axisLine={false}
												tickLine={false}
												width={40}
											/>
											<Tooltip
												formatter={(value) => [`${value}%`, 'Average Score']}
												contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
												cursor={{ stroke: '#10b981', strokeWidth: 1 }}
											/>
											<Area
												type="natural"
												dataKey="Average Score"
												stroke="#10b981"
												strokeWidth={3}
												fillOpacity={1}
												fill="url(#colorScore)"
												animationDuration={1500}
											/>
										</RechartsAreaChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</div>

						{/* At-Risk Students */}
						<div className="mt-8">
							<div className="flex items-center gap-4 mb-6">
								<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
									{language === 'bm' ? 'Pelajar Berisiko' : 'At-Risk Students'}
									<AlertTriangle className="h-6 w-6 text-warning" />
								</h2>
								<div className="h-px bg-neutral-200 flex-1" />
							</div>
							<Card className="border-none shadow-sm">
								<CardHeader>
									<CardDescription>
										{language === 'bm'
											? 'Pelajar yang memerlukan perhatian (skor rendah, aktiviti rendah)'
											: 'Students who need attention (low scores, low activity)'}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{analyticsData.atRiskStudents.length === 0 ? (
										<p className="text-body text-muted-foreground text-center py-8">
											{language === 'bm'
												? 'Tiada pelajar berisiko pada masa ini.'
												: 'No at-risk students at this time.'}
										</p>
									) : (
										<div className="space-y-4">
											{analyticsData.atRiskStudents.map((student, idx) => (
												<div
													key={idx}
													className={`group relative overflow-hidden p-5 border rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${student.riskLevel === 'high'
														? 'border-red-100 bg-white hover:border-red-300'
														: 'border-yellow-100 bg-white hover:border-yellow-300'
														}`}
													onClick={() => {
														setSelectedStudent(student);
														setShowStudentDetail(true);
													}}
												>
													{/* Status indicator bar */}
													<div className={`absolute left-0 top-0 bottom-0 w-1 ${student.riskLevel === 'high' ? 'bg-red-500' : 'bg-yellow-500'
														}`}></div>

													<div className="flex items-center justify-between mb-4 pl-2">
														<div className="flex items-center gap-3">
															<div className={`h-10 w-10 rounded-full flex items-center justify-center ${student.riskLevel === 'high'
																? 'bg-red-50 text-red-600'
																: 'bg-yellow-50 text-yellow-600'
																}`}>
																<span className="font-bold text-sm">{student.studentName.charAt(0)}</span>
															</div>
															<div>
																<h4 className="font-semibold text-neutral-900">{student.studentName}</h4>
																<p className="text-xs text-muted-foreground">{student.email}</p>
															</div>
														</div>
														<span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${student.riskLevel === 'high'
															? 'bg-red-100 text-red-700 ring-1 ring-red-200'
															: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200'
															}`}>
															{student.riskLevel === 'high'
																? (language === 'bm' ? 'Risiko Tinggi' : 'High Risk')
																: (language === 'bm' ? 'Risiko Sederhana' : 'Medium Risk')}
														</span>
													</div>
													<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pl-2">
														<div className="bg-neutral-50 p-2 rounded-lg">
															<p className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
																<BarChart3 className="h-3.5 w-3.5 text-blue-500" />
																{language === 'bm' ? 'Skor Purata' : 'Average Score'}
															</p>
															<p className="font-bold text-neutral-800 text-lg">{Math.round(student.avgScore)}%</p>
														</div>
														<div className="bg-neutral-50 p-2 rounded-lg">
															<p className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
																<Target className="h-3.5 w-3.5 text-green-500" />
																{language === 'bm' ? 'Kadar Penyiapan' : 'Completion'}
															</p>
															<p className="font-bold text-neutral-800 text-lg">{Math.round(student.completionRate)}%</p>
														</div>
														<div className="bg-neutral-50 p-2 rounded-lg">
															<p className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
																<FileText className="h-3.5 w-3.5 text-orange-500" />
																{language === 'bm' ? 'Tarikh Akhir Terlepas' : 'Missed Deadlines'}
															</p>
															<p className="font-bold text-neutral-800 text-lg">{student.missedDeadlines || 0}</p>
														</div>
														<div className="bg-neutral-50 p-2 rounded-lg">
															<p className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
																<Clock className="h-3.5 w-3.5 text-purple-500" />
																{language === 'bm' ? 'Hari Tanpa Aktiviti' : 'Days Inactive'}
															</p>
															<p className="font-bold text-neutral-800 text-lg">{student.daysSinceActivity}</p>
														</div>
													</div>
													{student.riskReasons && student.riskReasons.length > 0 && (
														<div className="mt-4 pl-2 bg-red-50/50 p-3 rounded-lg border border-red-100">
															<p className="text-xs font-semibold text-red-900 mb-2">
																{language === 'bm' ? 'Faktor Risiko Utama:' : 'Key Risk Factors:'}
															</p>
															<ul className="text-xs text-red-700/80 space-y-1 list-disc list-inside">
																{student.riskReasons.slice(0, 2).map((reason, index) => (
																	<li key={index}>{reason}</li>
																))}
																{student.riskReasons.length > 2 && (
																	<li className="list-none text-red-500 italic pl-1">
																		+{student.riskReasons.length - 2} {language === 'bm' ? 'lagi' : 'more'}...
																	</li>
																)}
															</ul>
														</div>
													)}
													<div className="mt-4 flex gap-2 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
														<Button
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																setNotificationStudent(student);
																setNotificationGuidance('');
																setShowNotificationModal(true);
															}}
															className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
														>
															<Send className="h-3.5 w-3.5" />
															{language === 'bm' ? 'Hantar Notifikasi' : 'Notify Student'}
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Topic Heatmap */}
						<div className="mt-8">
							<div className="flex items-center gap-4 mb-6">
								<h2 className="text-xl font-bold text-neutralDark flex items-center gap-2">
									{language === 'bm' ? 'Peta Haba Topik' : 'Topic Heatmap'}
									<LayoutDashboard className="h-6 w-6 text-primary" />
								</h2>
								<div className="h-px bg-neutral-200 flex-1" />
							</div>
							<Card className="border-none shadow-sm">
								<CardHeader>
									<CardDescription>
										{language === 'bm'
											? 'Topik yang pelajar bergelut (berdasarkan kadar penyiapan dan skor)'
											: 'Topics students struggle with (based on completion rate and scores)'}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{analyticsData.topicHeatmap.length === 0 ? (
										<p className="text-body text-muted-foreground text-center py-8">
											{language === 'bm'
												? 'Tiada data topik tersedia.'
												: 'No topic data available.'}
										</p>
									) : (
										<div className="space-y-4">
											{analyticsData.topicHeatmap.map((topic, idx) => (
												<div
													key={idx}
													className={`p-5 border rounded-xl hover:shadow-md transition-all duration-300 ${topic.struggleLevel === 'high'
														? 'border-red-200 bg-red-50/30'
														: topic.struggleLevel === 'medium'
															? 'border-yellow-200 bg-yellow-50/30'
															: 'border-green-200 bg-green-50/30'
														}`}
												>
													<div className="flex items-center justify-between mb-4">
														<div className="flex items-center gap-3">
															<div className={`w-2 h-2 rounded-full ${topic.struggleLevel === 'high'
																? 'bg-red-500'
																: topic.struggleLevel === 'medium'
																	? 'bg-yellow-500'
																	: 'bg-green-500'
																}`}></div>
															<h4 className="font-bold text-neutral-800">{topic.topic}</h4>
														</div>
														<span className={`px-3 py-1 rounded-full text-xs font-semibold ${topic.struggleLevel === 'high'
															? 'bg-red-100 text-red-700'
															: topic.struggleLevel === 'medium'
																? 'bg-yellow-100 text-yellow-700'
																: 'bg-green-100 text-green-700'
															}`}>
															{topic.struggleLevel === 'high'
																? (language === 'bm' ? 'Sukar' : 'Struggling')
																: topic.struggleLevel === 'medium'
																	? (language === 'bm' ? 'Sederhana' : 'Moderate')
																	: (language === 'bm' ? 'Baik' : 'Good')}
														</span>
													</div>
													<div className="grid grid-cols-3 gap-6 text-sm">
														<div className="space-y-1">
															<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
																{language === 'bm' ? 'Kadar Penyiapan' : 'Completion'}
															</p>
															<div className="flex items-end gap-2">
																<span className="text-xl font-bold text-neutral-900">{topic.completionRate}%</span>
																<div className="w-full bg-neutral-200 rounded-full h-1.5 mb-1.5">
																	<div
																		className="bg-neutral-800 h-1.5 rounded-full"
																		style={{ width: `${topic.completionRate}%` }}
																	></div>
																</div>
															</div>
														</div>
														<div className="space-y-1">
															<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
																{language === 'bm' ? 'Skor Purata' : 'Average Score'}
															</p>
															<div className="flex items-end gap-2">
																<span className="text-xl font-bold text-neutral-900">{topic.avgScore}%</span>
																<div className="w-full bg-neutral-200 rounded-full h-1.5 mb-1.5">
																	<div
																		className={`h-1.5 rounded-full ${topic.avgScore < 60 ? 'bg-red-500' : 'bg-green-500'}`}
																		style={{ width: `${topic.avgScore}%` }}
																	></div>
																</div>
															</div>
														</div>
														<div className="text-right space-y-1">
															<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
																{language === 'bm' ? 'Selesai' : 'Completed'}
															</p>
															<p className="text-xl font-bold text-neutral-900">
																{topic.studentsCompleted} <span className="text-sm font-normal text-muted-foreground">/ {topic.totalStudents}</span>
															</p>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</>
				)
				}

				{/* Student Detail Modal */}
				{
					showStudentDetail && selectedStudent && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
							<Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="flex items-center gap-2">
											<AlertTriangle className={`h-5 w-5 ${selectedStudent.riskLevel === 'high' ? 'text-red-500' : 'text-yellow-500'
												}`} />
											{language === 'bm' ? 'Butiran Risiko Pelajar' : 'Student Risk Details'}
										</CardTitle>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setShowStudentDetail(false);
												setSelectedStudent(null);
											}}
										>
											×
										</Button>
									</div>
									<CardDescription>
										{selectedStudent.studentName} - {analyticsData.courseTitle}
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Risk Level Badge */}
									<div className="flex items-center gap-4">
										<span className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedStudent.riskLevel === 'high'
											? 'bg-red-100 text-red-800 border border-red-300'
											: selectedStudent.riskLevel === 'medium'
												? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
												: 'bg-green-100 text-green-800 border border-green-300'
											}`}>
											{selectedStudent.riskLevel === 'high'
												? (language === 'bm' ? 'Risiko Tinggi' : 'High Risk')
												: selectedStudent.riskLevel === 'medium'
													? (language === 'bm' ? 'Risiko Sederhana' : 'Medium Risk')
													: (language === 'bm' ? 'Risiko Rendah' : 'Low Risk')}
										</span>
									</div>

									{/* Risk Reasons */}
									{selectedStudent.riskReasons && selectedStudent.riskReasons.length > 0 && (
										<div>
											<h3 className="text-h4 font-semibold text-neutralDark mb-3">
												{language === 'bm' ? 'Faktor Risiko' : 'Risk Factors'}
											</h3>
											<ul className="space-y-2">
												{selectedStudent.riskReasons.map((reason, index) => (
													<li key={index} className="flex items-start gap-2 p-3 bg-neutralLight rounded-lg">
														<AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
														<span className="text-sm text-neutralDark">{reason}</span>
													</li>
												))}
											</ul>
										</div>
									)}

									{/* Performance Metrics */}
									<div>
										<h3 className="text-h4 font-semibold text-neutralDark mb-3">
											{language === 'bm' ? 'Metrik Prestasi' : 'Performance Metrics'}
										</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="p-4 bg-neutralLight rounded-lg">
												<div className="flex items-center gap-2 mb-2">
													<BarChart3 className="h-4 w-4 text-info" />
													<span className="text-sm font-medium">
														{language === 'bm' ? 'Skor Purata' : 'Average Score'}
													</span>
												</div>
												<p className="text-2xl font-bold text-neutralDark">
													{Math.round(selectedStudent.avgScore)}%
												</p>
											</div>
											<div className="p-4 bg-neutralLight rounded-lg">
												<div className="flex items-center gap-2 mb-2">
													<Target className="h-4 w-4 text-success" />
													<span className="text-sm font-medium">
														{language === 'bm' ? 'Kadar Penyiapan' : 'Completion Rate'}
													</span>
												</div>
												<p className="text-2xl font-bold text-neutralDark">
													{Math.round(selectedStudent.completionRate)}%
												</p>
											</div>
											<div className="p-4 bg-neutralLight rounded-lg">
												<div className="flex items-center gap-2 mb-2">
													<FileText className="h-4 w-4 text-warning" />
													<span className="text-sm font-medium">
														{language === 'bm' ? 'Tarikh Akhir Terlepas' : 'Missed Deadlines'}
													</span>
												</div>
												<p className="text-2xl font-bold text-neutralDark">
													{selectedStudent.missedDeadlines || 0}
												</p>
											</div>
											<div className="p-4 bg-neutralLight rounded-lg">
												<div className="flex items-center gap-2 mb-2">
													<Clock className="h-4 w-4 text-warning" />
													<span className="text-sm font-medium">
														{language === 'bm' ? 'Hari Tanpa Aktiviti' : 'Days Inactive'}
													</span>
												</div>
												<p className="text-2xl font-bold text-neutralDark">
													{selectedStudent.daysSinceActivity}
												</p>
											</div>
										</div>
									</div>

									{/* Detailed Stats */}
									<div>
										<h3 className="text-h4 font-semibold text-neutralDark mb-3">
											{language === 'bm' ? 'Statistik Terperinci' : 'Detailed Statistics'}
										</h3>
										<div className="space-y-2 text-sm">
											<div className="flex justify-between p-2 bg-neutralLight rounded">
												<span className="text-muted-foreground">
													{language === 'bm' ? 'Pelajaran Selesai' : 'Lessons Completed'}
												</span>
												<span className="font-medium">
													{selectedStudent.completedLessons || 0} / {selectedStudent.totalLessons || 0}
												</span>
											</div>
											<div className="flex justify-between p-2 bg-neutralLight rounded">
												<span className="text-muted-foreground">
													{language === 'bm' ? 'Modul Selesai' : 'Modules Completed'}
												</span>
												<span className="font-medium">
													{selectedStudent.completedModules || 0} / {selectedStudent.totalModules || 0}
												</span>
											</div>
											<div className="flex justify-between p-2 bg-neutralLight rounded">
												<span className="text-muted-foreground">
													{language === 'bm' ? 'Jumlah Penilaian' : 'Total Assessments'}
												</span>
												<span className="font-medium">
													{selectedStudent.scores?.length || 0}
												</span>
											</div>
											{selectedStudent.lastActivity && (
												<div className="flex justify-between p-2 bg-neutralLight rounded">
													<span className="text-muted-foreground">
														{language === 'bm' ? 'Aktiviti Terakhir' : 'Last Activity'}
													</span>
													<span className="font-medium">
														{selectedStudent.lastActivity.toDate
															? selectedStudent.lastActivity.toDate().toLocaleDateString()
															: new Date(selectedStudent.lastActivity).toLocaleDateString()}
													</span>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)
				}

				{/* Send Notification Modal */}
				{
					showNotificationModal && notificationStudent && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
							<Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
								<CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
												<Send className="h-5 w-5 text-primary" />
											</div>
											<div>
												<CardTitle className="text-h3">
													{language === 'bm' ? 'Hantar Notifikasi' : 'Send Notification'}
												</CardTitle>
												<CardDescription className="mt-1">
													{language === 'bm'
														? `Kepada: ${notificationStudent.studentName}`
														: `To: ${notificationStudent.studentName}`}
												</CardDescription>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setShowNotificationModal(false);
												setNotificationStudent(null);
												setNotificationGuidance('');
											}}
											className="h-8 w-8 p-0"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								</CardHeader>
								<CardContent className="pt-6 space-y-4">
									{/* Course Info */}
									<div className="p-3 bg-neutralLight rounded-lg border border-border">
										<div className="flex items-center gap-2 text-sm">
											<BookOpen className="h-4 w-4 text-primary" />
											<span className="font-medium text-neutralDark">
												{analyticsData?.courseTitle || 'Course'}
											</span>
										</div>
									</div>

									{/* Risk Level Info */}
									{notificationStudent.riskLevel && (
										<div className={`p-3 rounded-lg border ${notificationStudent.riskLevel === 'high'
											? 'bg-red-50 border-red-200'
											: 'bg-yellow-50 border-yellow-200'
											}`}>
											<div className="flex items-center gap-2">
												<AlertTriangle className={`h-4 w-4 ${notificationStudent.riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600'
													}`} />
												<span className="text-sm font-semibold text-neutralDark">
													{language === 'bm' ? 'Tahap Risiko:' : 'Risk Level:'} {' '}
													<span className={
														notificationStudent.riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600'
													}>
														{notificationStudent.riskLevel === 'high'
															? (language === 'bm' ? 'Tinggi' : 'High')
															: (language === 'bm' ? 'Sederhana' : 'Medium')}
													</span>
												</span>
											</div>
										</div>
									)}

									{/* Guidance Input */}
									<div className="space-y-2">
										<label className="text-sm font-semibold text-neutralDark flex items-center gap-2">
											<Lightbulb className="h-4 w-4 text-primary" />
											{language === 'bm' ? 'Panduan atau Cadangan' : 'Guidance or Recommendations'}
											<span className="text-xs font-normal text-red-500">*</span>
										</label>
										<textarea
											value={notificationGuidance}
											onChange={(e) => setNotificationGuidance(e.target.value)}
											placeholder={language === 'bm'
												? 'Masukkan panduan atau cadangan untuk pelajar ini...'
												: 'Enter guidance or recommendations for this student...'}
											className="w-full min-h-[120px] px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm transition-all"
											maxLength={500}
										/>
										<div className="flex justify-between items-center text-xs text-muted-foreground">
											<span>
												{language === 'bm'
													? 'Notifikasi akan dihantar kepada pelajar dengan mesej pemberitahuan risiko.'
													: 'Notification will be sent to the student with a risk alert message.'}
											</span>
											<span>{notificationGuidance.length}/500</span>
										</div>
									</div>

									{/* Preview Message */}
									<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
										<p className="text-xs font-semibold text-blue-900 mb-1">
											{language === 'bm' ? 'Pratonton Mesej:' : 'Message Preview:'}
										</p>
										<p className="text-xs text-blue-800 leading-relaxed">
											{language === 'bm'
												? `Guru anda telah menghantar pemberitahuan mengenai prestasi pembelajaran anda dalam kursus "${analyticsData?.courseTitle || 'this course'}".`
												: `Your teacher has sent a notification regarding your learning performance in the course "${analyticsData?.courseTitle || 'this course'}".`}
										</p>
									</div>

									{/* Action Buttons */}
									<div className="flex gap-3 pt-2">
										<Button
											variant="outline"
											onClick={() => {
												setShowNotificationModal(false);
												setNotificationStudent(null);
												setNotificationGuidance('');
											}}
											className="flex-1"
										>
											{language === 'bm' ? 'Batal' : 'Cancel'}
										</Button>
										<Button
											onClick={async () => {
												// Validate message content
												if (!notificationGuidance.trim()) {
													setToast({
														type: 'error',
														message: language === 'bm'
															? 'Sila masukkan mesej panduan.'
															: 'Please enter a guidance message.'
													});
													return;
												}

												// Validate student data before sending
												if (!notificationStudent || !notificationStudent.studentId) {
													console.error('Invalid student data:', notificationStudent);
													alert(language === 'bm'
														? 'Ralat: Data pelajar tidak sah. Sila cuba lagi.'
														: 'Error: Invalid student data. Please try again.');
													return;
												}

												if (!selectedCourseId) {
													console.error('No course selected');
													alert(language === 'bm'
														? 'Ralat: Tiada kursus dipilih.'
														: 'Error: No course selected.');
													return;
												}

												setSendingNotification(true);
												try {
													await api.post('/api/notifications', {
														userId: notificationStudent.studentId,
														type: 'risk_alert',
														title: language === 'bm'
															? `Pemberitahuan Risiko - ${analyticsData?.courseTitle || 'Course'}`
															: `Risk Notification - ${analyticsData?.courseTitle || 'Course'}`,
														message: language === 'bm'
															? `Guru anda telah menghantar pemberitahuan mengenai prestasi pembelajaran anda dalam kursus ini.`
															: `Your teacher has sent a notification regarding your learning performance in this course.`,
														courseId: selectedCourseId,
														guidance: notificationGuidance.trim() || null,
													});
													setShowNotificationModal(false);
													setNotificationStudent(null);
													setNotificationGuidance('');
													setToast({
														type: 'success',
														message: language === 'bm' ? 'Notifikasi berjaya dihantar!' : 'Notification sent successfully!'
													});
												} catch (err) {
													console.error('Error sending notification:', err);
													setToast({
														type: 'error',
														message: language === 'bm'
															? `Ralat menghantar notifikasi: ${err.message || 'Sila cuba lagi.'}`
															: `Error sending notification: ${err.message || 'Please try again.'}`
													});
												} finally {
													setSendingNotification(false);
												}
											}}
											disabled={sendingNotification}
											className="flex-1 flex items-center justify-center gap-2"
										>
											{sendingNotification ? (
												<>
													<Clock className="h-4 w-4 animate-spin" />
													{language === 'bm' ? 'Menghantar...' : 'Sending...'}
												</>
											) : (
												<>
													<Send className="h-4 w-4" />
													{language === 'bm' ? 'Hantar' : 'Send'}
												</>
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					)
				}
				{
					toast && (
						<Toast
							message={toast.message}
							type={toast.type}
							onClose={() => setToast(null)}
						/>
					)
				}
			</div>
		</div>
	);
}
