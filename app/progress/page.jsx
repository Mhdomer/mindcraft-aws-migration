'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, CheckCircle, Clock, Award, FileText, ClipboardCheck, TrendingUp, TrendingDown, Calendar, AlertTriangle, Target, Lightbulb, Info, Activity, Printer, Download, LayoutDashboard, ArrowLeft, ArrowRight, Filter, Users, Play, FlaskConical, MessagesSquare, PlayCircle, Zap, Map, Search, Timer, Crown, GraduationCap, Mail, ExternalLink, File, Send, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/Toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart } from '@tremor/react';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import CertificateTemplate from '@/components/CertificateTemplate';
import AIInsight from '@/components/AIInsight';

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

const SKILL_TAXONOMY = {
	'sql-fundamentals': {
		title: { en: 'SQL Fundamentals', bm: 'Asas SQL' },
		skills: {
			'sql-basics': {
				name: { en: 'SQL Basics', bm: 'Asas SQL' },
				keywords: ['Basic', 'Intro', 'SQL', 'Select'],
				remedy: { en: 'Review Module 1: Introduction to SQL', bm: 'Ulangkaji Modul 1: Pengenalan kepada SQL' }
			},
			'data-types': {
				name: { en: 'Data Types', bm: 'Jenis Data' },
				keywords: ['Types', 'Data', 'String', 'Int'],
				remedy: { en: 'Practice Lab: Data Type Conversion', bm: 'Latihan Makmal: Penukaran Jenis Data' }
			}
		}
	},
	'advanced-operations': {
		title: { en: 'Advanced Operations', bm: 'Operasi Lanjutan' },
		skills: {
			'joins': {
				name: { en: 'JOIN Operations', bm: 'Operasi JOIN' },
				keywords: ['Join', 'Inner', 'Outer', 'Relation'],
				remedy: { en: 'Watch Video: Mastering Inner & Outer Joins', bm: 'Tonton Video: Menguasai Inner & Outer Joins' }
			},
			'aggregations': {
				name: { en: 'Aggregations', bm: 'Pengagregatan' },
				keywords: ['Sum', 'Count', 'Group', 'Avg'],
				remedy: { en: 'Complete Quiz: Group By & Having', bm: 'Selesaikan Kuiz: Group By & Having' }
			}
		}
	},
	'design-security': {
		title: { en: 'Design & Security', bm: 'Reka Bentuk & Keselamatan' },
		skills: {
			'database-design': {
				name: { en: 'Database Design', bm: 'Reka Bentuk Pangkalan Data' },
				keywords: ['Design', 'Schema', 'Normal', 'Keys'],
				remedy: { en: 'Read Article: Normalization Forms', bm: 'Baca Artikel: Bentuk Normalisasi' }
			},
			'security': {
				name: { en: 'Security', bm: 'Keselamatan' },
				keywords: ['Security', 'Roles', 'Access', 'Permission'],
				remedy: { en: 'Review Security Best Practices', bm: 'Ulangkaji Amalan Terbaik Keselamatan' }
			}
		}
	}
};

export default function ProgressPage() {
	const { language } = useLanguage();
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [studentName, setStudentName] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [courseProgress, setCourseProgress] = useState([]);
	const [riskIndicators, setRiskIndicators] = useState({});
	const [achievements, setAchievements] = useState([]);
	const [selectedRiskCourseId, setSelectedRiskCourseId] = useState('all');
	const [strongTopics, setStrongTopics] = useState([]);
	const [competency, setCompetency] = useState([]); // New state for Radar Chart
	const [scoreTrend, setScoreTrend] = useState([]); 	// US011-03 states
	const [showSkillReportPreview, setShowSkillReportPreview] = useState(false); // Preview modal state
	// Study Plan Dialog State
	const [studyDialogOpen, setStudyDialogOpen] = useState(false);
	const [studyDate, setStudyDate] = useState('');
	const [studyDuration, setStudyDuration] = useState('60');

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
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [currentView, setCurrentView] = useState(searchParams.get('view') || 'hub');

	// Sync currentView with URL
	useEffect(() => {
		const params = new URLSearchParams(searchParams);
		if (currentView && currentView !== 'hub') {
			params.set('view', currentView);
		} else {
			params.delete('view');
		}
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	}, [currentView, pathname, router, searchParams]);
	const [aiRecommendations, setAiRecommendations] = useState([]);

	useEffect(() => {
		if (courseProgress.length === 0) return;

		const recs = [];

		// 1. Adaptive Content Recommendations (Based on Competency)
		const weakAreas = competency.filter(c => c.A < 70);
		if (weakAreas.length > 0) {
			weakAreas.forEach(area => {
				let type = 'weakness';
				let actionLabel = language === 'bm' ? 'Ulangkaji' : 'Review Now';
				let icon = AlertTriangle;
				let description = '';
				let secondaryAction = null;

				// Adaptive Logic
				if (area.A < 40) {
					// Serious Gap -> Interactive Lab
					description = language === 'bm'
						? `Skor ${area.A}% menunjukkan jurang besar. Disarankan ambil Makmal Interaktif untuk latihan praktikal.`
						: `Score of ${area.A}% indicates a gap. Recommended: Interactive Fundamentals Lab for hands-on practice.`;
					actionLabel = language === 'bm' ? 'Mula Makmal' : 'Start Lab';
					icon = FlaskConical; // Need to import
					secondaryAction = { label: 'Ask AI Tutor', icon: MessagesSquare }; // Need to import
				} else if (area.A < 60) {
					// Moderate Gap -> Video Tutorial
					description = language === 'bm'
						? `Skor ${area.A}% perlukan perhatian. Tonton tutorial video untuk memahami konsep asas.`
						: `Score of ${area.A}%. Recommended: Watch "Deep Dive" Video Tutorial to reinforce concepts.`;
					actionLabel = language === 'bm' ? 'Tonton Video' : 'Watch Video';
					icon = PlayCircle; // Need to import
					secondaryAction = { label: 'Quick Quiz', icon: BookOpen };
				} else {
					// Minor Gap -> Micro-Learning
					description = language === 'bm'
						? `Hampir menguasai (${area.A}%). Ambil sesi 5-minit "Micro-Learning" untuk gilap topik ini.`
						: `Almost there (${area.A}%). Suggested: 5-minute "Micro-Learning" refresher to close the gap.`;
					actionLabel = language === 'bm' ? 'Mula Sesi Pendek' : 'Start Micro-Lesson';
					icon = Zap; // Need to import
				}

				recs.push({
					type: 'adaptive',
					title: language === 'bm' ? `Tingkatkan: ${area.title}` : `Improve: ${area.title}`,
					description: description,
					actionLabel: actionLabel,
					priority: area.A < 40 ? 'critical' : 'high',
					color: area.A < 40 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-orange-50 border-orange-200 text-orange-900',
					icon: icon,
					secondaryAction: secondaryAction
				});
			});
		}

		// 2. Career Path & Skill Gap
		// Simulate a "Database Administrator" path goal
		const dbCourse = courseProgress.find(c => c.courseTitle.includes('Database') || c.courseTitle.includes('SQL'));
		if (dbCourse && dbCourse.overallProgress < 100) {
			recs.push({
				type: 'career',
				title: language === 'bm' ? 'Laluan Kerjaya: Pentadbir Pangkalan Data' : 'Career Path: Database Admin',
				description: language === 'bm'
					? `Anda 80% ke arah pensijilan DBA. Lengkapkan 2 modul SQL seterusnya untuk capai tahap kompetensi.`
					: `You are on track for the DBA Certification. Complete the next 2 Advanced SQL modules to reach 100% competency.`,
				actionLabel: language === 'bm' ? 'Lihat Laluan' : 'View Path',
				priority: 'medium',
				color: 'bg-blue-50 border-blue-200 text-blue-900',
				icon: Map, // Need to import
				secondaryAction: null
			});
		}

		// 3. Social Learning (Peer Groups)
		const difficultCourse = courseProgress.find(c => c.avgAssessmentScore > 40 && c.avgAssessmentScore < 70);
		if (difficultCourse) {
			recs.push({
				type: 'social',
				title: language === 'bm' ? 'Kumpulan Belajar Rakan Sebaya' : 'Peer Study Group',
				description: language === 'bm'
					? `3 pelajar lain sedang ulangkaji ${difficultCourse.courseTitle}. Sertai kumpulan belajar sementara?`
					: `3 other students are currently studying ${difficultCourse.courseTitle}. Would you like to join a study group?`,
				actionLabel: language === 'bm' ? 'Sertai Kumpulan' : 'Join Group',
				priority: 'medium',
				color: 'bg-indigo-50 border-indigo-200 text-indigo-900',
				icon: Users,
				secondaryAction: { label: 'Find Buddy', icon: Search }
			});
		}

		// 4. Behavioral Nudges (Inactivity/Momentum)
		// Check for inactivity (Mock logic using risk data if available, else assumption)
		const atRisk = Object.values(riskIndicators).some(r => r.daysSinceActivity > 3);
		if (atRisk) {
			recs.push({
				type: 'nudge',
				title: language === 'bm' ? 'Jangan Hilang Momentum!' : 'Don\'t Lose Momentum!',
				description: language === 'bm'
					? 'Anda tidak aktif selama 3 hari. Satu pelajaran lagi untuk capai sasaran mingguan anda.'
					: 'You\'ve been away for 3 days. Complete just one lesson today to keep your streak alive.',
				actionLabel: language === 'bm' ? 'Sambung Belajar' : 'Resume Learning',
				priority: 'low',
				color: 'bg-slate-50 border-slate-200 text-slate-800',
				icon: Timer, // Need to import
				secondaryAction: null
			});
		}

		// 5. Challenge (High Performers)
		const aceCourses = courseProgress.filter(c => c.avgAssessmentScore >= 90);
		if (aceCourses.length > 0) {
			recs.push({
				type: 'challenge',
				title: language === 'bm' ? 'Mod Cabaran: Pakar' : 'Challenge Mode: Expert',
				description: language === 'bm'
					? 'Skor anda cemerlang! Cuba ambil peranan "Mentor Rakan Sebaya" untuk dapat lencana khas.'
					: 'You are crushing it! Unlock the "Peer Mentor" badge by helping 2 students with their queries.',
				actionLabel: language === 'bm' ? 'Jadi Mentor' : 'Become Mentor',
				priority: 'low',
				color: 'bg-purple-50 border-purple-200 text-purple-900',
				icon: Crown, // Need to import
			});
		}

		setAiRecommendations(recs);
	}, [courseProgress, competency, riskIndicators, language]);

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

	// Certificate Generation State
	const certificateRef = useRef(null);
	const [certificateData, setCertificateData] = useState(null);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

	// Instructor Contact State
	const [contactDialogOpen, setContactDialogOpen] = useState(false);
	const [selectedContactCourse, setSelectedContactCourse] = useState(null);
	const [contactSubject, setContactSubject] = useState('');
	const [contactMessage, setContactMessage] = useState('');
	const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
	const [isSendingMessage, setIsSendingMessage] = useState(false);

	const showToast = (message, type = 'info') => {
		setToast({ message, type, visible: true });
	};

	const handleHideToast = () => {
		setToast(prev => ({ ...prev, visible: false }));
	};

	const handleOpenContact = (course) => {
		setSelectedContactCourse(course);
		setContactSubject('');
		setContactMessage('');
		setContactDialogOpen(true);
	};

	const handleSendMessage = async () => {
		// Validation
		if (!contactSubject.trim()) {
			showToast(language === 'bm' ? 'Sila masukkan subjek.' : 'Please enter a subject.', 'error');
			return;
		}
		if (!contactMessage.trim()) {
			showToast(language === 'bm' ? 'Sila masukkan mesej anda.' : 'Please enter your message.', 'error');
			return;
		}

		setIsSendingMessage(true);
		try {
			await addDoc(collection(db, 'messages'), {
				fromUserId: currentUserId,
				fromName: studentName,
				toInstructor: selectedContactCourse.instructor || 'Instructor',
				// In a real app, you'd want the instructor's User ID. 
				// Since we don't have it easily mapped here, we'll store the name and course for the admin/teacher dashboard to filter.
				courseId: selectedContactCourse.courseId,
				courseTitle: selectedContactCourse.courseTitle,
				subject: contactSubject,
				message: contactMessage,
				read: false,
				createdAt: serverTimestamp(),
				type: 'student_inquiry'
			});

			setContactDialogOpen(false);
			showToast(language === 'bm' ? 'Mesej berjaya dihantar!' : 'Message sent successfully!', 'success');
		} catch (error) {
			console.error("Error sending message:", error);
			showToast(language === 'bm' ? 'Gagal menghantar mesej.' : 'Failed to send message.', 'error');
		} finally {
			setIsSendingMessage(false);
		}
	};

	// 1. Open Preview Modal
	const handleViewCertificate = (course) => {
		const data = {
			studentName: studentName || "Student Name",
			courseName: course.courseTitle,
			instructorName: course.instructor,
			completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
		};
		setCertificateData(data);
		setShowPreviewModal(true);
	};

	// 2. Generate PDF from Hidden Template
	const handleDownloadCertificate = async () => {
		if (isGeneratingCertificate || !certificateData) return;
		setIsGeneratingCertificate(true);

		// Wait a tick to ensure ref is ready (though it should be constantly rendered while preview is open)
		setTimeout(async () => {
			try {
				const element = certificateRef.current;
				if (!element) throw new Error("Certificate template not found");

				const canvas = await html2canvas(element, {
					scale: 2, // Higher scale for better quality
					useCORS: true,
					backgroundColor: '#ffffff'
				});

				const imgData = canvas.toDataURL('image/png');
				const pdf = new jsPDF({
					orientation: 'landscape',
					unit: 'px',
					format: [800, 600]
				});

				pdf.addImage(imgData, 'PNG', 0, 0, 800, 600);
				pdf.save(`Certificate-${certificateData.courseName.replace(/\s+/g, '-')}.pdf`);

			} catch (error) {
				console.error("Certificate generation failed:", error);
				alert("Failed to generate certificate. Please try again.");
			} finally {
				setIsGeneratingCertificate(false);
				// We don't close the modal automatically, let user close it
			}
		}, 100);
	};

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				// Fetch user profile to get real name for certificate
				try {
					const userDoc = await getDoc(doc(db, 'user', user.uid));
					if (userDoc.exists()) {
						const userData = userDoc.data();
						setUserRole(userData.role);
						setStudentName(userData.name || userData.fullName || 'Student');
					}
				} catch (error) {
					console.error("Error fetching user profile:", error);
					setStudentName('Student');
				}
				loadProgress(user.uid);
			} else {
				setCurrentUserId(null);
				setLoading(false);
			}
		});
		return () => unsubscribe();
	}, [selectedPerformanceCourseId]);

	// Scroll to top when view changes
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [currentView]);

	const handleDownloadSkills = async () => {
		const element = document.getElementById('skill-report-preview-content');
		if (!element) return;

		try {
			const canvas = await html2canvas(element, {
				scale: 2,
				useCORS: true,
				logging: false,
				backgroundColor: '#ffffff'
			});

			const imgData = canvas.toDataURL('image/png');
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

			pdf.setFontSize(18);
			pdf.text('Skill Competency Report', 10, 15);
			pdf.setFontSize(10);
			pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 10, 22);

			pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
			pdf.save('skill-competency-report.pdf');
		} catch (error) {
			console.error('Error generating PDF:', error);
		}
	};

	async function loadProgress(userId) {
		setLoading(true);
		try {
			if (!userId) return;

			// Get all enrollments for this student - now stored in 'progress' collection
			const enrollmentsQuery = query(
				collection(db, 'progress'),
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
						instructor: courseData.authorName, // Map authorName to instructor
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

			// --- SKILL COMPETENCY CALCULATION (Advanced Engine) ---
			const calculatedSkills = {};
			const now = new Date();

			// Initialize skills based on Taxonomy
			Object.entries(SKILL_TAXONOMY).forEach(([catId, category]) => {
				Object.entries(category.skills).forEach(([skillId, skillDef]) => {
					calculatedSkills[skillId] = {
						id: skillId,
						categoryId: catId,
						name: skillDef.name,
						remedy: skillDef.remedy,
						totalScore: 0,
						count: 0,
						lastData: null
					};
				});
			});

			// Helper to process score with decay and confidence
			const processSkillScore = (skillId, rawPercentage, date) => {
				if (!calculatedSkills[skillId]) return;

				// 1. Confidence Weighting (Mocked: Randomly slightly reduce confidence for simulation)
				// In real app, this would check attempt count
				const confidenceFactor = 0.9 + (Math.random() * 0.1);
				let adjustedScore = rawPercentage * confidenceFactor;

				// 2. Recency Decay
				if (date) {
					const daysSince = (now - date) / (1000 * 60 * 60 * 24);
					const decayRate = 0.005; // 0.5% decay per day
					const decayFactor = Math.exp(-decayRate * daysSince);
					adjustedScore = adjustedScore * decayFactor;
				}

				calculatedSkills[skillId].totalScore += adjustedScore;
				calculatedSkills[skillId].count += 1;
				calculatedSkills[skillId].lastData = date;
			};

			// Iterate through all submissions
			progressData.forEach(course => {
				course.assessments.forEach(assessment => {
					if (assessment.score !== undefined && assessment.totalPoints > 0) {
						const percentage = (assessment.score / assessment.totalPoints) * 100;
						const title = assessment.assessmentTitle.toLowerCase();
						const date = assessment.submittedAt ? assessment.submittedAt.toDate() : new Date();

						let matched = false;

						// Match against Taxonomy
						Object.values(SKILL_TAXONOMY).forEach(category => {
							Object.entries(category.skills).forEach(([skillId, skillDef]) => {
								if (skillDef.keywords.some(k => title.includes(k.toLowerCase()))) {
									processSkillScore(skillId, percentage, date);
									matched = true;
								}
							});
						});

						// Fallback to 'sql-basics'
						if (!matched) {
							processSkillScore('sql-basics', percentage, date);
						}
					}
				});

				// Assignments
				course.assignments.forEach(assignment => {
					if (assignment.grade !== undefined) {
						const percentage = assignment.grade;
						const title = assignment.assignmentTitle.toLowerCase();
						const date = assignment.submittedAt ? assignment.submittedAt.toDate() : new Date();

						Object.values(SKILL_TAXONOMY).forEach(category => {
							Object.entries(category.skills).forEach(([skillId, skillDef]) => {
								if (skillDef.keywords.some(k => title.includes(k.toLowerCase()))) {
									processSkillScore(skillId, percentage, date);
								}
							});
						});
					}
				});
			});

			// Finalize scores
			const finalCompetency = Object.values(calculatedSkills).map(skill => {
				const avgScore = skill.count > 0 ? Math.round(skill.totalScore / skill.count) : 0;
				// Mock data if 0 to show visualization (remove in prod)
				const finalScore = avgScore > 0 ? avgScore : Math.floor(Math.random() * 40) + 10;
				const level = finalScore >= 80 ? 'Mastered' : finalScore >= 70 ? 'Advanced' : finalScore >= 41 ? 'Intermediate' : 'Beginner';
				const previousScore = finalScore - (Math.floor(Math.random() * 5)); // Mock previous score for improvement

				return {
					subject: skill.name[language] || skill.name['en'],
					A: finalScore,
					fullMark: 100,
					level: level,
					id: skill.id,
					categoryId: skill.categoryId,
					categoryTitle: SKILL_TAXONOMY[skill.categoryId].title[language],
					remedy: skill.remedy[language] || skill.remedy['en'],
					status: level === 'Mastered' ? 'mastered' : level === 'Beginner' ? 'needs_practice' : 'acquired',
					improvement: finalScore - previousScore
				};
			});

			setCompetency(finalCompetency);

			// Populate Strong Topics (Top 3 skills)
			const topSkills = [...finalCompetency].sort((a, b) => b.A - a.A).slice(0, 3);
			setStrongTopics(topSkills.map(s => ({
				id: s.id,
				title: s.subject,
				score: s.A
			})));

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
			// --- US011-01: Skill Competency (Strong/Weak Consolidation) ---
			// FIX: Commented out to prevent overwriting the detailed taxonomy-based competency data
			// const competencyData = progressData.map(c => ({
			// 	subject: c.courseTitle.length > 15 ? c.courseTitle.substring(0, 12) + '...' : c.courseTitle,
			// 	A: c.avgAssessmentScore || 0,
			// 	fullMark: 100,
			// 	totalLessons: c.totalLessons,
			// 	title: c.courseTitle
			// }));
			// setCompetency(competencyData);

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
			// const now = new Date(); // Already declared above
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
				// 3. Submission & Deadline Risk
				const submissionRisks = [];
				let submissionScore = 0; // Penalty points (Max ~20)
				let isDeclining = false; // 5.6 Risk Trend Tracking

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
				// 5.5 Automated Interventions (AI Integration)
				if (riskLevel === 'high' || riskLevel === 'medium') {
					interventions.push({
						id: 'ai_recs',
						label: language === 'bm' ? 'Syor AI' : 'AI Recommendations',
						actionType: 'ai',
						icon: 'Sparkles'
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
					recommendations,
					isDeclining // 5.6 Risk Trend Tracking
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





						{/* Conditional: AI Recommendations View */}


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
													title = language === 'bm' ? `Penyelesaian: ${achievement.courseTitle}` : `Completion of ${achievement.courseTitle}`;
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
										<AIInsight
											chartType="bar"
											chartTitle={language === 'bm' ? 'Prestasi Kursus' : 'Course Performance'}
											data={courseProgress
												.slice()
												.sort((a, b) => new Date(a.enrolledAt) - new Date(b.enrolledAt))
												.map(c => ({
													name: c.courseTitle,
													score: c.avgAssessmentScore || 0
												}))
											}
											onDataChange={courseProgress}
										/>
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
										<AIInsight
											chartType="bar"
											chartTitle={language === 'bm' ? 'Kemajuan Kursus' : 'Course Progress'}
											data={courseProgress
												.slice()
												.sort((a, b) => new Date(a.enrolledAt) - new Date(b.enrolledAt))
												.map(c => ({
													name: c.courseTitle,
													progress: c.overallProgress || 0
												}))
											}
											onDataChange={courseProgress}
										/>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Score Trend */}
						{(currentView === 'trend' || (currentView === 'hub' && reportConfig.includeTrend)) && scoreTrend.length > 0 && (
							<div className={currentView !== 'trend' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid print-content-managed' : 'mb-8 break-inside-avoid print-content-managed'}>
								<Card className="shadow-sm border-neutral-200">
									<CardHeader>
										<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
											<TrendingUp className="h-5 w-5 text-indigo-500" />
											{language === 'bm' ? 'Trend Prestasi Penilaian' : 'Assessment Score Trend'}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<ResponsiveContainer width="100%" height={288}>
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
										<AIInsight
											chartType="line"
											chartTitle={language === 'bm' ? 'Trend Prestasi Penilaian' : 'Assessment Score Trend'}
											data={scoreTrend}
											onDataChange={scoreTrend}
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
						<Card className="shadow-sm border-neutral-200" id="skill-competency-report">
							<CardHeader className="flex flex-row items-center justify-between">
								<div>
									<CardTitle className="text-lg font-semibold text-neutralDark flex items-center gap-2">
										<Target className="h-5 w-5 text-indigo-500" />
										{language === 'bm' ? 'Kompetensi Kemahiran' : 'Skill Competency'}
									</CardTitle>
									<CardDescription>
										{language === 'bm' ? 'Analisis visual kekuatan dan kelemahan mengikut topik.' : 'Visual analysis of strengths and weaknesses across topics.'}
									</CardDescription>
								</div>

								{/* Preview Modal Trigger */}
								<Dialog open={showSkillReportPreview} onOpenChange={setShowSkillReportPreview}>
									<DialogTrigger asChild>
										<Button
											variant="outline"
											className="print:hidden gap-2 h-10 px-4 py-2"
										>
											<Download className="h-5 w-5" />
											{language === 'bm' ? 'Eksport' : 'Export'}
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
										<DialogHeader>
											<DialogTitle>{language === 'bm' ? 'Pratonton Laporan Kemahiran' : 'Skill Report Preview'}</DialogTitle>
											<DialogDescription>
												{language === 'bm' ? 'Semak profil kemahiran anda sebelum memuat turun.' : 'Review your skill profile before downloading.'}
											</DialogDescription>
										</DialogHeader>

										{/* Report Preview Content (Mirrors the Card Content) */}
										<div className="border rounded-lg p-6 bg-white min-h-[500px]" id="skill-report-preview-content">
											<div className="text-center mb-6">
												<h2 className="text-2xl font-bold text-neutralDark">Skill Competency Report</h2>
												<p className="text-muted-foreground">{studentName} • {new Date().toLocaleDateString()}</p>
											</div>

											<div className="grid md:grid-cols-2 gap-8">
												{/* Radar Chart (Scaled down for preview) */}
												<div className="h-[300px] w-full flex items-center justify-center bg-neutral-50/50 rounded-xl border border-neutral-100 p-4">
													<ResponsiveContainer width="100%" height="100%">
														<RadarChart cx="50%" cy="50%" outerRadius="70%" data={competency}>
															<PolarGrid stroke="#e5e7eb" />
															<PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 10, fontWeight: 500 }} />
															<PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
															<Radar
																name={language === 'bm' ? 'Skor' : 'Score'}
																dataKey="A"
																stroke="#8b5cf6"
																strokeWidth={2}
																fill="#8b5cf6"
																fillOpacity={0.5}
															/>
														</RadarChart>
													</ResponsiveContainer>
												</div>

												{/* Skill List */}
												<div className="space-y-4">
													{Object.entries(competency.reduce((acc, skill) => {
														const cat = skill.categoryTitle || 'General';
														if (!acc[cat]) acc[cat] = [];
														acc[cat].push(skill);
														return acc;
													}, {})).map(([category, skills]) => (
														<div key={category}>
															<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 border-b pb-1">{category}</h4>
															<div className="space-y-2">
																{skills.map(skill => (
																	<div key={skill.id} className="flex justify-between items-center text-sm">
																		<span className="text-neutralDark">{skill.subject}</span>
																		<span className={`font-bold ${skill.level === 'Mastered' ? 'text-violet-600' :
																			skill.level === 'Advanced' ? 'text-emerald-600' :
																				skill.level === 'Intermediate' ? 'text-blue-600' : 'text-amber-600'
																			}`}>
																			{skill.A}%
																		</span>
																	</div>
																))}
															</div>
														</div>
													))}
												</div>
											</div>

											{/* Focus Areas Section */}
											{competency.some(c => c.A < 60) && (
												<div className="mt-8 pt-4 border-t border-neutral-100">
													<h3 className="text-sm font-bold text-neutralDark mb-2">Focus Areas</h3>
													<ul className="list-disc list-inside text-sm text-red-600 space-y-1">
														{competency.filter(c => c.A < 60).map(skill => (
															<li key={skill.id}>
																<span className="font-medium">{skill.subject}</span>: {skill.remedy}
															</li>
														))}
													</ul>
												</div>
											)}
										</div>

										<DialogFooter className="mt-4">
											<Button variant="outline" onClick={() => setShowSkillReportPreview(false)}>
												{language === 'bm' ? 'Batal' : 'Cancel'}
											</Button>
											<Button onClick={handleDownloadSkills} className="gap-2">
												<Download className="h-4 w-4" />
												{language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</CardHeader>
							<CardContent>
								<div className="grid md:grid-cols-2 gap-8">
									{/* Radar Chart */}
									<div className="h-[400px] w-full flex items-center justify-center bg-neutral-50/50 rounded-xl border border-neutral-100 p-4 relative">
										<div className="absolute top-4 left-4 z-10">
											<div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
												<div className="w-3 h-3 rounded-full bg-indigo-500 opacity-50"></div>
												<span>Current Level</span>
											</div>
										</div>
										<ResponsiveContainer width="100%" height="100%">
											<RadarChart cx="50%" cy="50%" outerRadius="75%" data={competency}>
												<PolarGrid stroke="#e5e7eb" />
												<PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }} />
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

									{/* Linear Progress Bars Detail (Grouped by Hierarchy) */}
									<div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
										{Object.entries(competency.reduce((acc, skill) => {
											const cat = skill.categoryTitle || 'General';
											if (!acc[cat]) acc[cat] = [];
											acc[cat].push(skill);
											return acc;
										}, {})).map(([category, skills]) => (
											<div key={category}>
												<h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
													<div className="h-px flex-1 bg-neutral-200"></div>
													{category}
													<div className="h-px flex-1 bg-neutral-200"></div>
												</h3>
												<div className="space-y-4">
													{skills.map((skill) => (
														<div key={skill.id} className="space-y-2">
															<div className="flex justify-between items-end text-sm">
																<div className="flex items-center gap-2">
																	{skill.status === 'mastered' ? (
																		<CheckCircle2 className="h-4 w-4 text-emerald-500" />
																	) : skill.status === 'needs_practice' ? (
																		<AlertTriangle className="h-4 w-4 text-amber-500" />
																	) : (
																		<div className="h-4 w-4 rounded-full border border-neutral-300"></div>
																	)}
																	<span className="font-medium text-neutralDark text-base">{skill.subject}</span>
																</div>
																<div className="text-right">
																	<span className={`font-bold text-base ${skill.level === 'Mastered' ? 'text-violet-600' :
																		skill.level === 'Advanced' ? 'text-emerald-600' :
																			skill.level === 'Intermediate' ? 'text-blue-600' : 'text-amber-600'
																		}`}>
																		{skill.A}%
																	</span>
																	<span className="text-sm text-muted-foreground ml-1">
																		({language === 'bm' ?
																			(skill.level === 'Mastered' ? 'Pakar' : skill.level) :
																			skill.level})
																	</span>
																</div>
															</div>

															{/* Progress Bar with Improvement Indicator */}
															<div className="relative">
																<div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
																	<div
																		className={`h-full rounded-full transition-all duration-1000 ${skill.level === 'Mastered' ? 'bg-violet-500' :
																			skill.level === 'Advanced' ? 'bg-emerald-500' :
																				skill.level === 'Intermediate' ? 'bg-blue-500' : 'bg-amber-500'
																			}`}
																		style={{ width: `${skill.A}%` }}
																	></div>
																</div>
																{skill.improvement > 0 && (
																	<div className="absolute -top-6 right-0 text-[10px] font-bold text-emerald-600 flex items-center animate-pulse">
																		<TrendingUp className="h-3 w-3 mr-0.5" />
																		+{skill.improvement}%
																	</div>
																)}
															</div>

															{/* Remedy Action if Weak */}
															{skill.status === 'needs_practice' && (
																<div className="bg-amber-50 p-2 rounded border border-amber-100 flex items-start justify-between gap-2 mt-1">
																	<div className="flex items-start gap-2">
																		<Lightbulb className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
																		<span className="text-sm text-amber-800 leading-tight">
																			{skill.remedy}
																		</span>
																	</div>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-7 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 p-0 px-3"
																		onClick={() => router.push(`/courses?search=${encodeURIComponent(skill.subject)}`)}
																	>
																		{language === 'bm' ? 'Lihat' : 'View'}
																	</Button>
																</div>
															)}
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								</div>

								<div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground border-t pt-4">
									<div className="flex items-center gap-2">
										<div className="w-3 h-3 rounded-full bg-indigo-500 opacity-50"></div>
										<span>{language === 'bm' ? 'Kawasan Liputan (Radar)' : 'Coverage Area (Radar)'}</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs text-neutral-400">{language === 'bm' ? 'Paksi luar menunjukkan penguasaan tinggi' : 'Outer edge indicates mastery'}</span>
									</div>
								</div>

								{/* Weak Areas (Focus Topics) Integration */}
								{competency.some(c => c.A < 60) && (
									<div className="mt-6 pt-6 border-t border-neutral-100">
										<h4 className="text-base font-semibold text-neutralDark mb-3 flex items-center gap-2">
											<TrendingDown className="h-5 w-5 text-error" />
											{language === 'bm' ? 'Kawasan Tumpuan (Markah < 60%)' : 'Focus Areas (Score < 60%)'}
										</h4>
										<div className="grid md:grid-cols-2 gap-3">
											{competency.filter(c => c.A < 60).map((topic, idx) => (
												<div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100">
													<div className="flex justify-between items-start mb-2">
														<div>
															<p className="text-base font-bold text-neutralDark">{topic.subject}</p>
															<p className="text-sm text-red-600 font-medium">
																{language === 'bm' ? `Skor: ${topic.A}% (Lemah)` : `Score: ${topic.A}% (Weak)`}
															</p>
														</div>
														<Button
															size="sm"
															className="h-9 text-sm bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm px-4"
															onClick={() => router.push(`/courses?search=${encodeURIComponent(topic.subject)}`)}
														>
															{language === 'bm' ? 'Tindakan' : 'Action'}
														</Button>
													</div>
													<div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/50 p-2 rounded">
														<Lightbulb className="h-4 w-4 text-amber-500" />
														<span>{topic.remedy}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card >
					</div >
				)
				}

				{/* Risk Indicators Section */}
				{
					courseProgress.length > 0 && Object.keys(riskIndicators).length === 0 && !loading && (
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
					)
				}
				{
					(currentView === 'risk' || (currentView === 'hub' && reportConfig.includeRisk)) && Object.keys(riskIndicators).length > 0 && (
						<div className={currentView !== 'risk' && !isPrinting ? 'hidden print:block mb-8 break-inside-avoid' : 'mb-8 break-inside-avoid'}>
							<div className={`space-y-4`}>
								<div className="flex items-center justify-between mt-8 mb-4">
									<h2 className="text-h2 text-neutralDark flex items-center gap-2">
										<AlertTriangle className="h-6 w-6 text-warning" />
										{language === 'bm' ? 'Penunjuk Risiko Pembelajaran' : 'Learning Risk Indicators'}
									</h2>
									<div className="relative w-full md:w-auto min-w-[250px] print:hidden">
										<select
											className="flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 pl-2 pr-8 appearance-none cursor-pointer shadow-sm hover:border-neutral-300 transition-all font-medium text-neutralDark"
											value={selectedRiskCourseId}
											onChange={(e) => setSelectedRiskCourseId(e.target.value)}
										>
											<option value="all">{language === 'bm' ? 'Semua Kursus' : 'All Courses'}</option>
											{Object.keys(riskIndicators).map(courseId => {
												const course = courseProgress.find(c => c.courseId === courseId);
												return course ? <option key={courseId} value={courseId}>{course.courseTitle}</option> : null;
											})}
										</select>
										<div className="absolute right-3 top-3 pointer-events-none">
											<Filter className="h-5 w-5 text-muted-foreground" />
										</div>
									</div>
								</div>
								<div className="flex flex-col gap-4">
									{Object.entries(riskIndicators)
										.filter(([courseId]) => selectedRiskCourseId === 'all' || courseId === selectedRiskCourseId)
										.map(([courseId, risk]) => {
											const course = courseProgress.find(c => c.courseId === courseId);
											if (!course) return null;

											return (
												<Card key={courseId} className={`shadow-sm border-l-4 ${risk.riskLevel === 'high' ? 'border-l-destructive' : risk.riskLevel === 'medium' ? 'border-l-warning' : 'border-l-success'}`}>
													<CardHeader className="pb-2">
														<div className="flex items-start justify-between gap-2">
															<CardTitle className="text-lg font-bold text-neutralDark">
																{course.courseTitle}
															</CardTitle>
															<div className="flex items-center gap-2">
																{risk.isDeclining && (
																	<div className="flex items-center text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full" title={language === 'bm' ? 'Prestasi merosot' : 'Declining Performance'}>
																		<TrendingDown className="h-3 w-3 mr-1" />
																		<span>Trend</span>
																	</div>
																)}
																<span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${risk.riskLevel === 'high' ? 'bg-destructive/10 text-destructive' : risk.riskLevel === 'medium' ? 'bg-warning/10 text-warning-dark' : 'bg-success/10 text-success'}`}>
																	{risk.riskLevel === 'high' ? (language === 'bm' ? 'Risiko Tinggi' : 'High Risk') :
																		risk.riskLevel === 'medium' ? (language === 'bm' ? 'Risiko Sederhana' : 'Medium Risk') :
																			(language === 'bm' ? 'Sihat' : 'Healthy')}
																</span>
															</div>
														</div>
													</CardHeader>
													<CardContent className="space-y-4">
														{/* Detailed Risk Categories */}
														{risk.categories && (
															<div className="grid gap-4 md:grid-cols-3">
																{Object.entries(risk.categories).map(([key, data]) => {
																	// Normalize score to percentage
																	const max = key === 'submission' ? 20 : 40;
																	const pct = Math.min(100, Math.round((data.score / max) * 100));
																	const colorClass = data.score === 0 ? 'bg-emerald-500' : pct > 50 ? 'bg-red-500' : 'bg-amber-500';
																	const colorClassLight = data.score === 0 ? 'bg-emerald-100 text-emerald-700' : pct > 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

																	return (
																		<div key={key} className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
																			<div className="flex justify-between items-center mb-2">
																				<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
																					{key === 'engagement' ? (language === 'bm' ? 'Penglibatan' : 'Engagement') : key === 'academic' ? (language === 'bm' ? 'Akademik' : 'Academic') : (language === 'bm' ? 'Penghantaran' : 'Submission')}
																				</span>
																				<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colorClassLight}`}>
																					{data.score > 0 ? (language === 'bm' ? `${pct}% Risiko` : `${pct}% Risk`) : (language === 'bm' ? 'Selamat' : 'Safe')}
																				</span>
																			</div>

																			<div className="h-2 w-full bg-white rounded-full overflow-hidden border border-neutral-100 mb-2">
																				<div
																					className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
																					style={{ width: `${Math.max(5, pct)}%` }}
																				/>
																			</div>

																			{data.risks.length > 0 ? (
																				<ul className="space-y-1">
																					{data.risks.map((r, i) => (
																						<li key={i} className="text-xs text-neutralDark leading-tight flex items-start gap-1.5">
																							<span className="mt-0.5 w-1 h-1 rounded-full bg-neutral-400 flex-shrink-0" />
																							{r}
																						</li>
																					))}
																				</ul>
																			) : (
																				<p className="text-xs text-muted-foreground italic pl-2.5 opacity-60">
																					{language === 'bm' ? 'Tiada isu dikesan' : 'No issues detected'}
																				</p>
																			)}
																		</div>
																	);
																})}
															</div>
														)}

														{/* Actionable Interventions */}
														{risk.interventions && risk.interventions.length > 0 ? (
															<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-neutral-200 mt-2">
																<span className="text-sm font-semibold text-muted-foreground mr-2">
																	{language === 'bm' ? 'Tindakan Disyorkan:' : 'Recommended Actions:'}
																</span>
																{risk.interventions.map((action, idx) => (
																	<button
																		key={idx}
																		onClick={() => {
																			if (action.label === (language === 'bm' ? 'Jadual Belajar' : 'Plan Study Time')) {
																				setStudyDialogOpen(true);
																			} else if (action.actionType === 'ai') {
																				router.push('/recommendations');
																			} else if (action.id === 'tutor') {
																				router.push('/ai'); // Getting help -> Coding Help on AI page
																			} else {
																				alert(`Feature: ${action.label}`);
																			}
																		}}
																		className={`text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95 ${action.id === 'tutor'
																			? 'bg-white border border-primary/20 text-primary hover:bg-primary/5'
																			: action.actionType === 'ai'
																				? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 hover:opacity-90'
																				: 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
																			}`}
																	>
																		{action.icon === 'Sparkles' ? <Sparkles className="h-5 w-5" /> : action.id === 'tutor' ? <Users className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
																		{action.label}
																	</button>
																))}

																{/* 5.4 Early Alerts: Notify Instructor manually */}
																{(risk.riskLevel === 'high' || risk.riskLevel === 'medium') && (
																	<button
																		onClick={() => {
																			setSelectedContactCourse({ courseId, courseTitle: course.courseTitle, instructor: course.instructor });
																			setContactSubject(language === 'bm' ? 'Bantuan Diperlukan: Risiko Pembelajaran' : 'Help Needed: Learning Risk');
																			setContactDialogOpen(true);
																		}}
																		className="text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95 bg-white border border-destructive/20 text-destructive hover:bg-destructive/5"
																	>
																		<Mail className="h-5 w-5" />
																		{language === 'bm' ? 'Maklumkan Pengajar' : 'Notify Instructor'}
																	</button>
																)}
															</div>
														) : (
															risk.riskScore < 30 && (
																<div className="p-3 bg-green-50 rounded-xl flex items-center gap-3">
																	<div className="p-1.5 bg-green-100 rounded-full">
																		<CheckCircle className="h-4 w-4 text-green-600" />
																	</div>
																	<p className="text-sm text-green-800 font-medium">
																		{language === 'bm' ? 'Prestasi anda cemerlang! Teruskan usaha.' : 'Excellent performance! Keep up the good work.'}
																	</p>
																</div>
															)
														)}

														{/* Key Metrics Mini Grid */}
														<div className="grid grid-cols-3 gap-4 pt-4 mt-2">
															<div className="text-center p-3 rounded-lg bg-neutral-50">
																<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
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
					)
				}

				{/* Course Progress List */}
				{
					(currentView === 'details' || (currentView === 'hub' && reportConfig.includeDetails)) && (
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
														<div className="flex flex-col gap-3 print:hidden min-w-[180px]">
															<Link href={`/courses/${course.courseId}`} className="w-full">
																<Button variant={course.overallProgress === 100 ? "outline" : "default"} size="sm" className="gap-2 w-full h-10 text-sm">
																	<BookOpen className="h-5 w-5" />
																	{language === 'bm' ? 'Teruskan Belajar' : 'Continue Learning'}
																</Button>
															</Link>
															{course.overallProgress === 100 && (
																<Button
																	onClick={() => handleViewCertificate(course)}
																	variant="default"
																	size="sm"
																	className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none shadow-md w-full h-10 text-sm"
																>
																	<GraduationCap className="h-5 w-5" />
																	{language === 'bm' ? 'Sijil' : 'Certificate'}
																</Button>
															)}
														</div>
													</div>

													{/* Course Description */}
													{course.courseDescription && (
														<div className="px-6 pt-4 pb-0 space-y-5">
															<div className="space-y-3">
																<p className="text-muted-foreground text-sm leading-relaxed">
																	{course.courseDescription}
																</p>

																{/* Instructor Card */}
																<div className="bg-gradient-to-br from-white to-neutral-50 border border-neutral-100 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
																	<div className="relative">
																		<div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
																			<Users className="h-7 w-7 text-neutral-400" />
																		</div>
																		<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
																	</div>
																	<div className="flex-1">
																		<h4 className="text-sm font-bold text-neutralDark">{course.instructor || 'Dr. Sarah Connor'}</h4>
																		<p className="text-xs text-muted-foreground font-medium">Senior Instructor • <span className="text-green-600">Online</span></p>
																	</div>
																	<Button
																		onClick={() => handleOpenContact(course)}
																		variant="outline"
																		size="sm"
																		className="h-9 px-4 border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
																	>
																		<Mail className="h-5 w-5 mr-2 text-neutral-500" />
																		{language === 'bm' ? 'Hubungi' : 'Contact'}
																	</Button>
																</div>
															</div>


														</div>
													)}

													<CardContent className="p-6 space-y-6">
														{/* Overall Progress Bar */}
														<div>
															<div className="flex items-center justify-between mb-2">
																<span className="text-base font-bold text-neutralDark">
																	{language === 'bm' ? 'Kemajuan Keseluruhan' : 'Overall Progress'}
																</span>
																<span className="text-base font-bold text-primary">
																	{course.overallProgress}%
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
															<div>
																<h4 className="text-sm font-bold text-neutralDark mb-4 flex items-center gap-2 uppercase tracking-wider">
																	{riskIndicators[course.courseId].riskLevel === 'low' ? (
																		<CheckCircle2 className="h-5 w-5 text-green-600" />
																	) : riskIndicators[course.courseId].riskLevel === 'medium' ? (
																		<Info className="h-5 w-5 text-yellow-600" />
																	) : (
																		<AlertTriangle className="h-5 w-5 text-red-600" />
																	)}
																	{language === 'bm' ? 'Analisis Prestasi' : 'Performance Insights'}
																</h4>
																<div className="space-y-3">
																	{riskIndicators[course.courseId].recommendations && riskIndicators[course.courseId].recommendations.length > 0 && (
																		<ul className="space-y-3">
																			{riskIndicators[course.courseId].recommendations.map((rec, idx) => (
																				<li key={idx} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-primary/20 transition-colors">
																					<span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${riskIndicators[course.courseId].riskLevel === 'low'
																						? 'bg-green-500'
																						: riskIndicators[course.courseId].riskLevel === 'medium'
																							? 'bg-yellow-500'
																							: 'bg-red-500'
																						}`} />
																					<span className="text-sm font-medium text-neutralDark leading-relaxed">{rec}</span>
																				</li>
																			))}
																		</ul>
																	)}
																</div>
															</div>
														)}

														{/* Progress Metrics Grid */}
														<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
															<div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
																<div className="flex items-center gap-2 mb-2">
																	<div className="p-1.5 bg-blue-100 rounded-lg">
																		<BookOpen className="h-5 w-5 text-blue-600" />
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
																		<CheckCircle2 className="h-5 w-5 text-emerald-600" />
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
																		<ClipboardCheck className="h-5 w-5 text-violet-600" />
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
																		<Target className="h-5 w-5 text-orange-600" />
																	</div>
																	<span className="text-sm font-semibold text-orange-900">
																		{language === 'bm' ? 'Skor Purata' : 'Average Score'}
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
																		<ClipboardCheck className="h-5 w-5 text-primary" />
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
																		<FileText className="h-5 w-5 text-secondary" />
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
			</div >
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
											<span className="block text-xs text-muted-foreground">Average Score</span>
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

			{/* Certificate Preview Modal */}
			<Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
				<DialogContent className="max-w-4xl w-full bg-neutral-50 p-0 overflow-hidden rounded-2xl border-0">
					<div className="flex flex-col h-full">
						{/* Header */}
						<div className="p-4 border-b bg-white flex items-center justify-between">
							<h3 className="font-bold text-lg text-neutral-800 flex items-center gap-2">
								<Award className="h-5 w-5 text-amber-500" />
								{language === 'bm' ? 'Pratonton Sijil' : 'Certificate Preview'}
							</h3>
						</div>

						{/* Preview Area - Scaled Down */}
						<div className="bg-neutral-100 p-8 flex items-center justify-center overflow-auto">
							<div className="transform scale-[0.6] origin-center shadow-2xl">
								{certificateData && (
									<CertificateTemplate
										studentName={certificateData.studentName}
										courseName={certificateData.courseName}
										instructorName={certificateData.instructorName}
										completionDate={certificateData.completionDate}
										language={language}
									/>
								)}
							</div>
						</div>

						{/* Footer Actions */}
						<div className="p-4 border-t bg-white flex justify-end gap-3">
							<Button variant="outline" onClick={() => setShowPreviewModal(false)}>
								{language === 'bm' ? 'Tutup' : 'Close'}
							</Button>
							<Button
								onClick={handleDownloadCertificate}
								disabled={isGeneratingCertificate}
								className="bg-amber-500 hover:bg-amber-600 text-white"
							>
								{isGeneratingCertificate ? (
									<>
										<span className="animate-spin mr-2">⏳</span> {language === 'bm' ? 'Menjana PDF...' : 'Generating PDF...'}
									</>
								) : (
									<>
										<Download className="h-4 w-4 mr-2" /> {language === 'bm' ? 'Muat Turun Sijil' : 'Download Certificate'}
									</>
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Contact Instructor Modal */}
			<Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
				<DialogContent className="max-w-md w-full rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Mail className="h-5 w-5 text-primary" />
							{language === 'bm' ? 'Hubungi Pengajar' : 'Contact Instructor'}
						</DialogTitle>
						<DialogDescription>
							{language === 'bm'
								? `Hantar mesej kepada pengajar untuk ${selectedContactCourse?.courseTitle}`
								: `Send a message to the instructor for ${selectedContactCourse?.courseTitle}`
							}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="subject">{language === 'bm' ? 'Subjek' : 'Subject'}</Label>
							<div className="relative">
								<Input
									id="subject"
									value={contactSubject}
									onChange={(e) => setContactSubject(e.target.value)}
									placeholder="Topic of your question..."
									className="pl-9"
									autoComplete="off"
								/>
								<span className="absolute left-3 top-2.5 text-muted-foreground">
									<FileText className="h-4 w-4" />
								</span>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="message">{language === 'bm' ? 'Mesej' : 'Message'}</Label>
							<textarea
								id="message"
								value={contactMessage}
								onChange={(e) => setContactMessage(e.target.value)}
								placeholder="Write your message here..."
								rows={5}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								autoComplete="off"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setContactDialogOpen(false)}>
							{language === 'bm' ? 'Batal' : 'Cancel'}
						</Button>
						<Button onClick={handleSendMessage} disabled={isSendingMessage}>
							{isSendingMessage ? (
								<>
									<span className="animate-spin mr-2">⏳</span> {language === 'bm' ? 'Menghantar...' : 'Sending...'}
								</>
							) : (
								<>
									<Send className="h-4 w-4 mr-2" /> {language === 'bm' ? 'Hantar Mesej' : 'Send Message'}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Study Plan Dialog */}
			<Dialog open={studyDialogOpen} onOpenChange={setStudyDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Calendar className="h-5 w-5 text-primary" />
							{language === 'bm' ? 'Jadualkan Masa Belajar' : 'Schedule Study Time'}
						</DialogTitle>
						<DialogDescription>
							{language === 'bm'
								? 'Tetapkan peringatan untuk sesi pembelajaran seterusnya.'
								: 'Set a reminder for your next study session to stay on track.'}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="study-date">
								{language === 'bm' ? 'Tarikh & Masa' : 'Date & Time'}
							</Label>
							<Input
								id="study-date"
								type="datetime-local"
								value={studyDate}
								onChange={(e) => setStudyDate(e.target.value)}
								className="col-span-3"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="study-duration">
								{language === 'bm' ? 'Durasi (Minit)' : 'Duration (Minutes)'}
							</Label>
							<select
								id="study-duration"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={studyDuration}
								onChange={(e) => setStudyDuration(e.target.value)}
							>
								<option value="30">30 {language === 'bm' ? 'minit' : 'minutes'}</option>
								<option value="60">60 {language === 'bm' ? 'minit' : 'minutes'}</option>
								<option value="90">90 {language === 'bm' ? 'minit' : 'minutes'}</option>
								<option value="120">2 {language === 'bm' ? 'jam' : 'hours'}</option>
							</select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setStudyDialogOpen(false)}>
							{language === 'bm' ? 'Batal' : 'Cancel'}
						</Button>
						<Button onClick={async () => {
							try {
								if (!studyDate) {
									showToast(language === 'bm' ? 'Sila pilih tarikh & masa' : 'Please select date & time', 'error');
									return;
								}

								// Clean up collection reference
								// Using a top-level collection 'study_plans' with userId since we query by userId
								// Or subcollection: user -> uid -> study_plans
								// Top level is easier for queries if needed, but subcollection is cleaner.
								// Let's use subcollection to keep user data organized.

								const userStudyRef = collection(db, 'user', currentUserId, 'study_plans');
								await addDoc(userStudyRef, {
									scheduledAt: new Date(studyDate).toISOString(), // Store as ISO string for querying/parsing
									duration: parseInt(studyDuration),
									createdAt: serverTimestamp(),
									notified: false,
									courseId: selectedContactCourse?.courseId || 'general',
									active: true
								});

								setStudyDialogOpen(false);
								showToast(language === 'bm' ? 'Masa belajar dijadualkan!' : 'Study session scheduled!', 'success');
							} catch (error) {
								console.error("Error saving schedule:", error);
								showToast(language === 'bm' ? 'Gagal menyimpan jadual' : 'Failed to save schedule', 'error');
							}
						}}>
							{language === 'bm' ? 'Simpan Jadual' : 'Save Schedule'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Hidden Certificate Template for Capture (Always render when data exists to allow download) */}
			<div className="fixed top-[-9999px] left-[-9999px]">
				{certificateData && (
					<CertificateTemplate
						ref={certificateRef}
						studentName={certificateData.studentName}
						courseName={certificateData.courseName}
						instructorName={certificateData.instructorName}
						completionDate={certificateData.completionDate}
						language={language}
					/>
				)}
			</div>

			{/* Toast Notification */}
			{
				toast.visible && (
					<Toast
						message={toast.message}
						type={toast.type}
						onClose={handleHideToast}
					/>
				)
			}
		</div >
	);
}
