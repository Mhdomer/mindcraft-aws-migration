'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Plus, Edit2, Trash2, Calendar, Clock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssignmentsPage() {
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [submissions, setSubmissions] = useState({});
	const router = useRouter();

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
		if (userRole) {
			loadAssignments();
		}
	}, [userRole]);

	async function loadAssignments() {
		setLoading(true);
		try {
			let loadedAssignments = [];

			if (userRole === 'student') {
				// 1. Get student's enrolled course IDs
				const enrollmentsQuery = query(
					collection(db, 'progress'),
					where('studentId', '==', currentUserId)
				);
				const enrollmentSnapshot = await getDocs(enrollmentsQuery);
				const enrolledCourseIds = enrollmentSnapshot.docs.map(doc => doc.data().courseId);

				// Fetch submissions
				const submissionsQuery = query(
					collection(db, 'submission'),
					where('studentId', '==', currentUserId)
				);
				const submissionSnapshot = await getDocs(submissionsQuery);
				const subMap = {};
				submissionSnapshot.docs.forEach(doc => {
					const data = doc.data();
					// Store by assignmentId
					subMap[data.assignmentId] = { id: doc.id, ...data };
				});
				setSubmissions(subMap);

				if (enrolledCourseIds.length > 0) {
					// 2. Fetch published assignments for those courses
					// Using multiple queries if more than 10 courses, but usually it's few
					const assignmentsQuery = query(
						collection(db, 'assignment'),
						where('status', '==', 'published'),
						where('courseId', 'in', enrolledCourseIds)
					);

					const snapshot = await getDocs(assignmentsQuery);
					loadedAssignments = snapshot.docs.map(doc => ({
						id: doc.id,
						...doc.data(),
					}));

					// Sort by createdAt in memory
					loadedAssignments.sort((a, b) => {
						const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
						const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
						return dateB - dateA;
					});
				}
			} else {
				// Teachers and admins see all assignments
				const assignmentsQuery = query(
					collection(db, 'assignment'),
					orderBy('createdAt', 'desc')
				);
				const snapshot = await getDocs(assignmentsQuery);
				loadedAssignments = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
				}));
			}

			setAssignments(loadedAssignments);
		} catch (err) {
			console.error('Error loading assignments:', err);
		} finally {
			setLoading(false);
		}
	}

	async function confirmDelete(assignmentId) {
		const assignment = assignments.find(a => a.id === assignmentId);
		let submissionCount = 0;
		try {
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assignmentId', '==', assignmentId)
			);
			const snapshot = await getDocs(submissionsQuery);
			submissionCount = snapshot.size;
		} catch (err) {
			console.error('Error checking submissions:', err);
		}

		setDeleteConfirm({
			id: assignmentId,
			title: assignment?.title || 'Assignment',
			submissionCount
		});
	}

	async function executeDelete() {
		if (!deleteConfirm) return;
		const assignmentId = deleteConfirm.id;

		try {
			// Delete all associated submissions first
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assignmentId', '==', assignmentId)
			);
			const submissionSnapshot = await getDocs(submissionsQuery);
			const deletePromises = submissionSnapshot.docs.map(doc => deleteDoc(doc.ref));
			await Promise.all(deletePromises);

			await deleteDoc(doc(db, 'assignment', assignmentId));
			setAssignments(prev => prev.filter(a => a.id !== assignmentId));
			setDeleteConfirm(null);
		} catch (err) {
			console.error('Error deleting assignment:', err);
			alert('Failed to delete assignment: ' + (err.message || 'Unknown error'));
			setDeleteConfirm(null);
		}
	}

	async function togglePublish(assignment) {
		try {
			await updateDoc(doc(db, 'assignment', assignment.id), {
				status: assignment.status === 'published' ? 'draft' : 'published',
				updatedAt: new Date(),
			});
			loadAssignments();
		} catch (err) {
			console.error('Error updating assignment:', err);
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		}
	}

	async function toggleOpen(assignment) {
		try {
			await updateDoc(doc(db, 'assignment', assignment.id), {
				isOpen: !assignment.isOpen,
				updatedAt: new Date(),
			});
			loadAssignments();
		} catch (err) {
			console.error('Error updating assignment:', err);
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return 'No date set';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
		return deadlineDate < new Date();
	}

	function getRelativeTime(deadline) {
		if (!deadline) return null;
		const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
		const now = new Date();
		const diffMs = date - now;
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffMs < 0) {
			// Past
			const absDays = Math.abs(diffDays);
			if (absDays === 0) return 'Ended today';
			if (absDays === 1) return 'Ended yesterday';
			return `Ended ${absDays} days ago`;
		} else {
			// Future
			if (diffHours < 24) {
				if (diffHours <= 0) return `Due in less than an hour`;
				return `Due in ${diffHours} hours`;
			}
			if (diffDays === 1) return 'Due tomorrow';
			return `Due in ${diffDays} days`;
		}
	}

	function stripHtml(html) {
		if (!html) return '';
		// Remove HTML tags and decode entities
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
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="space-y-8 relative z-10 animate-fadeIn">
				{/* Page Header */}
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

				{/* Assignments List */}
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
							const deadlinePassed = isDeadlinePassed(assignment.deadline);
							const submission = submissions[assignment.id];

							// Urgency Logic
							const deadlineDate = assignment.deadline ? (assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline)) : null;
							const now = new Date();
							const hoursUntilDue = deadlineDate ? (deadlineDate - now) / (1000 * 60 * 60) : 0;
							const isBefore24h = hoursUntilDue > 0 && hoursUntilDue < 24;

							return (
								<Card key={assignment.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-white/50 backdrop-blur-sm rounded-2xl flex flex-col">
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
									<CardHeader className="relative border-b border-primary/5 p-6 space-y-3 pb-4">
										<div className="flex items-start justify-between">
											<div className="flex-1 space-y-2">
												{/* Metadata / Tags */}
												<div className="flex flex-wrap gap-2">
													{/* Status Tags */}
													{isTeacherOrAdmin ? (
														<>
															{assignment.status === 'published' ? (
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">
																	Published
																</span>
															) : (
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20">
																	Draft
																</span>
															)}
														</>
													) : (
														// Student Status Tags
														<>
															{submission ? (
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-info/10 text-info border border-info/20 gap-1">
																	<CheckCircle className="h-4 w-4" />
																	Submitted
																</span>
															) : deadlinePassed ? (
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 gap-1">
																	<XCircle className="h-4 w-4" />
																	Closed
																</span>
															) : (
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 gap-1">
																	<CheckCircle className="h-4 w-4" />
																	Open
																</span>
															)}
														</>
													)}

													{/* Course Tag as Metadata */}
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
											<div className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-medium transition-colors ${deadlinePassed
												? 'bg-neutral/5 border-neutral/10 text-muted-foreground' // Muted for past due
												: isBefore24h
													? 'bg-warning/10 border-warning/30 text-warning-foreground' // Yellow for urgency
													: 'bg-white border-border/50 text-muted-foreground' // Default
												}`}>
												<Clock className={`h-5 w-5 ${isBefore24h ? 'text-warning' : 'opacity-70'}`} />
												<div className="flex flex-col">
													<span className="uppercase tracking-wider text-[10px] opacity-70 mb-0.5">
														{deadlinePassed ? 'Deadline Passed' : 'Due Date'}
													</span>
													<div className="flex items-baseline gap-2">
														<span>{formatDate(assignment.deadline)}</span>
														<span className="w-1 h-1 rounded-full bg-current opacity-30" />
														<span className={isBefore24h ? 'font-bold' : ''}>
															{getRelativeTime(assignment.deadline)}
														</span>
													</div>
												</div>
											</div>
										)}

										{/* Description with Typography Fix */}
										{assignment.description && (
											<div className="text-sm">
												<span className="block text-xs font-bold text-neutralDark/50 uppercase tracking-wider mb-1">
													Overview
												</span>
												<p className="text-muted-foreground line-clamp-3 leading-relaxed">
													{stripHtml(assignment.description)}
												</p>
											</div>
										)}

										<div className="pt-2 mt-auto">
											{isTeacherOrAdmin ? (
												<div className="grid grid-cols-2 gap-3">
													<Link href={`/assignments/${assignment.id}/edit`} className="w-full">
														<Button variant="outline" className="w-full h-9 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary">
															<Edit2 className="h-3.5 w-3.5 mr-1.5" />
															Edit
														</Button>
													</Link>

													<Link href={`/assignments/${assignment.id}`} className="w-full">
														<Button variant="outline" className="w-full h-9 text-xs border-neutral-300 hover:bg-neutral-100">
															<FileText className="h-3.5 w-3.5 mr-1.5" />
															Subs
														</Button>
													</Link>

													<Button
														variant="outline"
														onClick={() => togglePublish(assignment)}
														title={assignment.status === 'published' ? 'Unpublish' : 'Publish'}
														className={`w-full h-9 text-xs ${assignment.status === 'published'
															? "border-warning/20 text-warning hover:bg-warning/5 hover:border-warning/50"
															: "border-success/20 text-success hover:bg-success/5 hover:border-success/50"}`}
													>
														{assignment.status === 'published' ? (
															<>
																<EyeOff className="h-3.5 w-3.5 mr-1.5" />
																Unpub
															</>
														) : (
															<>
																<Eye className="h-3.5 w-3.5 mr-1.5" />
																Pub
															</>
														)}
													</Button>

													<Button
														variant="outline"
														onClick={() => confirmDelete(assignment.id)}
														className="w-full h-9 text-xs border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/50"
													>
														<Trash2 className="h-3.5 w-3.5 mr-1.5" />
														Del
													</Button>
												</div>
											) : (
												// Student Actions
												<div className="w-full">
													{submission ? (
														<Link href={`/assignments/${assignment.id}`} className="block w-full">
															<Button variant="outline" className="w-full h-11 text-base border-primary/20 text-primary hover:bg-primary/5">
																<FileText className="h-5 w-5 mr-2" />
																View Submission
															</Button>
														</Link>
													) : !deadlinePassed ? (
														<Link href={`/assignments/${assignment.id}`} className="block w-full">
															<Button className="w-full h-11 text-base shadow-md group-hover:shadow-lg transition-all" variant="default">
																Start Assignment
																<ArrowRight className="h-4 w-4 ml-2" />
															</Button>
														</Link>
													) : (
														<Link href={`/assignments/${assignment.id}`} className="block w-full">
															<Button variant="secondary" className="w-full h-11 text-base text-muted-foreground bg-muted/50 hover:bg-muted">
																<Eye className="h-5 w-5 mr-2" />
																View Details
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
					<div
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
						onClick={(e) => {
							if (e.target === e.currentTarget) setDeleteConfirm(null);
						}}
					>
						<Card className="max-w-md w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
							<CardHeader>
								<CardTitle className="text-xl text-neutralDark flex items-center gap-2">
									<AlertCircle className="h-6 w-6 text-neutralDark" />
									Confirm Delete
								</CardTitle>
								<CardDescription>
									Are you sure you want to delete this assignment? This action cannot be undone.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="p-4 border border-border rounded-lg bg-white">
									<p className="text-sm font-semibold text-neutralDark mb-2">
										Assignment: {deleteConfirm.title}
									</p>

									{deleteConfirm.submissionCount > 0 && (
										<div className="space-y-2">
											<div className="flex items-center gap-2 text-destructive font-bold text-sm">
												<AlertCircle className="h-4 w-4" />
												WARNING:
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
									<Button
										variant="outline"
										onClick={() => setDeleteConfirm(null)}
										className="px-6"
									>
										Cancel
									</Button>
									<Button
										variant="destructive"
										onClick={executeDelete}
										className="px-6 bg-red-600 hover:bg-red-700 text-white"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete
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

