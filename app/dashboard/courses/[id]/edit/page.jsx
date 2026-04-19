'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CourseModuleManager from '@/app/components/CourseModuleManager';

export default function EditCoursePage() {
	const params = useParams();
	const router = useRouter();
	const courseId = params.id;
	const { userData, loading: authLoading } = useAuth();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [status, setStatus] = useState('draft');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		if (userData.role !== 'teacher' && userData.role !== 'admin') {
			router.push('/dashboard');
			return;
		}
		loadCourse();
	}, [authLoading, userData]);

	async function loadCourse() {
		try {
			const data = await api.get(`/api/courses/${courseId}`);
			const course = data.course;

			// Permission check for teachers
			if (userData.role === 'teacher') {
				const ownerId = course.createdBy?._id?.toString() || course.createdBy?.toString();
				if (ownerId !== userData._id?.toString()) {
					setError('Unauthorized: You can only edit your own courses');
					setLoading(false);
					return;
				}
			}

			setTitle(course.title || '');
			setDescription(course.description || '');
			setStatus(course.status || 'draft');
		} catch (err) {
			setError(err.message || 'Failed to load course');
		} finally {
			setLoading(false);
		}
	}

	async function onSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			await api.put(`/api/courses/${courseId}`, {
				title: title.trim(),
				description: description.trim(),
				status,
			});
			setSuccess('Course updated successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			setError(err.message || 'Failed to update course');
		} finally {
			setSubmitting(false);
		}
	}

	if (authLoading || loading) {
		return <div className="max-w-4xl mx-auto p-4 text-muted-foreground">Loading...</div>;
	}

	if (error && !title) {
		return (
			<div className="max-w-4xl mx-auto p-4">
				<div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">{error}</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Edit Course</h1>
				<p className="text-body text-muted-foreground">Update course details and manage modules & lessons</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<form onSubmit={onSubmit} className="space-y-6">
						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">Title <span className="text-error">*</span></span>
							<Input
								required
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter course title"
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">Description</span>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={4}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
								placeholder="Enter course description"
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">Status</span>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
							>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
							</select>
						</label>

						{error && <p className="text-body text-error">{error}</p>}
						{success && <p className="text-body text-success">{success}</p>}

						<div className="pt-4 border-t border-border">
							<Button type="submit" disabled={submitting} className="w-full" size="lg">
								{submitting ? 'Saving…' : 'Save Changes'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Modules & Lessons Manager */}
			<Card>
				<CardContent className="pt-6">
					<CourseModuleManager courseId={courseId} />
				</CardContent>
			</Card>
		</div>
	);
}
