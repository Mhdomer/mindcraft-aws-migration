'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardCheck, Clock, Calendar, ArrowRight, Edit2, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/app/contexts/LanguageContext';
import ResultDetailsModal from './ResultDetailsModal';

export default function AssessmentsPage() {
	const { userData, loading: authLoading } = useAuth();
	const router = useRouter();
	const { language } = useLanguage();
	const searchParams = useSearchParams();
	const typeFilter = searchParams.get('type');

	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submissions, setSubmissions] = useState({});
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [selectedResult, setSelectedResult] = useState(null);

	const userRole = userData?.role;
	const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

	useEffect(() => {
		if (authLoading) return;
		if (userData) loadData();
	}, [userData, authLoading]);

	useEffect(() => {
		if (deleteConfirm || selectedResult) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => { document.body.style.overflow = 'unset'; };
	}, [deleteConfirm, selectedResult]);

	async function loadData() {
		setLoading(true);
		try {
			if (userRole === 'student') {
				const [{ enrollments }, { assessments: all }, { submissions: subs }] = await Promise.all([
					api.get('/api/enrollments/student'),
					api.get('/api/assessments'),
					api.get('/api/submissions'),
				]);

				const enrolledCourseIds = new Set(
					enrollments.map(e => (e.courseId?._id || e.courseId)?.toString())
				);

				let filtered = all
					.filter(a => enrolledCourseIds.has(a.courseId?.toString()))
					.map(a => ({ ...a, id: a._id }));

				if (typeFilter) filtered = filtered.filter(a => a.type === typeFilter);

				const subMap = {};
				subs.forEach(s => {
					if (s.assessmentId) subMap[s.assessmentId] = s;
				});

				setSubmissions(subMap);
				setAssessments(filtered);
			} else {
				const { assessments: all } = await api.get('/api/assessments');
				let filtered = all.map(a => ({ ...a, id: a._id }));
				if (typeFilter) filtered = filtered.filter(a => a.type === typeFilter);
				setAssessments(filtered);
			}
		} catch (err) {
			console.error('Error loading assessments:', err);
		} finally {
			setLoading(false);
		}
	}

	async function confirmDelete(assessment) {
		let submissionCount = 0;
		try {
			const { submissions: subs } = await api.get(`/api/submissions?assessmentId=${assessment.id}`);
			submissionCount = subs.length;
		} catch {}
		setDeleteConfirm({ id: assessment.id, title: assessment.title, submissionCount });
	}

	async function executeDelete() {
		if (!deleteConfirm) return;
		try {
			await api.delete(`/api/assessments/${deleteConfirm.id}`);
			setAssessments(prev => prev.filter(a => a.id !== deleteConfirm.id));
			setDeleteConfirm(null);
		} catch (err) {
			alert('Failed to delete: ' + (err.message || 'Unknown error'));
			setDeleteConfirm(null);
		}
	}

	async function togglePublish(assessment) {
		const id = assessment.id || assessment._id;
		const newStatus = assessment.status === 'published' ? 'draft' : 'published';
		try {
			await api.put(`/api/assessments/${id}`, { status: newStatus });
			loadData();
		} catch (err) {
			alert('Failed to update: ' + (err.message || 'Unknown error'));
		}
	}

	function formatDate(ts) {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const typeIcons = { quiz: ClipboardCheck, exam: ClipboardCheck, assignment: ClipboardCheck };

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">{language === 'bm' ? 'Penilaian' : 'Assessments'}</h1>
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="space-y-8 relative z-10 animate-fadeIn">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2 border-b border-border/40">
					<div>
						<h1 className="text-4xl font-extrabold tracking-tight text-neutralDark">{language === 'bm' ? 'Penilaian' : 'Assessments'}</h1>
						<p className="text-lg text-muted-foreground mt-1">
							{isTeacherOrAdmin ? 'Manage quizzes, exams, and assignments' : 'View and complete your assessments'}
						</p>
					</div>
					{isTeacherOrAdmin && (
						<Link href="/assessments/new">
							<Button size="lg" className="shadow-lg hover:scale-105 transition-all duration-300">
								<Plus className="h-5 w-5 mr-2" /> Create Assessment
							</Button>
						</Link>
					)}
				</div>

				{assessments.length === 0 ? (
					<Card className="border-dashed border-2">
						<CardContent className="py-16 text-center">
							<ClipboardCheck className="h-8 w-8 text-primary/50 mx-auto mb-4" />
							<p className="text-lg text-muted-foreground font-medium mb-6">
								{isTeacherOrAdmin ? 'No assessments created yet.' : 'No assessments available.'}
							</p>
							{isTeacherOrAdmin && (
								<Link href="/assessments/new">
									<Button size="lg">Create First Assessment</Button>
								</Link>
							)}
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{assessments.map((assessment) => {
							const id = assessment.id || assessment._id;
							const submission = submissions[id];
							const isGraded = submission?.grade !== undefined || submission?.score !== undefined;
							const isPast = assessment.endDate && new Date(assessment.endDate) < new Date();

							return (
								<Card key={id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-white/50 backdrop-blur-sm rounded-2xl flex flex-col">
									<CardHeader className="border-b border-primary/5 p-5">
										<div className="flex items-start gap-2 mb-2">
											<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
												{assessment.type || 'assessment'}
											</span>
											{isTeacherOrAdmin ? (
												<span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
													assessment.status === 'published'
														? 'bg-success/10 text-success border-success/20'
														: 'bg-warning/10 text-warning border-warning/20'
												}`}>
													{assessment.status === 'published' ? 'Published' : 'Draft'}
												</span>
											) : submission ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 gap-1">
													<CheckCircle className="h-3 w-3" /> Submitted
												</span>
											) : isPast ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">
													Closed
												</span>
											) : null}
										</div>
										<CardTitle className="text-lg font-bold text-neutralDark group-hover:text-primary transition-colors line-clamp-2">
											{assessment.title}
										</CardTitle>
										{assessment.description && (
											<p className="text-sm text-muted-foreground line-clamp-2 mt-1">{assessment.description}</p>
										)}
									</CardHeader>
									<CardContent className="p-5 flex-1 flex flex-col space-y-3">
										{assessment.timer && (
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<Clock className="h-4 w-4" />
												<span>{assessment.timer} {language === 'bm' ? 'minit' : 'minutes'}</span>
											</div>
										)}
										{assessment.endDate && (
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<Calendar className="h-4 w-4" />
												<span>{language === 'bm' ? 'Tamat:' : 'Ends:'} {formatDate(assessment.endDate)}</span>
											</div>
										)}

										{isGraded && submission && (
											<div className="p-2 bg-success/5 rounded-lg border border-success/10 text-xs">
												<p className="text-success font-medium">Score: {submission.score ?? submission.grade ?? 0}%</p>
											</div>
										)}

										<div className="pt-2 mt-auto">
											{isTeacherOrAdmin ? (
												<div className="grid grid-cols-2 gap-2">
													<Link href={`/assessments/${id}/edit`} className="w-full">
														<Button variant="outline" className="w-full h-9 text-xs border-primary/20 text-primary hover:bg-primary/5">
															<Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
														</Button>
													</Link>
													<Link href={`/assessments/${id}/submissions`} className="w-full">
														<Button variant="outline" className="w-full h-9 text-xs border-neutral-300 hover:bg-neutral-100">
															Subs
														</Button>
													</Link>
													<Button variant="outline" onClick={() => togglePublish(assessment)} className={`w-full h-9 text-xs ${
														assessment.status === 'published'
															? 'border-warning/20 text-warning hover:bg-warning/5'
															: 'border-success/20 text-success hover:bg-success/5'
													}`}>
														{assessment.status === 'published' ? <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Unpub</> : <><Eye className="h-3.5 w-3.5 mr-1.5" /> Pub</>}
													</Button>
													<Button variant="outline" onClick={() => confirmDelete(assessment)} className="w-full h-9 text-xs border-destructive/20 text-destructive hover:bg-destructive/5">
														<Trash2 className="h-3.5 w-3.5 mr-1.5" /> Del
													</Button>
												</div>
											) : submission ? (
												<Button variant="outline" className="w-full" onClick={() => setSelectedResult(submission)}>
													{language === 'bm' ? 'Lihat Keputusan' : 'View Result'} <ArrowRight className="h-4 w-4 ml-2" />
												</Button>
											) : !isPast ? (
												<Link href={`/assessments/${id}/take`} className="block w-full">
													<Button className="w-full">
														{language === 'bm' ? 'Mula Penilaian' : 'Start Assessment'} <ArrowRight className="h-4 w-4 ml-2" />
													</Button>
												</Link>
											) : (
												<Button variant="secondary" className="w-full" disabled>
													{language === 'bm' ? 'Ditutup' : 'Closed'}
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}

				{/* Delete Modal */}
				{deleteConfirm && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
						<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2"><AlertCircle className="h-6 w-6" /> Confirm Delete</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<p className="text-sm font-medium">Assessment: {deleteConfirm.title}</p>
								{deleteConfirm.submissionCount > 0 && (
									<p className="text-sm text-destructive">Warning: {deleteConfirm.submissionCount} student submissions will also be deleted.</p>
								)}
								<div className="flex gap-3 justify-end">
									<Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
									<Button variant="destructive" onClick={executeDelete}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Result Modal */}
				{selectedResult && (
					<ResultDetailsModal submission={selectedResult} onClose={() => setSelectedResult(null)} language={language} />
				)}
			</div>
		</div>
	);
}
