'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function CreateAssignmentPage() {
	const router = useRouter();
	const { userData } = useAuth();
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
	const [generating, setGenerating] = useState(false);

	const userRole = userData?.role;

	useEffect(() => {
		if (!userData) return;
		if (userRole !== 'teacher' && userRole !== 'admin') { router.push('/dashboard/student'); return; }
		loadCourses();
	}, [userData]);

	async function loadCourses() {
		setLoading(true);
		try {
			const { courses: list } = await api.get('/api/courses');
			setCourses(list.map(c => ({ ...c, id: c._id })));
		} catch (err) {
			console.error('Error loading courses:', err);
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

	async function handleGenerateContent() {
		if (!courseId) { alert('Please select a course first'); return; }
		setGenerating(true);
		try {
			const selectedCourse = courses.find(c => c.id === courseId);
			const data = await api.post('/api/ai', {
				action: 'generate_assignment',
				context: { topic: selectedCourse?.title, courseDescription: selectedCourse?.description }
			});
			if (data.response) {
				try {
					const parsed = JSON.parse(data.response.match(/\{[\s\S]*\}/)?.[0] || '{}');
					if (parsed.title) setTitle(parsed.title);
					if (parsed.description) setDescription(parsed.description);
				} catch {
					setDescription(data.response);
				}
			}
		} catch (err) {
			alert('Failed to generate content: ' + (err.message || 'Unknown error'));
		} finally {
			setGenerating(false);
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (!title.trim()) { alert('Assignment title is required'); return; }
		if (!courseId) { alert('Please select a course'); return; }
		setSubmitting(true);
		try {
			await api.post('/api/assignments', {
				title: title.trim(),
				description: description.trim() || '',
				courseId,
				courseTitle,
				deadline: deadline ? new Date(deadline).toISOString() : null,
				status,
				allowLateSubmissions,
			});
			router.push('/assignments');
		} catch (err) {
			alert('Failed to create assignment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">Create Assignment</h1>
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<Link href="/assignments"><Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments</Button></Link>
				<h1 className="text-h1 text-neutralDark mb-2">Create Assignment</h1>
				<p className="text-body text-muted-foreground">Create a new assignment for your course</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
							<CardDescription>Enter the assignment details</CardDescription>
						</CardHeader>
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
								<div className="flex items-center justify-between mb-2">
									<label className="block text-sm font-medium">Description</label>
									<Button type="button" variant="outline" size="sm" onClick={handleGenerateContent} disabled={generating || !courseId}>
										{generating ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate Content</>}
									</Button>
								</div>
								<RichTextEditor value={description} onChange={setDescription} placeholder="Enter assignment description and instructions..." />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Settings</CardTitle>
							<CardDescription>Configure assignment settings</CardDescription>
						</CardHeader>
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
							{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Save className="h-4 w-4 mr-2" /> Create Assignment</>}
						</Button>
						<Link href="/assignments"><Button variant="outline" type="button">Cancel</Button></Link>
					</div>
				</div>
			</form>
		</div>
	);
}
