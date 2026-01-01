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
					collection(db, 'enrollment'),
					where('studentId', '==', currentUserId)
				);
				const enrollmentSnapshot = await getDocs(enrollmentsQuery);
				const enrolledCourseIds = enrollmentSnapshot.docs.map(doc => doc.data().courseId);

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

					// Sort by createdAt in memory to avoid needing a complex composite index immediately
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
		<div className="space-y-8">
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

						return (
							<Card key={assignment.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-white/50 backdrop-blur-sm rounded-2xl">
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<CardHeader className="relative border-b border-primary/5 p-6 space-y-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-2xl font-bold text-neutralDark leading-tight group-hover:text-primary transition-colors">{assignment.title}</CardTitle>
											<div className="flex flex-wrap gap-2">
												{assignment.status === 'published' ? (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
														Published
													</span>
												) : (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
														Draft
													</span>
												)}
												{assignment.isOpen ? (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20 gap-1.5">
														<CheckCircle className="h-3 w-3" />
														Open
													</span>
												) : (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border gap-1.5">
														<XCircle className="h-3 w-3" />
														Closed
													</span>
												)}
												{deadlinePassed && (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 gap-1.5">
														<AlertCircle className="h-3 w-3" />
														Past Due
													</span>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="relative z-10 space-y-4">
									{assignment.description && (
										<p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
											{stripHtml(assignment.description)}
										</p>
									)}

									{assignment.courseTitle && (
										<p className="text-sm text-muted-foreground">
											Course: {assignment.courseTitle}
										</p>
									)}

									{assignment.deadline && (
										<div className="flex items-center gap-2 text-sm bg-muted/30 p-2 rounded-lg border border-border/50">
											<Calendar className={`h-4 w-4 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
											<div className="flex gap-1.5 items-baseline">
												<span className={`text-[10px] uppercase font-bold tracking-wider opacity-70 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`}>
													Due
												</span>
												<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
													{formatDate(assignment.deadline)}
												</span>
											</div>
										</div>
									)}

									<div className="pt-4 border-t border-border/50">
										{isTeacherOrAdmin ? (
											<div className="grid grid-cols-2 gap-3">
												<Link href={`/assignments/${assignment.id}/edit`} className="w-full">
													<Button variant="outline" className="w-full h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary">
														<Edit2 className="h-4 w-4 mr-2" />
														Edit
													</Button>
												</Link>

												<Link href={`/assignments/${assignment.id}`} className="w-full">
													<Button variant="outline" className="w-full h-10 border-neutral-300 hover:bg-neutral-100">
														<FileText className="h-4 w-4 mr-2" />
														Submissions
													</Button>
												</Link>

												<Button
													variant="outline"
													onClick={() => togglePublish(assignment)}
													title={assignment.status === 'published' ? 'Unpublish' : 'Publish'}
													className={`w-full h-10 ${assignment.status === 'published'
														? "border-warning/20 text-warning hover:bg-warning/5 hover:border-warning/50"
														: "border-success/20 text-success hover:bg-success/5 hover:border-success/50"}`}
												>
													{assignment.status === 'published' ? (
														<>
															<EyeOff className="h-4 w-4 mr-2" />
															Unpublish
														</>
													) : (
														<>
															<Eye className="h-4 w-4 mr-2" />
															Publish
														</>
													)}
												</Button>

												<Button
													variant="outline"
													onClick={() => confirmDelete(assignment.id)}
													className="w-full h-10 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/50"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete
												</Button>
											</div>
										) : (
											<Link href={`/assignments/${assignment.id}`} className="block w-full">
												<Button className="w-full h-11 text-base shadow-md group-hover:shadow-lg transition-all" variant="default">
													View Details
													<ArrowRight className="h-5 w-5 ml-2" />
												</Button>
											</Link>
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
	);
}

