'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function EditAssignmentPage() {
	const params = useParams();
	const router = useRouter();
	const { userData } = useAuth();
	const assignmentId = params.id;

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [courseTitle, setCourseTitle] = useState('');
	const [deadline, setDeadline] = useState('');
	const [status, setStatus] = useState('draft');
	const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState('');

	const userRole = userData?.role;

	useEffect(() => {
		if (!userData) return;
		if (userRole !== 'teacher' && userRole !== 'admin') { router.push('/dashboard/student'); return; }
		loadData();
	}, [userData]);

	async function loadData() {
		setLoading(true);
		try {
			const [{ courses: courseList }, { assignment }] = await Promise.all([
				api.get('/api/courses'),
				api.get(`/api/assignments/${assignmentId}`),
			]);

			setCourses(courseList.map(c => ({ ...c, id: c._id })));

			setTitle(assignment.title || '');
			setDescription(assignment.description || '');
			setCourseId(assignment.courseId || '');
			setCourseTitle(assignment.courseTitle || '');
			setStatus(assignment.status || 'draft');
			setAllowLateSubmissions(assignment.allowLateSubmissions || false);

			if (assignment.deadline) {
				const d = new Date(assignment.deadline);
				const pad = n => String(n).padStart(2, '0');
				setDeadline(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
			}
		} catch (err) {
			setError(err.message || 'Failed to load assignment');
		} finally {
			setLoading(false);
		}
	}

	function handleCourseChange(e) {
		const id = e.target.value;
		setCourseId(id);
		const c = courses.find(c => c.id === id || c._id === id);
		setCourseTitle(c ? c.title : '');
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (!title.trim()) { alert('Assignment title is required'); return; }
		if (!courseId) { alert('Please select a course'); return; }
		setSubmitting(true);
		try {
			await api.put(`/api/assignments/${assignmentId}`, {
				title: title.trim(),
				description: description.trim() || '',
				courseTitle,
				deadline: deadline ? new Date(deadline).toISOString() : null,
				status,
				allowLateSubmissions,
			});
			router.push('/assignments');
		} catch (err) {
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) return;
		setDeleting(true);
		try {
			await api.delete(`/api/assignments/${assignmentId}`);
			router.push('/assignments');
		} catch (err) {
			alert('Failed to delete assignment: ' + (err.message || 'Unknown error'));
			setDeleting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">Edit Assignment</h1>
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<Link href="/assignments"><Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></Link>
				<Card><CardContent className="py-12 text-center"><p className="text-body text-destructive">{error}</p></CardContent></Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<Link href="/assignments"><Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments</Button></Link>
				<h1 className="text-h1 text-neutralDark mb-2">Edit Assignment</h1>
				<p className="text-body text-muted-foreground">Update assignment details and settings</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					<Card>
						<CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Update the assignment details</CardDescription></CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">Assignment Title <span className="text-destructive">*</span></label>
								<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Python Programming Project" required />
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Course <span className="text-destructive">*</span></label>
								<select value={courseId} onChange={handleCourseChange} className="w-full px-3 py-2 border border-border rounded-md bg-white" required>
									<option value="">Select a course</option>
									{courses.map((course) => (
										<option key={course.id} value={course.id}>{course.title}</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Description</label>
								<RichTextEditor value={description} onChange={setDescription} placeholder="Enter assignment description and instructions..." />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader><CardTitle>Settings</CardTitle><CardDescription>Configure assignment settings</CardDescription></CardHeader>
						<CardContent className="space-y-4">
							<div className="w-1/2">
								<label className="block text-sm font-medium mb-2">Deadline</label>
								<Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
							</div>
							<div className="flex items-center gap-3">
								<Switch checked={allowLateSubmissions} onCheckedChange={setAllowLateSubmissions} />
								<div>
									<p className="text-sm font-medium">Allow late submissions</p>
									<p className="text-xs text-muted-foreground">Students can submit after the deadline</p>
								</div>
							</div>
							<div className="w-1/2">
								<label className="block text-sm font-medium mb-2">Status</label>
								<select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-white">
									<option value="draft">Draft</option>
									<option value="published">Published</option>
								</select>
							</div>
						</CardContent>
					</Card>

					<div className="flex gap-4 w-1/2 mx-auto justify-center">
						<Button type="submit" disabled={submitting}>
							{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
						</Button>
						<Button type="button" variant="outline" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
							{deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
						</Button>
						<Link href="/assignments"><Button variant="outline" type="button">Cancel</Button></Link>
					</div>
				</div>
			</form>
		</div>
	);
}
