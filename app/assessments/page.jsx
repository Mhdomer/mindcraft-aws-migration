'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardCheck, FileText, Code, Clock, Calendar, Upload, ArrowRight, Edit2, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Plus, Users, File, X, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/app/contexts/LanguageContext';
import ResultDetailsModal from './ResultDetailsModal';

export default function AssessmentsPage() {
	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [submissions, setSubmissions] = useState({}); // Map of assessmentId -> submission data
	const [uploadingFiles, setUploadingFiles] = useState({}); // Map of assessmentId -> array of files
	const [submitting, setSubmitting] = useState({}); // Map of assessmentId -> boolean
	const [expandedAssessment, setExpandedAssessment] = useState(null); // Track which assessment card is expanded for submission
	const [deleteConfirm, setDeleteConfirm] = useState(null); // { assessmentId, title } for delete confirmation
	const [submitConfirm, setSubmitConfirm] = useState(null); // { assessmentId, title } for submit confirmation
	const [submitSuccess, setSubmitSuccess] = useState(null); // { message, isUpdate } for success message
	const [submitError, setSubmitError] = useState(null); // { message } for error message
	const [selectedResult, setSelectedResult] = useState(null); // Submission data for the modal
	const fileInputRefs = useRef({}); // Map of assessmentId -> file input ref
	const router = useRouter();
	const { language } = useLanguage();
	const searchParams = useSearchParams();
	const typeFilter = searchParams.get('type');

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					setUserRole(userDoc.data().role);
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		if (userRole && currentUserId) {
			loadAssessments();
			if (userRole === 'student') {
				loadSubmissions();
			}
		}
	}, [userRole, currentUserId]);

	// Prevent body scroll when modals are open
	useEffect(() => {
		if (deleteConfirm || submitConfirm || submitSuccess || submitError) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [deleteConfirm, submitConfirm, submitSuccess, submitError]);

	// Auto-close success modal after 3 seconds
	useEffect(() => {
		if (submitSuccess) {
			const timer = setTimeout(() => {
				setSubmitSuccess(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [submitSuccess]);

	async function loadAssessments() {
		setLoading(true);
		try {
			let assessmentsQuery;
			let enrolledCourseIds = [];

			if (userRole === 'student') {
				// First, get all courses the student is enrolled in
				if (!currentUserId) {
					console.log('loadAssessments: currentUserId not available yet');
					setLoading(false);
					return;
				}

				try {
					const enrollmentsQuery = query(
						collection(db, 'enrollment'),
						where('studentId', '==', currentUserId)
					);
					const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
					enrolledCourseIds = enrollmentsSnapshot.docs.map(doc => {
						const data = doc.data();
						return data.courseId;
					}).filter(Boolean); // Remove any undefined/null values

					console.log('loadAssessments: Enrolled course IDs:', enrolledCourseIds);
				} catch (enrollmentErr) {
					console.error('Error loading enrollments:', enrollmentErr);
					// Continue even if enrollment query fails, but show no assessments
					enrolledCourseIds = [];
				}

				// Students see only published assessments for courses they're enrolled in
				// Note: We query without orderBy first to avoid index issues, then sort client-side
				try {
					assessmentsQuery = query(
						collection(db, 'assessment'),
						where('published', '==', true),
						orderBy('createdAt', 'desc')
					);
				} catch (err) {
					// Fallback: query without orderBy
					assessmentsQuery = query(
						collection(db, 'assessment'),
						where('published', '==', true)
					);
				}
			} else {
				// Teachers and admins see all assessments
				assessmentsQuery = query(
					collection(db, 'assessment'),
					orderBy('createdAt', 'desc')
				);
			}

			let snapshot;
			try {
				snapshot = await getDocs(assessmentsQuery);
			} catch (queryErr) {
				// If orderBy query fails (missing index), try without orderBy
				if (queryErr.code === 'failed-precondition' || queryErr.message?.includes('index')) {
					console.warn('OrderBy query failed (missing index), trying without orderBy:', queryErr);
					const fallbackQuery = query(
						collection(db, 'assessment'),
						where('published', '==', true)
					);
					snapshot = await getDocs(fallbackQuery);
				} else {
					throw queryErr;
				}
			}

			let loadedAssessments = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Sort manually if we couldn't use orderBy
			if (userRole !== 'student' || enrolledCourseIds.length > 0) {
				loadedAssessments.sort((a, b) => {
					const aTime = a.createdAt?.toDate?.() || a.createdAt || 0;
					const bTime = b.createdAt?.toDate?.() || b.createdAt || 0;
					return bTime - aTime;
				});
			}

			console.log('loadAssessments: All published assessments:', loadedAssessments.map(a => ({
				id: a.id,
				title: a.title,
				courseId: a.courseId
			})));

			// Filter assessments by enrollment for students
			if (userRole === 'student') {
				if (enrolledCourseIds.length > 0) {
					loadedAssessments = loadedAssessments.filter(assessment => {
						const matches = enrolledCourseIds.includes(assessment.courseId);
						if (!matches && assessment.courseId) {
							console.log(`Assessment "${assessment.title}" (courseId: ${assessment.courseId}) not in enrolled courses`);
						}
						return matches;
					});
					console.log('loadAssessments: Filtered assessments:', loadedAssessments.length);
				} else {
					// Student has no enrollments, show no assessments
					console.log('loadAssessments: Student has no enrollments');
					loadedAssessments = [];
				}
			}

			// Filter by type if specified in query params
			if (typeFilter) {
				loadedAssessments = loadedAssessments.filter(a => a.type === typeFilter);
			}

			setAssessments(loadedAssessments);
		} catch (err) {
			console.error('Error loading assessments:', err);
			setAssessments([]);
		} finally {
			setLoading(false);
		}
	}

	async function loadSubmissions() {
		if (!currentUserId) return;

		try {
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', currentUserId),
				orderBy('submittedAt', 'desc')
			);

			let snapshot;
			try {
				snapshot = await getDocs(submissionsQuery);
			} catch (err) {
				// Fallback if index is missing
				console.warn('OrderBy submittedAt failed, falling back to in-memory sort', err);
				const fallbackQuery = query(
					collection(db, 'submission'),
					where('studentId', '==', currentUserId)
				);
				snapshot = await getDocs(fallbackQuery);
			}

			const submissionsMap = {};
			const docs = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			// If we fell back or to be safe, sort in-memory
			docs.sort((a, b) => {
				const aTime = a.submittedAt?.toDate?.() || a.submittedAt || 0;
				const bTime = b.submittedAt?.toDate?.() || b.submittedAt || 0;
				return bTime - aTime;
			});

			docs.forEach(data => {
				if (!submissionsMap[data.assessmentId]) {
					submissionsMap[data.assessmentId] = data;
				}
			});

			setSubmissions(submissionsMap);

			// Initialize uploaded files from existing submissions (using the latest one if multiple exist)
			const filesMap = {};
			Object.keys(submissionsMap).forEach(assessmentId => {
				filesMap[assessmentId] = submissionsMap[assessmentId].files || [];
			});
			setUploadingFiles(filesMap);
		} catch (err) {
			console.error('Error loading submissions:', err);
		}
	}

	function getAssessmentIcon(type) {
		switch (type) {
			case 'quiz':
				return <ClipboardCheck className="h-5 w-5 text-primary" />;
			case 'assignment':
				return <FileText className="h-5 w-5 text-secondary" />;
			case 'coding':
				return <Code className="h-5 w-5 text-success" />;
			default:
				return <ClipboardCheck className="h-5 w-5" />;
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return language === 'bm' ? 'Tiada tarikh ditetapkan' : 'No date set';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function stripHtml(html) {
		if (!html) return '';
		const tmp = document.createElement('DIV');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	async function confirmDelete(assessmentId) {
		const assessment = assessments.find(a => a.id === assessmentId);

		let submissionCount = 0;
		try {
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assessmentId', '==', assessmentId)
			);
			const snapshot = await getDocs(submissionsQuery);
			submissionCount = snapshot.size;
		} catch (err) {
			console.error('Error checking submissions:', err);
		}

		setDeleteConfirm({
			assessmentId,
			title: assessment?.title || (language === 'bm' ? 'Penilaian' : 'Assessment'),
			submissionCount
		});
	}

	async function handleDelete(assessmentId) {
		try {
			// Delete all associated submissions first
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assessmentId', '==', assessmentId)
			);
			const submissionSnapshot = await getDocs(submissionsQuery);
			const deletePromises = submissionSnapshot.docs.map(doc => deleteDoc(doc.ref));
			await Promise.all(deletePromises);

			// Then delete the assessment
			await deleteDoc(doc(db, 'assessment', assessmentId));
			setAssessments(prev => prev.filter(a => a.id !== assessmentId));
			setDeleteConfirm(null);
		} catch (err) {
			console.error('Error deleting assessment:', err);
			const errorMessage = language === 'bm'
				? 'Gagal memadam penilaian: '
				: 'Failed to delete assessment: ';
			alert(errorMessage + (err.message || (language === 'bm' ? 'Ralat tidak diketahui' : 'Unknown error')));
		}
	}

	async function togglePublish(assessment) {
		try {
			await updateDoc(doc(db, 'assessment', assessment.id), {
				published: !assessment.published,
				updatedAt: new Date(),
			});
			loadAssessments();
		} catch (err) {
			console.error('Error updating assessment:', err);
			const errorMessage = language === 'bm'
				? 'Gagal mengemas kini penilaian: '
				: 'Failed to update assessment: ';
			alert(errorMessage + (err.message || (language === 'bm' ? 'Ralat tidak diketahui' : 'Unknown error')));
		}
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
		return deadlineDate < new Date();
	}

	async function handleFileUpload(assessmentId, event) {
		const file = event.target.files[0];
		if (!file) return;

		// Validate file size (10MB limit)
		const MAX_FILE_SIZE = 10 * 1024 * 1024;
		if (file.size > MAX_FILE_SIZE) {
			const errorMsg = language === 'bm'
				? `Saiz fail mesti kurang daripada ${MAX_FILE_SIZE / 1024 / 1024}MB`
				: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
			alert(errorMsg);
			if (fileInputRefs.current[assessmentId]) fileInputRefs.current[assessmentId].value = '';
			return;
		}

		// Validate file type
		const allowedMimeTypes = [
			'application/pdf',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/msword',
			'application/zip',
			'application/x-zip-compressed',
			'text/plain',
			'text/markdown',
			'text/x-python',
			'text/javascript',
			'text/x-java',
			'image/jpeg',
			'image/png',
		];

		const allowedExtensions = ['.pdf', '.docx', '.doc', '.zip', '.txt', '.md', '.py', '.js', '.java', '.jpg', '.jpeg', '.png'];
		const fileName = file.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		const isValidMimeType = allowedMimeTypes.includes(file.type);
		const isValidExtension = allowedExtensions.includes(fileExtension);

		if (!isValidMimeType && !isValidExtension) {
			const errorMsg = language === 'bm'
				? 'Jenis fail tidak disokong. Sila muat naik PDF, DOCX, ZIP, fail teks, atau imej.'
				: 'File type not supported. Please upload PDF, DOCX, ZIP, text files, or images.';
			alert(errorMsg);
			if (fileInputRefs.current[assessmentId]) fileInputRefs.current[assessmentId].value = '';
			return;
		}

		const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		setUploadingFiles(prev => ({
			...prev,
			[assessmentId]: [...(prev[assessmentId] || []), { id: fileId, name: file.name, size: file.size, uploading: true }]
		}));

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to upload files');
			}

			// Upload to Firebase Storage
			const filePath = `assignment-submissions/${assessmentId}/${fileId}_${file.name}`;
			const fileRef = ref(storage, filePath);

			await uploadBytes(fileRef, file);
			const downloadURL = await getDownloadURL(fileRef);

			const fileData = {
				id: fileId,
				name: file.name,
				url: downloadURL,
				type: file.type || 'application/octet-stream',
				size: file.size,
				uploadedAt: new Date().toISOString(),
			};

			setUploadingFiles(prev => ({
				...prev,
				[assessmentId]: (prev[assessmentId] || []).map(f => f.id === fileId ? fileData : f)
			}));
		} catch (err) {
			console.error('Error uploading file:', err);
			alert('Failed to upload file: ' + (err.message || 'Unknown error'));
			setUploadingFiles(prev => ({
				...prev,
				[assessmentId]: (prev[assessmentId] || []).filter(f => f.id !== fileId)
			}));
		} finally {
			if (fileInputRefs.current[assessmentId]) fileInputRefs.current[assessmentId].value = '';
		}
	}

	function removeFile(assessmentId, fileId) {
		setUploadingFiles(prev => ({
			...prev,
			[assessmentId]: (prev[assessmentId] || []).filter(f => f.id !== fileId)
		}));
	}

	function confirmSubmit(assessmentId) {
		const files = uploadingFiles[assessmentId] || [];
		if (files.length === 0) {
			setSubmitError({
				message: language === 'bm' ? 'Sila muat naik sekurang-kurangnya satu fail' : 'Please upload at least one file'
			});
			return;
		}

		const assessment = assessments.find(a => a.id === assessmentId);
		setSubmitConfirm({
			assessmentId,
			title: assessment?.title || (language === 'bm' ? 'Tugasan' : 'Assignment'),
			fileCount: files.length
		});
	}

	async function handleSubmit(assessmentId) {
		const files = uploadingFiles[assessmentId] || [];
		setSubmitting(prev => ({ ...prev, [assessmentId]: true }));

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to submit');
			}

			const submissionData = {
				assessmentId,
				studentId: auth.currentUser.uid,
				files: files.map(f => ({
					name: f.name,
					url: f.url,
					type: f.type,
					size: f.size,
				})),
				status: 'submitted',
				submittedAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const existingSubmission = submissions[assessmentId];
			if (existingSubmission) {
				// Update existing submission
				await updateDoc(doc(db, 'submission', existingSubmission.id), submissionData);
				setSubmissions(prev => ({
					...prev,
					[assessmentId]: { ...existingSubmission, ...submissionData }
				}));
				setSubmitSuccess({
					message: language === 'bm' ? 'Tugasan berjaya dikemas kini!' : 'Assignment updated successfully!',
					isUpdate: true
				});
			} else {
				// Create new submission
				const docRef = await addDoc(collection(db, 'submission'), submissionData);
				setSubmissions(prev => ({
					...prev,
					[assessmentId]: { id: docRef.id, ...submissionData }
				}));
				setSubmitSuccess({
					message: language === 'bm' ? 'Tugasan berjaya dihantar!' : 'Assignment submitted successfully!',
					isUpdate: false
				});
			}

			// Clear uploaded files after successful submission
			setUploadingFiles(prev => ({
				...prev,
				[assessmentId]: []
			}));
			setExpandedAssessment(null);
			setSubmitConfirm(null);
		} catch (err) {
			console.error('Error submitting assignment:', err);
			setSubmitError({
				message: (language === 'bm' ? 'Gagal menghantar tugasan: ' : 'Failed to submit assignment: ') + (err.message || 'Unknown error')
			});
			setSubmitConfirm(null);
		} finally {
			setSubmitting(prev => ({ ...prev, [assessmentId]: false }));
		}
	}

	function formatFileSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Penilaian' : 'Assessments'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2 border-b border-border/40">
				<div className="space-y-2">
					<h1 className="text-4xl font-extrabold tracking-tight text-neutralDark bg-gradient-to-r from-neutralDark to-neutral-600 bg-clip-text">
						{language === 'bm' ? 'Penilaian' : 'Assessments'}
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl">
						{userRole === 'student'
							? (language === 'bm' ? 'Lihat dan hantar tugasan anda' : 'View and submit your assignments')
							: (language === 'bm' ? 'Urus penilaian dan lihat penghantaran' : 'Manage assessments and view submissions')}
					</p>
				</div>
				{userRole !== 'student' && (
					<Link href="/assessments/new">
						<Button size="lg" className="shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-300">
							<Plus className="h-5 w-5 mr-2" />
							{language === 'bm' ? 'Cipta Penilaian' : 'Create Assessment'}
						</Button>
					</Link>
				)}
			</div>

			{/* Assessments List */}
			{assessments.length === 0 ? (
				<Card className="bg-white/50 backdrop-blur-sm border-dashed border-2">
					<CardContent className="py-16 text-center">
						<div className="bg-primary/5 p-4 rounded-full w-fit mx-auto mb-4">
							<ClipboardCheck className="h-8 w-8 text-primary/50" />
						</div>
						<p className="text-lg text-muted-foreground font-medium">
							{language === 'bm' ? 'Tiada penilaian tersedia lagi.' : 'No assessments available yet.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
					{assessments.map((assessment) => {
						const deadlinePassed = assessment.config?.endDate ? isDeadlinePassed(assessment.config.endDate) : false;

						return (
							<Card key={assessment.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-white/50 backdrop-blur-sm rounded-2xl">
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<CardHeader className="relative border-b border-primary/5 p-6 space-y-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-2xl font-bold text-neutralDark leading-tight group-hover:text-primary transition-colors">{assessment.title}</CardTitle>
											<div className="flex flex-wrap gap-2">
												{assessment.published ? (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
														{language === 'bm' ? 'Diterbitkan' : 'Published'}
													</span>
												) : (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
														{language === 'bm' ? 'Draf' : 'Draft'}
													</span>
												)}
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20 capitalize">
													{language === 'bm'
														? (assessment.type === 'quiz' ? 'kuiz' : assessment.type === 'assignment' ? 'tugasan' : assessment.type === 'coding' ? 'pengaturcaraan' : assessment.type || 'kuiz')
														: (assessment.type || 'quiz')}
												</span>
												{deadlinePassed && (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 gap-1.5">
														<AlertCircle className="h-3 w-3" />
														{language === 'bm' ? 'Lewat' : 'Past Due'}
													</span>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="relative z-10 space-y-4">
									{assessment.description && (
										<p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
											{stripHtml(assessment.description)}
										</p>
									)}

									{assessment.questions && (
										<p className="text-sm text-muted-foreground">
											{assessment.questions.length} {assessment.questions.length === 1
												? (language === 'bm' ? 'soalan' : 'question')
												: (language === 'bm' ? 'soalan' : 'questions')}
										</p>
									)}

									{assessment.config && (
										<div className="grid grid-cols-2 gap-4 text-sm">
											{assessment.config.startDate && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<Calendar className="h-4 w-4" />
													<div className="flex flex-col">
														<span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
															{language === 'bm' ? 'Mula' : 'Starts'}
														</span>
														<span>{formatDate(assessment.config.startDate)}</span>
													</div>
												</div>
											)}
											{assessment.config.endDate && (
												<div className="flex items-center gap-2">
													<Clock className={`h-4 w-4 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
													<div className="flex flex-col">
														<span className={`text-[10px] uppercase font-bold tracking-wider opacity-70 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`}>
															{language === 'bm' ? 'Tamat' : 'Ends'}
														</span>
														<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
															{formatDate(assessment.config.endDate)}
														</span>
													</div>
												</div>
											)}
										</div>
									)}

									<div className="flex flex-wrap gap-2 pt-2 border-t">
										{userRole === 'student' ? (
											assessment.type === 'assignment' ? (
												<div className="w-full space-y-3">
													{submissions[assessment.id] && (
														<div className="p-2 bg-info/10 border border-info/20 rounded-lg">
															<p className="text-xs text-info flex items-center gap-2">
																<CheckCircle className="h-3.5 w-3.5" />
																{language === 'bm' ? 'Telah dihantar' : 'Already submitted'}
															</p>
														</div>
													)}
													<Link href={`/assessments/${assessment.id}/submit`} className="block w-full">
														<Button className="w-full h-11 text-base shadow-md group-hover:shadow-lg transition-all" variant="default">
															{submissions[assessment.id] ? (
																<>
																	<Eye className="h-5 w-5 mr-2" />
																	{language === 'bm' ? 'Lihat / Kemas Kini' : 'View / Update'}
																</>
															) : (
																<>
																	<Upload className="h-5 w-5 mr-2" />
																	{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}
																</>
															)}
														</Button>
													</Link>
												</div>
											) : (
												<div className="w-full space-y-3">
													{(() => {
														const submission = submissions[assessment.id];
														if (!submission || submission.score === undefined) return null;

														const percentage = submission.totalPoints > 0
															? (submission.score / submission.totalPoints) * 100
															: 0;
														const passingPercentage = assessment.config?.passingPercentage !== undefined ? assessment.config.passingPercentage : 40;
														const passed = percentage >= passingPercentage;

														return (
															<div className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all duration-300 ${passed
																? 'bg-success/5 border-success/20'
																: 'bg-destructive/5 border-destructive/20'
																}`}>
																<div className="flex items-center justify-between mb-3">
																	<div className="flex items-center gap-2">
																		<span className={`text-xs font-black tracking-wider uppercase px-2 py-1 rounded-md ${passed ? 'bg-success text-white' : 'bg-destructive text-white'}`}>
																			{passed
																				? (language === 'bm' ? 'LULUS' : 'PASS')
																				: (language === 'bm' ? 'GAGAL' : 'FAIL')
																			}
																		</span>
																	</div>
																	<div className="text-right">
																		<span className={`text-2xl font-black ${passed ? 'text-success' : 'text-destructive'}`}>
																			{percentage.toFixed(0)}%
																		</span>
																	</div>
																</div>

																<div className="w-full h-2 bg-black/5 rounded-full overflow-hidden mb-4">
																	<div
																		className={`h-full transition-all duration-1000 ease-out rounded-full ${passed ? 'bg-success' : 'bg-destructive'}`}
																		style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
																	/>
																</div>

																<Button
																	variant="ghost"
																	size="sm"
																	className={`w-full h-7 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 border rounded-lg ${passed
																		? 'hover:bg-success/5 border-success/10 text-success'
																		: 'hover:bg-destructive/5 border-destructive/10 text-destructive'
																		}`}
																	onClick={() => setSelectedResult(submission)}
																>
																	<Eye className="h-3.5 w-3.5" />
																	{language === 'bm' ? 'Lihat Keputusan' : 'View Results'}
																</Button>
															</div>
														);
													})()}
													<Link
														href={`/assessments/${assessment.id}/take`}
														className="block w-full"
													>
														<Button className="w-full h-11 text-base shadow-md group-hover:shadow-lg transition-all" variant="default">
															{language === 'bm' ? 'Ambil Penilaian' : 'Take Assessment'}
															<ArrowRight className="h-5 w-5 ml-2" />
														</Button>
													</Link>

												</div>
											)
										) : (
											<>

												<div className="grid grid-cols-2 gap-3">
													<Link href={`/assessments/${assessment.id}/edit`} className="w-full">
														<Button variant="outline" className="w-full h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary">
															<Edit2 className="h-4 w-4 mr-2" />
															{language === 'bm' ? 'Edit' : 'Edit'}
														</Button>
													</Link>
													<Link href={`/assessments/${assessment.id}/submissions`} className="w-full">
														<Button variant="outline" className="w-full h-10 border-info/20 hover:bg-info/5 hover:border-info/50 text-info">
															<FileText className="h-4 w-4 mr-2" />
															{language === 'bm' ? 'Penghantaran' : 'Submissions'}
														</Button>
													</Link>
													<Button
														variant="outline"
														onClick={() => togglePublish(assessment)}
														title={assessment.published
															? (language === 'bm' ? 'Nyahterbit' : 'Unpublish')
															: (language === 'bm' ? 'Terbitkan' : 'Publish')}
														className={`w-full h-10 ${assessment.published
															? "border-warning/20 text-warning hover:bg-warning/5 hover:border-warning/50"
															: "border-success/20 text-success hover:bg-success/5 hover:border-success/50"}`}
													>
														{assessment.published ? (
															<>
																<EyeOff className="h-4 w-4 mr-2" />
																{language === 'bm' ? 'Nyahterbit' : 'Unpublish'}
															</>
														) : (
															<>
																<Eye className="h-4 w-4 mr-2" />
																{language === 'bm' ? 'Terbitkan' : 'Publish'}
															</>
														)}
													</Button>
													<Button
														variant="outline"
														onClick={() => confirmDelete(assessment.id)}
														className="w-full h-10 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/50"
													>
														<Trash2 className="h-4 w-4 mr-2" />
														{language === 'bm' ? 'Padam' : 'Delete'}
													</Button>
												</div>
											</>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setDeleteConfirm(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setDeleteConfirm(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-destructive flex items-center gap-2">
								<AlertCircle className="h-6 w-6" />
								{language === 'bm' ? 'Sahkan Padam' : 'Confirm Delete'}
							</CardTitle>
							<CardDescription>
								{language === 'bm'
									? 'Adakah anda pasti mahu memadam penilaian ini? Tindakan ini tidak boleh dibatalkan.'
									: 'Are you sure you want to delete this assessment? This action cannot be undone.'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
								<p className="text-sm font-medium text-destructive">
									{language === 'bm' ? 'Penilaian:' : 'Assessment:'} {deleteConfirm.title}
								</p>
								{deleteConfirm.submissionCount > 0 && (
									<div className="mt-2 text-xs bg-white/50 p-2 rounded">
										<p className="font-bold flex items-center gap-1">
											<AlertCircle className="h-3 w-3" />
											{language === 'bm' ? 'AMARAN:' : 'WARNING:'}
										</p>
										<p>
											{language === 'bm'
												? `Terdapat ${deleteConfirm.submissionCount} penghantaran pelajar.`
												: `There are ${deleteConfirm.submissionCount} student submissions.`}
										</p>
										<p className="mt-1">
											{language === 'bm'
												? 'Memadam penilaian ini akan menghapus semua data dan penghantaran pelajar secara kekal.'
												: 'Deleting this assessment will permanently remove all associated student data and submissions.'}
										</p>
									</div>
								)}
							</div>
							<div className="flex gap-3 justify-end">
								<Button
									variant="outline"
									onClick={() => setDeleteConfirm(null)}
								>
									{language === 'bm' ? 'Batal' : 'Cancel'}
								</Button>
								<Button
									variant="destructive"
									onClick={() => handleDelete(deleteConfirm.assessmentId)}
								>
									<Trash2 className="h-4 w-4 mr-2" />
									{language === 'bm' ? 'Padam' : 'Delete'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Submit Confirmation Modal */}
			{submitConfirm && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setSubmitConfirm(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setSubmitConfirm(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-primary flex items-center gap-2">
								<CheckCircle className="h-6 w-6" />
								{language === 'bm' ? 'Sahkan Hantar' : 'Confirm Submit'}
							</CardTitle>
							<CardDescription>
								{language === 'bm'
									? 'Adakah anda pasti mahu menghantar tugasan ini?'
									: 'Are you sure you want to submit this assignment?'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
								<p className="text-sm font-medium text-primary mb-2">
									{language === 'bm' ? 'Tugasan:' : 'Assignment:'} {submitConfirm.title}
								</p>
								<p className="text-xs text-muted-foreground">
									{language === 'bm'
										? `Anda akan menghantar ${submitConfirm.fileCount} ${submitConfirm.fileCount === 1 ? 'fail' : 'fail'}.`
										: `You will submit ${submitConfirm.fileCount} ${submitConfirm.fileCount === 1 ? 'file' : 'files'}.`}
								</p>
							</div>
							{submissions[submitConfirm.assessmentId] && (
								<div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
									<p className="text-xs text-warning flex items-center gap-2">
										<AlertCircle className="h-4 w-4" />
										{language === 'bm'
											? 'Anda telah menghantar tugasan ini sebelum ini. Menghantar semula akan menggantikan penghantaran sebelumnya.'
											: 'You have already submitted this assignment. Resubmitting will replace your previous submission.'}
									</p>
								</div>
							)}
							<div className="flex gap-3 justify-end">
								<Button
									variant="outline"
									onClick={() => setSubmitConfirm(null)}
								>
									{language === 'bm' ? 'Batal' : 'Cancel'}
								</Button>
								<Button
									onClick={() => handleSubmit(submitConfirm.assessmentId)}
									disabled={submitting[submitConfirm.assessmentId]}
								>
									{submitting[submitConfirm.assessmentId] ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											{language === 'bm' ? 'Menghantar...' : 'Submitting...'}
										</>
									) : (
										<>
											<Upload className="h-4 w-4 mr-2" />
											{language === 'bm' ? 'Hantar' : 'Submit'}
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Submit Success Modal */}
			{submitSuccess && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setSubmitSuccess(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setSubmitSuccess(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-success flex items-center gap-2">
								<CheckCircle className="h-6 w-6" />
								{language === 'bm' ? 'Berjaya!' : 'Success!'}
							</CardTitle>
							<CardDescription>
								{submitSuccess.message}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex justify-end">
								<Button
									onClick={() => setSubmitSuccess(null)}
									className="bg-success hover:opacity-90"
								>
									{language === 'bm' ? 'OK' : 'OK'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Submit Error Modal */}
			{submitError && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setSubmitError(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setSubmitError(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-destructive flex items-center gap-2">
								<AlertCircle className="h-6 w-6" />
								{language === 'bm' ? 'Ralat' : 'Error'}
							</CardTitle>
							<CardDescription>
								{submitError.message}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex justify-end">
								<Button
									variant="destructive"
									onClick={() => setSubmitError(null)}
								>
									{language === 'bm' ? 'OK' : 'OK'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Result Details Modal */}
			<ResultDetailsModal
				isOpen={!!selectedResult}
				onClose={() => setSelectedResult(null)}
				submission={selectedResult}
				passingPercentage={assessments.find(a => a.id === selectedResult?.assessmentId)?.config?.passingPercentage ?? 40}
			/>
		</div>
	);
}

