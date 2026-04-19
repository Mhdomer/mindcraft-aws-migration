'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, Download, FileText, File, List, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function LessonPage() {
	const params = useParams();
	const router = useRouter();
	const { id: courseId, moduleId, lessonId } = params;
	const { userData, loading: authLoading } = useAuth();

	const [lesson, setLesson] = useState(null);
	const [module, setModule] = useState(null);
	const [course, setCourse] = useState(null);
	const [allLessons, setAllLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);
	const [downloading, setDownloading] = useState(false);
	const [showDownloadMenu, setShowDownloadMenu] = useState(false);
	const contentRef = useRef(null);
	const downloadMenuRef = useRef(null);
	const [downloadStatus, setDownloadStatus] = useState({});
	const [downloadMessage, setDownloadMessage] = useState('');
	const [tableOfContents, setTableOfContents] = useState([]);
	const [activeSection, setActiveSection] = useState('');
	const [showTOC, setShowTOC] = useState(true);
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [enrollmentId, setEnrollmentId] = useState(null);
	const [isCompleted, setIsCompleted] = useState(false);
	const [completing, setCompleting] = useState(false);
	const [textContent, setTextContent] = useState({});

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		loadAll();
	}, [authLoading, userData, courseId, moduleId, lessonId]);

	async function loadAll() {
		setLoading(true);
		try {
			const [lessonData, moduleData, courseData, lessonsData] = await Promise.all([
				api.get(`/api/lessons/${lessonId}`),
				api.get(`/api/modules/${moduleId}`),
				api.get(`/api/courses/${courseId}`),
				api.get(`/api/lessons?moduleId=${moduleId}`),
			]);

			const l = { ...lessonData.lesson, id: lessonData.lesson._id?.toString() || lessonData.lesson.id };
			const m = { ...moduleData.module, id: moduleData.module._id?.toString() || moduleData.module.id };
			const c = { ...courseData.course, id: courseData.course._id?.toString() || courseData.course.id };
			const ls = (lessonsData.lessons || []).map(x => ({ ...x, id: x._id?.toString() || x.id }));

			setLesson(l);
			setModule(m);
			setCourse(c);
			setAllLessons(ls);
			setCurrentLessonIndex(ls.findIndex(x => x.id === lessonId));

			// Check enrollment (students only)
			if (userData.role === 'student') {
				try {
					const enrollData = await api.get(`/api/enrollments?courseId=${courseId}`);
					setIsEnrolled(enrollData.enrolled);
					if (enrollData.enrollment) {
						const eid = enrollData.enrollment._id?.toString() || enrollData.enrollment.id;
						setEnrollmentId(eid);
						const completedLessons = enrollData.enrollment.progress?.completedLessons || [];
						setIsCompleted(completedLessons.some(cl => cl?.toString() === lessonId));
					}
				} catch (_) {
					setIsEnrolled(false);
				}
			} else {
				// Teachers/admins always have access
				setIsEnrolled(true);
			}
		} catch (err) {
			setError(err.message || 'Failed to load lesson');
		} finally {
			setLoading(false);
		}
	}

	const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
		? allLessons[currentLessonIndex + 1] : null;
	const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;

	// Table of contents extraction
	useEffect(() => {
		if (!lesson?.contentHtml || !contentRef.current) return;
		const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
		const toc = [];
		headings.forEach((h, i) => {
			const id = `section-${i}`;
			if (!h.id) h.id = id;
			toc.push({ id: h.id, text: h.textContent.trim(), level: parseInt(h.tagName.charAt(1)) });
		});
		setTableOfContents(toc);
		if (toc.length > 0) setActiveSection(toc[0].id);
	}, [lesson?.contentHtml]);

	// Track active section on scroll
	useEffect(() => {
		if (tableOfContents.length === 0) return;
		function handleScroll() {
			const scrollPosition = window.scrollY + 100;
			for (let i = tableOfContents.length - 1; i >= 0; i--) {
				const el = document.getElementById(tableOfContents[i].id);
				if (el && el.offsetTop <= scrollPosition) { setActiveSection(tableOfContents[i].id); break; }
			}
		}
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [tableOfContents]);

	// Close download menu on outside click
	useEffect(() => {
		function handleClickOutside(e) {
			if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) setShowDownloadMenu(false);
		}
		if (showDownloadMenu) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
	}, [showDownloadMenu]);

	// Load text file contents for inline display
	useEffect(() => {
		if (!lesson?.materials) return;
		lesson.materials.forEach(material => {
			if (canViewInline(material) === 'text') {
				fetch(material.url).then(r => r.text()).then(text => {
					setTextContent(prev => ({ ...prev, [material.id]: text }));
				}).catch(() => {
					setTextContent(prev => ({ ...prev, [material.id]: 'Error loading file.' }));
				});
			}
		});
	}, [lesson]);

	function scrollToSection(id) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		setActiveSection(id);
	}

	function htmlToText(html) {
		const div = document.createElement('div');
		div.innerHTML = html;
		div.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
		div.querySelectorAll('h1,h2,h3').forEach(h => h.replaceWith(`\n\n${h.textContent}\n\n`));
		div.querySelectorAll('p').forEach(p => p.replaceWith(`${p.textContent}\n\n`));
		div.querySelectorAll('li').forEach(li => li.replaceWith(`• ${li.textContent}\n`));
		let text = (div.textContent || div.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
		return text;
	}

	async function downloadAsTXT() {
		if (!lesson?.contentHtml) return;
		setDownloading(true);
		try {
			const text = htmlToText(lesson.contentHtml);
			const header = `${lesson.title}\n${course ? `Course: ${course.title}\n` : ''}${module ? `Module: ${module.title}\n` : ''}\n${'='.repeat(50)}\n\n`;
			const blob = new Blob([header + text], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			alert('Failed to download as TXT');
		} finally {
			setDownloading(false);
		}
	}

	async function downloadAsPDF() {
		if (!lesson || !contentRef.current) return;
		setDownloading(true);
		try {
			const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
			const imgData = canvas.toDataURL('image/png');
			const pdfWidth = 210;
			const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageHeight = pdf.internal.pageSize.height;
			pdf.setFontSize(18); pdf.text(lesson.title, 10, 15);
			if (course) { pdf.setFontSize(12); pdf.text(`Course: ${course.title}`, 10, 25); }
			if (module) { pdf.setFontSize(12); pdf.text(`Module: ${module.title}`, 10, 30); }
			let position = 35;
			let heightLeft = pdfHeight;
			pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
			heightLeft -= pageHeight;
			while (heightLeft > 0) {
				position = heightLeft - pdfHeight;
				pdf.addPage();
				pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
				heightLeft -= pageHeight;
			}
			pdf.save(`${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
		} catch (err) {
			alert('Failed to download as PDF');
		} finally {
			setDownloading(false);
		}
	}

	function formatFileSize(bytes) {
		if (!bytes && bytes !== 0) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function canViewInline(material) {
		if (!material?.type) return false;
		const type = material.type.toLowerCase();
		const name = (material.name || '').toLowerCase();
		if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
		if (type.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(name)) return 'image';
		if (type.includes('video') || /\.(mp4|mpeg|webm)$/i.test(name)) return 'video';
		if (type.includes('text') || name.endsWith('.txt')) return 'text';
		return false;
	}

	async function handleDownload(material) {
		setDownloadMessage('');
		setDownloadStatus(prev => ({ ...prev, [material.id]: 'checking' }));
		try {
			const response = await fetch(material.url);
			if (!response.ok) throw new Error('Download blocked or missing.');
			const blob = await response.blob();
			if (!blob.size) throw new Error('File looks empty.');
			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = material.name || 'lesson-material';
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(objectUrl);
			setDownloadStatus(prev => ({ ...prev, [material.id]: 'done' }));
			setDownloadMessage('Download saved.');
		} catch (err) {
			setDownloadStatus(prev => ({ ...prev, [material.id]: 'error' }));
			setDownloadMessage(err.message || 'Download failed.');
		}
	}

	async function handleComplete() {
		if (!isEnrolled || !enrollmentId) return;
		setCompleting(true);
		try {
			const payload = isCompleted
				? { removeLesson: lessonId }
				: { completedLesson: lessonId };

			const data = await api.patch(`/api/enrollments/${enrollmentId}/progress`, payload);

			// Recalculate overall progress
			const completedCount = data.enrollment.progress.completedLessons.length;
			// Estimate total from course modules lesson arrays
			const totalLessons = allLessons.length || 1;
			const overallProgress = Math.round((completedCount / totalLessons) * 100);
			await api.patch(`/api/enrollments/${enrollmentId}/progress`, { overallProgress });

			setIsCompleted(!isCompleted);
		} catch (err) {
			alert('Failed to update progress.');
		} finally {
			setCompleting(false);
		}
	}

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading lesson...</p>
			</div>
		);
	}

	if (error || !lesson) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Lesson not found'}</p>
				</CardContent>
			</Card>
		);
	}

	if (userData.role === 'student' && !isEnrolled) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6 space-y-4">
					<p className="text-body text-error font-semibold">Access Denied</p>
					<p className="text-body text-muted-foreground">You need to enroll in this course to view its lessons.</p>
					<Link href={`/courses/${courseId}`}><Button>Go to Course Page</Button></Link>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="relative">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Breadcrumb */}
				<div className="flex items-center gap-2 text-caption text-muted-foreground">
					<Link href="/courses" className="hover:text-neutralDark transition-colors">Courses</Link>
					<span>/</span>
					{course && (<><Link href={`/courses/${courseId}`} className="hover:text-neutralDark transition-colors">{course.title}</Link><span>/</span></>)}
					{module && (<><span>{module.title}</span><span>/</span></>)}
					<span className="text-neutralDark">{lesson.title}</span>
				</div>

				{/* Lesson Content */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-h2">{lesson.title}</CardTitle>
							<div className="flex items-center gap-2">
								{lesson.contentHtml && (
									<div className="relative" ref={downloadMenuRef}>
										<Button variant="outline" size="sm" disabled={downloading} onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2">
											<Download className="h-6 w-6 text-neutralDark flex-shrink-0" />
											{downloading ? 'Downloading...' : 'Download'}
										</Button>
										{showDownloadMenu && (
											<div className="absolute right-0 top-full mt-1 min-w-[200px] bg-white border border-border rounded-lg shadow-lg z-50">
												<button onClick={() => { downloadAsPDF(); setShowDownloadMenu(false); }} disabled={downloading} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutralLight transition-colors rounded-t-lg disabled:opacity-50">
													<FileText className="h-6 w-6 text-primary flex-shrink-0" />
													<span className="text-body">Download as PDF</span>
												</button>
												<button onClick={() => { downloadAsTXT(); setShowDownloadMenu(false); }} disabled={downloading} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutralLight transition-colors rounded-b-lg disabled:opacity-50">
													<File className="h-6 w-6 text-primary flex-shrink-0" />
													<span className="text-body">Download as TXT</span>
												</button>
											</div>
										)}
									</div>
								)}
								<Link href={`/courses/${courseId}`}>
									<Button variant="ghost" size="sm"><ArrowLeft className="h-5 w-5 mr-2 text-neutralDark" />Back to Course</Button>
								</Link>
							</div>
						</div>
					</CardHeader>
					<CardContent className="prose max-w-none">
						{lesson.contentHtml ? (
							<div ref={contentRef} dangerouslySetInnerHTML={{ __html: lesson.contentHtml }} className="text-body text-neutralDark lesson-content" />
						) : (
							<p className="text-body text-muted-foreground">No content available for this lesson yet.</p>
						)}
					</CardContent>
				</Card>

				<style jsx global>{`
					.lesson-content h1 { font-size: 2rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 1rem; color: #1A1C23; padding-bottom: 0.5rem; border-bottom: 2px solid #4C60FF; }
					.lesson-content h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1A1C23; padding-left: 0.75rem; border-left: 4px solid #4C60FF; }
					.lesson-content h3 { font-size: 1.25rem; font-weight: 500; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #374151; }
					.lesson-content p { margin-bottom: 1rem; line-height: 1.7; color: #4B5563; }
					.lesson-content ul { margin-left: 0; margin-bottom: 1.5rem; padding-left: 0; list-style: none; }
					.lesson-content ul li { margin-bottom: 0.75rem; padding-left: 1.75rem; position: relative; line-height: 1.6; color: #4B5563; }
					.lesson-content ul li::before { content: "•"; position: absolute; left: 0.5rem; color: #4C60FF; font-weight: bold; font-size: 1.25rem; line-height: 1.2; }
					.lesson-content ol { margin-left: 1.5rem; margin-bottom: 1.5rem; }
					.lesson-content ol li { margin-bottom: 0.75rem; line-height: 1.6; color: #4B5563; }
					.lesson-content a { color: #4C60FF; text-decoration: underline; font-weight: 500; }
					.lesson-content code { background-color: #000; color: #10B981; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875rem; border: 1px solid #374151; }
					.lesson-content pre { background-color: #000; color: #F9FAFB; padding: 1.25rem; border-radius: 0.5rem; overflow-x: auto; margin: 1.5rem 0; border-left: 4px solid #4C60FF; }
					.lesson-content pre code { background-color: transparent; color: #F9FAFB; padding: 0; border: none; }
					.lesson-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; border: 2px solid #374151; border-radius: 0.5rem; overflow: hidden; background-color: #000; }
					.lesson-content th, .lesson-content td { padding: 0.875rem 1rem; text-align: left; border: 1px solid #374151; }
					.lesson-content th { background-color: #1F2937; color: #FFF; font-weight: 600; }
					.lesson-content td { background-color: #111827; color: #F9FAFB; }
					.lesson-content tr:nth-child(even) td { background-color: #1F2937; }
					.lesson-content strong { font-weight: 600; color: #1A1C23; }
					.lesson-content blockquote { border-left: 4px solid #4C60FF; padding: 1rem 1rem 1rem 1.5rem; margin: 1.5rem 0; color: #6B7280; font-style: italic; background-color: #F9FAFB; border-radius: 0.25rem; }
				`}</style>

				{/* Lesson Materials */}
				{lesson.materials && lesson.materials.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-h4 flex items-center gap-2">
								<Download className="h-8 w-8 text-primary" />Lesson Materials
							</CardTitle>
							{downloadMessage && <p className="text-caption text-emerald-600">{downloadMessage}</p>}
						</CardHeader>
						<CardContent className="space-y-4">
							{lesson.materials.map(material => {
								const viewType = canViewInline(material);
								return (
									<div key={material.id || material.url} className="space-y-2">
										{viewType === 'pdf' && (
											<div className="border border-border rounded-lg overflow-hidden">
												<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
													<p className="text-body font-medium text-neutralDark">{material.name || 'PDF Document'}</p>
													<Button variant="ghost" size="sm" onClick={() => handleDownload(material)} disabled={downloadStatus[material.id] === 'checking'}>
														<Download className="h-5 w-5 mr-1" />Download
													</Button>
												</div>
												<iframe src={material.url} className="w-full h-[600px] border-0" title={material.name} />
											</div>
										)}
										{viewType === 'image' && (
											<div className="border border-border rounded-lg overflow-hidden">
												<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
													<p className="text-body font-medium text-neutralDark">{material.name || 'Image'}</p>
													<Button variant="ghost" size="sm" onClick={() => handleDownload(material)}><Download className="h-5 w-5 mr-1" />Download</Button>
												</div>
												<div className="flex items-center justify-center bg-black/5 p-4">
													<img src={material.url} alt={material.name} className="max-w-full max-h-[600px] object-contain rounded" />
												</div>
											</div>
										)}
										{viewType === 'video' && (
											<div className="border border-border rounded-lg overflow-hidden">
												<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
													<p className="text-body font-medium text-neutralDark">{material.name || 'Video'}</p>
													<Button variant="ghost" size="sm" onClick={() => handleDownload(material)}><Download className="h-5 w-5 mr-1" />Download</Button>
												</div>
												<div className="flex items-center justify-center bg-black p-4">
													<video src={material.url} controls className="max-w-full max-h-[600px] rounded">Your browser does not support video.</video>
												</div>
											</div>
										)}
										{!viewType && (
											<div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
												<div>
													<p className="text-body font-medium text-neutralDark">{material.name || 'Lesson file'}</p>
													<p className="text-caption text-muted-foreground">{material.type || 'file'} {material.size ? `• ${formatFileSize(material.size)}` : ''}</p>
												</div>
												<Button variant="outline" size="sm" onClick={() => handleDownload(material)} disabled={downloadStatus[material.id] === 'checking'}>
													<Download className="h-5 w-5 mr-1" />
													{downloadStatus[material.id] === 'checking' ? 'Checking...' : 'Download'}
												</Button>
											</div>
										)}
									</div>
								);
							})}
						</CardContent>
					</Card>
				)}

				{/* Navigation */}
				<div className="flex items-center justify-between pt-4 border-t border-border">
					{prevLesson ? (
						<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${prevLesson.id}`}>
							<Button variant="outline"><ArrowLeft className="h-5 w-5 mr-2 text-neutralDark" />Previous Lesson</Button>
						</Link>
					) : <div />}

					{nextLesson && (
						<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${nextLesson.id}`}>
							<Button>Next Lesson<ArrowRight className="h-5 w-5 ml-2 text-white" /></Button>
						</Link>
					)}

					{isEnrolled && userData.role === 'student' ? (
						<Button
							onClick={handleComplete}
							disabled={completing}
							variant={isCompleted ? 'outline' : 'default'}
							className={!isCompleted ? 'bg-green-600 hover:bg-green-700 text-white min-w-[200px]' : 'border-green-600 text-green-600 hover:bg-green-50 min-w-[200px]'}
						>
							{completing ? 'Updating...' : (isCompleted ? 'Mark as Incomplete' : 'Mark as Complete')}
							<CheckCircle className="h-5 w-5 ml-2" />
						</Button>
					) : (
						<Link href={`/courses/${courseId}`}>
							<Button variant="outline">Back to Course<BookOpen className="h-5 w-5 ml-2 text-neutralDark" /></Button>
						</Link>
					)}
				</div>
			</div>

			{/* Table of Contents Sidebar */}
			{tableOfContents.length > 0 && (
				<div className={`fixed right-4 top-24 w-64 bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg z-40 transition-all duration-300 ${showTOC ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
					<div className="p-4 border-b border-border flex items-center justify-between">
						<div className="flex items-center gap-2">
							<List className="h-5 w-5 text-primary flex-shrink-0" />
							<h3 className="text-sm font-semibold text-neutralDark">Table of Contents</h3>
						</div>
						<Button variant="ghost" size="sm" onClick={() => setShowTOC(false)} className="h-6 w-6 p-0">×</Button>
					</div>
					<div className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
						<nav className="space-y-1">
							{tableOfContents.map((item) => (
								<button
									key={item.id}
									onClick={() => scrollToSection(item.id)}
									className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === item.id ? 'bg-primary text-white font-medium' : 'text-muted-foreground hover:bg-neutralLight hover:text-neutralDark'}`}
									style={{ paddingLeft: `${(item.level - 1) * 0.75 + 0.75}rem` }}
								>
									{item.text}
								</button>
							))}
						</nav>
					</div>
				</div>
			)}

			{!showTOC && tableOfContents.length > 0 && (
				<button
					onClick={() => setShowTOC(true)}
					className="fixed right-4 top-24 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
				>
					<List className="h-6 w-6 text-white" />
				</button>
			)}
		</div>
	);
}
