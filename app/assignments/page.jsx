'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Plus, Edit2, Trash2, Calendar, Clock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function AssignmentsPage() {
	const { userData, loading: authLoading } = useAuth();
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [submissions, setSubmissions] = useState({});

	const userRole = userData?.role;

	useEffect(() => {
		if (authLoading) return;
		if (userData) loadAssignments();
	}, [userData, authLoading]);

	async function loadAssignments() {
		setLoading(true);
		try {
			if (userRole === 'student') {
				const [{ enrollments }, { assignments: all }, { submissions: subs }] = await Promise.all([
					api.get('/api/enrollments/student'),
					api.get('/api/assignments'),
					api.get('/api/submissions'),
				]);

				const enrolledCourseIds = new Set(
					enrollments.map(e => (e.courseId?._id || e.courseId)?.toString())
				);

				const filtered = all
					.filter(a => enrolledCourseIds.has(a.courseId?.toString()))
					.map(a => ({ ...a, id: a._id }));

				const subMap = {};
				subs.forEach(s => {
					if (s.assignmentId) subMap[s.assignmentId] = s;
				});

				setSubmissions(subMap);
				setAssignments(filtered);
			} else {
				const { assignments: all } = await api.get('/api/assignments');
				setAssignments(all.map(a => ({ ...a, id: a._id })));
			}
		} catch (err) {
			console.error('Error loading assignments:', err);
		} finally {
			setLoading(false);
		}
	}

	async function confirmDelete(assignmentId) {
		const assignment = assignments.find(a => a.id === assignmentId || a._id === assignmentId);
		let submissionCount = 0;
		try {
			const { submissions: subs } = await api.get(`/api/submissions?assignmentId=${assignmentId}`);
			submissionCount = subs.length;
		} catch {}
		setDeleteConfirm({ id: assignmentId, title: assignment?.title || 'Assignment', submissionCount });
	}

	async function executeDelete() {
		if (!deleteConfirm) return;
		try {
			await api.delete(`/api/assignments/${deleteConfirm.id}`);
			setAssignments(prev => prev.filter(a => a.id !== deleteConfirm.id && a._id !== deleteConfirm.id));
			setDeleteConfirm(null);
		} catch (err) {
			alert('Failed to delete assignment: ' + (err.message || 'Unknown error'));
			setDeleteConfirm(null);
		}
	}

	async function togglePublish(assignment) {
		const id = assignment.id || assignment._id;
		try {
			await api.put(`/api/assignments/${id}`, {
				status: assignment.status === 'published' ? 'draft' : 'published',
			});
			loadAssignments();
		} catch (err) {
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		}
	}

	function formatDate(ts) {
		if (!ts) return 'No date set';
		const date = new Date(ts);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		return new Date(deadline) < new Date();
	}

	function getRelativeTime(deadline) {
		if (!deadline) return null;
		const date = new Date(deadline);
		const now = new Date();
		const diffMs = date - now;
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffMs < 0) {
			const absDays = Math.abs(diffDays);
			if (absDays === 0) return 'Ended today';
			if (absDays === 1) return 'Ended yesterday';
			return `Ended ${absDays} days ago`;
		} else {
			if (diffHours < 24) return diffHours <= 0 ? 'Due in less than an hour' : `Due in ${diffHours} hours`;
			if (diffDays === 1) return 'Due tomorrow';
			return `Due in ${diffDays} days`;
		}
	}

	function stripHtml(html) {
		if (!html) return '';
		if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
		const tmp = document.createElement('DIV');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Assignments</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="space-y-8 relative z-10 animate-fadeIn">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2 border-b border-border/40">
					<div className="space-y-2">
						<h1 className="text-4xl font-extrabold tracking-tight text-neutralDark bg-gradient-to-r from-neutralDark to-neutral-600 bg-clip-text">Assignments</h1>
						<p className="text-lg text-muted-foreground max-w-2xl">
							{isTeacherOrAdmin ? 'Create and manage assignments for your courses' : 'View and complete your assignments'}
						</p>
					</div>
					{isTeacherOrAdmin && (
						<Link href="/assignments/new">
							<Button size="lg" className="shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-300">
								<Plus className="h-5 w-5 mr-2" />
								Create Assignment
							</Button>
						</Link>
					)}
				</div>

				{assignments.length === 0 ? (
					<Card className="bg-white/50 backdrop-blur-sm border-dashed border-2">
						<CardContent className="py-16 text-center">
							<div className="bg-primary/5 p-4 rounded-full w-fit mx-auto mb-4">
								<FileText className="h-8 w-8 text-primary/50" />
							</div>
							<p className="text-lg text-muted-foreground font-medium mb-6">
								{isTeacherOrAdmin ? 'No assignments created yet.' : 'No active assignments found.'}
							</p>
							{isTeacherOrAdmin && (
								<Link href="/assignments/new">
									<Button size="lg" className="shadow-lg hover:shadow-xl transition-all">Create First Assignment</Button>
								</Link>
							)}
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
						{assignments.map((assignment) => {
							const id = assignment.id || assignment._id;
							const deadlinePassed = isDeadlinePassed(assignment.deadline);
							const submission = submissions[id];
							const deadlineDate = assignment.deadline ? new Date(assignment.deadline) : null;
							const now = new Date();
							const hoursUntilDue = deadlineDate ? (deadlineDate - now) / (1000 * 60 * 60) : 0;
							const isBefore24h = hoursUntilDue > 0 && hoursUntilDue < 24;

							return (
								<Card key={id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-white/50 backdrop-blur-sm rounded-2xl flex flex-col">
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
									<CardHeader className="relative border-b border-primary/5 p-6 space-y-3 pb-4">
										<div className="flex items-start justify-between">
											<div className="flex-1 space-y-2">
												<div className="flex flex-wrap gap-2">
													{isTeacherOrAdmin ? (
														<span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
															assignment.status === 'published'
																? 'bg-success/10 text-success border-success/20'
																: 'bg-warning/10 text-warning border-warning/20'
														}`}>
															{assignment.status === 'published' ? 'Published' : 'Draft'}
														</span>
													) : (
														submission ? (
															<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-info/10 text-info border border-info/20 gap-1">
																<CheckCircle className="h-4 w-4" /> Submitted
															</span>
														) : deadlinePassed ? (
															<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 gap-1">
																<XCircle className="h-4 w-4" /> Closed
															</span>
														) : (
															<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 gap-1">
																<CheckCircle className="h-4 w-4" /> Open
															</span>
														)
													)}
													{assignment.courseTitle && (
														<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral/10 text-neutralDark/60 border border-neutral/20 max-w-[150px] truncate">
															{assignment.courseTitle}
														</span>
													)}
												</div>
												<CardTitle className="text-xl font-bold text-neutralDark leading-tight group-hover:text-primary transition-colors line-clamp-2">
													{assignment.title}
												</CardTitle>
											</div>
										</div>
									</CardHeader>
									<CardContent className="relative z-10 flex-1 flex flex-col p-6 pt-4 space-y-4">
										{assignment.deadline && (
											<div className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-medium transition-colors ${
												deadlinePassed
													? 'bg-neutral/5 border-neutral/10 text-muted-foreground'
													: isBefore24h
														? 'bg-warning/10 border-warning/30 text-warning-foreground'
														: 'bg-white border-border/50 text-muted-foreground'
											}`}>
												<Clock className={`h-5 w-5 ${isBefore24h ? 'text-warning' : 'opacity-70'}`} />
												<div className="flex flex-col">
													<span className="uppercase tracking-wider text-[10px] opacity-70 mb-0.5">
														{deadlinePassed ? 'Deadline Passed' : 'Due Date'}
													</span>
													<div className="flex items-baseline gap-2">
														<span>{formatDate(assignment.deadline)}</span>
														<span className="w-1 h-1 rounded-full bg-current opacity-30" />
														<span className={isBefore24h ? 'font-bold' : ''}>{getRelativeTime(assignment.deadline)}</span>
													</div>
												</div>
											</div>
										)}

										{assignment.description && (
											<div className="text-sm">
												<span className="block text-xs font-bold text-neutralDark/50 uppercase tracking-wider mb-1">Overview</span>
												<p className="text-muted-foreground line-clamp-3 leading-relaxed">{stripHtml(assignment.description)}</p>
											</div>
										)}

										<div className="pt-2 mt-auto">
											{isTeacherOrAdmin ? (
												<div className="grid grid-cols-2 gap-3">
													<Link href={`/assignments/${id}/edit`} className="w-full">
														<Button variant="outline" className="w-full h-9 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary">
															<Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
														</Button>
													</Link>
													<Link href={`/assignments/${id}`} className="w-full">
														<Button variant="outline" className="w-full h-9 text-xs border-neutral-300 hover:bg-neutral-100">
															<FileText className="h-3.5 w-3.5 mr-1.5" /> Subs
														</Button>
													</Link>
													<Button
														variant="outline"
														onClick={() => togglePublish(assignment)}
														className={`w-full h-9 text-xs ${
															assignment.status === 'published'
																? 'border-warning/20 text-warning hover:bg-warning/5 hover:border-warning/50'
																: 'border-success/20 text-success hover:bg-success/5 hover:border-success/50'
														}`}
													>
														{assignment.status === 'published' ? (
															<><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Unpub</>
														) : (
															<><Eye className="h-3.5 w-3.5 mr-1.5" /> Pub</>
														)}
													</Button>
													<Button
														variant="outline"
														onClick={() => confirmDelete(id)}
														className="w-full h-9 text-xs border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/50"
													>
														<Trash2 className="h-3.5 w-3.5 mr-1.5" /> Del
													</Button>
												</div>
											) : (
												<div className="w-full">
													{submission ? (
														<Link href={`/assignments/${id}`} className="block w-full">
															<Button variant="outline" className="w-full h-11 text-base border-primary/20 text-primary hover:bg-primary/5">
																<FileText className="h-5 w-5 mr-2" /> View Submission
															</Button>
														</Link>
													) : !deadlinePassed ? (
														<Link href={`/assignments/${id}`} className="block w-full">
															<Button className="w-full h-11 text-base shadow-md group-hover:shadow-lg transition-all" variant="default">
																Start Assignment <ArrowRight className="h-4 w-4 ml-2" />
															</Button>
														</Link>
													) : (
														<Link href={`/assignments/${id}`} className="block w-full">
															<Button variant="secondary" className="w-full h-11 text-base text-muted-foreground bg-muted/50 hover:bg-muted">
																<Eye className="h-5 w-5 mr-2" /> View Details
															</Button>
														</Link>
													)}
												</div>
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
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
						<Card className="max-w-md w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
							<CardHeader>
								<CardTitle className="text-xl text-neutralDark flex items-center gap-2">
									<AlertCircle className="h-6 w-6 text-neutralDark" /> Confirm Delete
								</CardTitle>
								<CardDescription>Are you sure you want to delete this assignment? This action cannot be undone.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="p-4 border border-border rounded-lg bg-white">
									<p className="text-sm font-semibold text-neutralDark mb-2">Assignment: {deleteConfirm.title}</p>
									{deleteConfirm.submissionCount > 0 && (
										<div className="space-y-2">
											<div className="flex items-center gap-2 text-destructive font-bold text-sm">
												<AlertCircle className="h-4 w-4" /> WARNING:
											</div>
											<p className="text-sm text-muted-foreground">
												There are {deleteConfirm.submissionCount} student submissions.
											</p>
											<p className="text-sm text-neutralDark">
												Deleting this assignment will permanently remove all associated student data and submissions.
											</p>
										</div>
									)}
								</div>
								<div className="flex gap-3 justify-end pt-2">
									<Button variant="outline" onClick={() => setDeleteConfirm(null)} className="px-6">Cancel</Button>
									<Button variant="destructive" onClick={executeDelete} className="px-6 bg-red-600 hover:bg-red-700 text-white">
										<Trash2 className="h-4 w-4 mr-2" /> Delete
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
