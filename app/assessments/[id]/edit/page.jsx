'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Sparkles, Plus, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function EditAssessmentPage() {
	const params = useParams();
	const router = useRouter();
	const { userData, loading: authLoading } = useAuth();
	const assessmentId = params.id;

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [courseTitle, setCourseTitle] = useState('');
	const [type, setType] = useState('quiz');
	const [questions, setQuestions] = useState([]);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState('');
	const [generating, setGenerating] = useState(false);
	const [status, setStatus] = useState('draft');
	const [config, setConfig] = useState({
		startDate: '',
		endDate: '',
		timer: '',
		attempts: 1,
		passingPercentage: 40,
		allowLateSubmission: false,
	});

	const userRole = userData?.role;

	useEffect(() => {
		if (authLoading) return;
		if (!userData) return;
		if (userRole !== 'teacher' && userRole !== 'admin') { router.push('/dashboard/student'); return; }
		loadData();
	}, [userData, authLoading]);

	function formatDateForInput(date) {
		const d = date instanceof Date ? date : new Date(date);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const mins = String(d.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${mins}`;
	}

	async function loadData() {
		setLoading(true);
		try {
			const [{ courses: courseList }, { assessment: a }] = await Promise.all([
				api.get('/api/courses'),
				api.get(`/api/assessments/${assessmentId}`),
			]);

			setCourses(courseList.map(c => ({ ...c, id: c._id })));

			setTitle(a.title || '');
			setDescription(a.description || '');
			setCourseId(a.courseId?.toString() || '');
			setCourseTitle(a.courseTitle || '');
			setType(a.type || 'quiz');
			setStatus(a.status || 'draft');

			if (a.questions && Array.isArray(a.questions)) {
				setQuestions(a.questions.map((q, idx) => ({
					id: `q_${idx}_${Date.now()}`,
					type: q.type || 'mcq',
					expectedType: q.expectedType || 'string',
					question: q.question || q.prompt || '',
					options: q.options || ['', '', '', ''],
					correctAnswer: (q.correctAnswer ?? q.answer) !== undefined ? (q.correctAnswer ?? q.answer) : 0,
					points: q.points || 1,
				})));
			}

			setConfig({
				startDate: a.startDate ? formatDateForInput(a.startDate) : '',
				endDate: a.endDate ? formatDateForInput(a.endDate) : '',
				timer: a.timer || '',
				attempts: a.attempts || 1,
				passingPercentage: a.passingPercentage ?? 40,
				allowLateSubmission: a.allowLateSubmission || false,
			});
		} catch (err) {
			setError(err.message || 'Failed to load assessment');
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

	function addQuestion() {
		setQuestions([...questions, {
			id: Date.now().toString(),
			type: 'mcq',
			expectedType: 'string',
			question: '',
			options: ['', '', '', ''],
			correctAnswer: 0,
			points: 1,
		}]);
	}

	function updateQuestion(questionId, field, value) {
		setQuestions(questions.map(q => q.id === questionId ? { ...q, [field]: value } : q));
	}

	function updateQuestionOption(questionId, optionIndex, value) {
		setQuestions(questions.map(q => {
			if (q.id !== questionId) return q;
			const newOptions = [...q.options];
			newOptions[optionIndex] = value;
			return { ...q, options: newOptions };
		}));
	}

	function removeQuestion(questionId) {
		setQuestions(questions.filter(q => q.id !== questionId));
	}

	function addOption(questionId) {
		setQuestions(questions.map(q => q.id === questionId ? { ...q, options: [...q.options, ''] } : q));
	}

	function removeOption(questionId, optionIndex) {
		setQuestions(questions.map(q => {
			if (q.id !== questionId || q.options.length <= 2) return q;
			const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
			return { ...q, options: newOptions, correctAnswer: q.correctAnswer >= newOptions.length ? 0 : q.correctAnswer };
		}));
	}

	async function handleGenerateContent() {
		if (!courseId) { alert('Please select a course first'); return; }
		setGenerating(true);
		try {
			const selectedCourse = courses.find(c => c.id === courseId);
			const data = await api.post('/api/ai', {
				action: 'generate_assessment',
				options: { courseTitle: selectedCourse?.title, courseDescription: selectedCourse?.description, type, numQuestions: 5 },
			});
			if (data.title) setTitle(data.title);
			if (data.description) setDescription(data.description);
			if (data.questions && Array.isArray(data.questions)) {
				setQuestions(data.questions.map((q, idx) => ({
					id: `generated_${Date.now()}_${idx}`,
					type: q.type || 'mcq',
					expectedType: q.expectedType || 'string',
					question: q.question || q.prompt || '',
					options: q.options || ['', '', '', ''],
					correctAnswer: q.correctAnswer ?? q.answer ?? 0,
					points: q.points || 1,
				})));
			}
		} catch (err) {
			alert('Failed to generate content: ' + (err.message || 'Unknown error'));
		} finally {
			setGenerating(false);
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (!title.trim()) { alert('Assessment title is required'); return; }
		if (!courseId) { alert('Please select a course'); return; }
		if (questions.length === 0) { alert('Please add at least one question'); return; }

		for (const q of questions) {
			if (!q.question.trim()) { alert('All questions must have a question text'); return; }
			if (q.type === 'mcq') {
				if (q.options.length < 2) { alert('MCQ questions must have at least 2 options'); return; }
				if (q.options.some(opt => !opt.trim())) { alert('All MCQ options must be filled'); return; }
			}
			if (q.type === 'text' && q.expectedType === 'number') {
				if (isNaN(parseFloat(q.correctAnswer))) { alert('Numeric questions must have a valid number as the correct answer'); return; }
			}
		}

		setSubmitting(true);
		try {
			await api.put(`/api/assessments/${assessmentId}`, {
				title: title.trim(),
				description: description.trim() || '',
				courseId,
				courseTitle,
				type,
				status,
				questions: questions.map(q => {
					const out = {
						type: q.type,
						question: q.question.trim(),
						correctAnswer: q.type === 'mcq' ? q.correctAnswer : (q.correctAnswer || ''),
						points: q.points || 1,
					};
					if (q.type === 'text') out.expectedType = q.expectedType || 'string';
					if (q.type === 'mcq') out.options = q.options.map(opt => opt.trim());
					return out;
				}),
				timer: config.timer ? parseInt(config.timer) : null,
				startDate: config.startDate ? new Date(config.startDate).toISOString() : null,
				endDate: config.endDate ? new Date(config.endDate).toISOString() : null,
				attempts: config.attempts ? parseInt(config.attempts) : 1,
				passingPercentage: config.passingPercentage ? parseInt(config.passingPercentage) : 40,
				allowLateSubmission: config.allowLateSubmission || false,
			});
			router.push('/assessments');
		} catch (err) {
			alert('Failed to update assessment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) return;
		setDeleting(true);
		try {
			await api.delete(`/api/assessments/${assessmentId}`);
			router.push('/assessments');
		} catch (err) {
			alert('Failed to delete assessment: ' + (err.message || 'Unknown error'));
			setDeleting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">Edit Assessment</h1>
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<Link href="/assessments"><Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assessments</Button></Link>
				<Card><CardContent className="py-12 text-center"><p className="text-body text-destructive">{error}</p></CardContent></Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<Link href="/assessments"><Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assessments</Button></Link>
				<h1 className="text-h1 text-neutralDark mb-2">Edit Assessment</h1>
				<p className="text-body text-muted-foreground">Update assessment details and questions</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					{/* Basic Info */}
					<Card>
						<CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Update the assessment details</CardDescription></CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">Assessment Title <span className="text-destructive">*</span></label>
								<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Python Fundamentals Quiz" required />
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Course <span className="text-destructive">*</span></label>
								<select value={courseId} onChange={handleCourseChange} className="w-full px-3 py-2 border border-border rounded-md bg-white" required>
									<option value="">Select a course</option>
									{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Assessment Type</label>
								<select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-white">
									<option value="quiz">Quiz</option>
									<option value="exam">Exam</option>
									<option value="assignment">Assignment</option>
									<option value="coding">Coding Challenge</option>
								</select>
							</div>
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="block text-sm font-medium">Description</label>
									<Button type="button" variant="outline" size="sm" onClick={handleGenerateContent} disabled={generating || !courseId}>
										{generating ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate Content</>}
									</Button>
								</div>
								<RichTextEditor value={description} onChange={setDescription} placeholder="Enter assessment description and instructions..." />
							</div>
						</CardContent>
					</Card>

					{/* Questions */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div><CardTitle>Questions</CardTitle><CardDescription>Update questions for your assessment</CardDescription></div>
								<Button type="button" variant="outline" size="sm" onClick={addQuestion}><Plus className="h-4 w-4 mr-1" /> Add Question</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{questions.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">No questions yet. Click "Add Question" to get started.</div>
							) : (
								questions.map((question, index) => (
									<div key={question.id} className="border border-border rounded-lg p-4 space-y-4">
										<div className="flex items-start justify-between">
											<h4 className="font-medium text-lg">Question {index + 1}</h4>
											<Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(question.id)} className="text-destructive hover:text-destructive">
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>

										<div>
											<label className="block text-sm font-medium mb-2">Question Type</label>
											<select value={question.type} onChange={(e) => updateQuestion(question.id, 'type', e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-white">
												<option value="mcq">Multiple Choice (MCQ)</option>
												<option value="text">Text-based Answer</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-2">Question Text <span className="text-destructive">*</span></label>
											<Input value={question.question} onChange={(e) => updateQuestion(question.id, 'question', e.target.value)} placeholder="Enter your question here..." required />
										</div>

										{question.type === 'mcq' ? (
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<label className="block text-sm font-medium">Answer Options</label>
													<Button type="button" variant="ghost" size="sm" onClick={() => addOption(question.id)}><Plus className="h-4 w-4 mr-1" /> Add Option</Button>
												</div>
												{question.options.map((option, optIndex) => (
													<div key={optIndex} className="flex items-center gap-2">
														<input type="radio" name={`correct_${question.id}`} checked={question.correctAnswer === optIndex} onChange={() => updateQuestion(question.id, 'correctAnswer', optIndex)} className="w-5 h-5" />
														<Input value={option} onChange={(e) => updateQuestionOption(question.id, optIndex, e.target.value)} placeholder={`Option ${optIndex + 1}`} className="flex-1" />
														{question.options.length > 2 && (
															<Button type="button" variant="ghost" size="sm" onClick={() => removeOption(question.id, optIndex)}><X className="h-4 w-4" /></Button>
														)}
													</div>
												))}
												<p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
											</div>
										) : (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium mb-2">Expected Answer Type</label>
													<select value={question.expectedType || 'string'} onChange={(e) => updateQuestion(question.id, 'expectedType', e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-white">
														<option value="string">String (Text)</option>
														<option value="number">Number</option>
													</select>
												</div>
												<div>
													<label className="block text-sm font-medium mb-2">Correct Answer</label>
													<Input type={question.expectedType === 'number' ? 'number' : 'text'} value={question.correctAnswer || ''} onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)} placeholder="Enter the expected answer..." />
												</div>
											</div>
										)}

										<div>
											<label className="block text-sm font-medium mb-2">Points</label>
											<div className="flex gap-2">
												{[1, 2, 3, 4, 5].map(pts => (
													<button key={pts} type="button" onClick={() => updateQuestion(question.id, 'points', pts)} className={`px-4 py-2 rounded-md font-medium transition-all ${(question.points || 1) === pts ? 'bg-primary text-white shadow-sm' : 'bg-neutralLight text-neutralDark hover:bg-primary/10 border border-border'}`}>{pts}</button>
												))}
											</div>
										</div>
									</div>
								))
							)}
						</CardContent>
					</Card>

					{/* Settings */}
					<Card>
						<CardHeader><CardTitle>Settings</CardTitle><CardDescription>Configure assessment settings</CardDescription></CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">Status</label>
								<select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-white">
									<option value="draft">Draft</option>
									<option value="published">Published</option>
								</select>
							</div>

							<div className="flex flex-col space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">Start Date</label>
									<Input type="datetime-local" value={config.startDate} onChange={(e) => setConfig({ ...config, startDate: e.target.value })} />
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">End Date</label>
									<Input type="datetime-local" value={config.endDate} onChange={(e) => setConfig({ ...config, endDate: e.target.value })} />
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">Timer (minutes)</label>
									<Input type="number" value={config.timer} onChange={(e) => setConfig({ ...config, timer: e.target.value })} placeholder="e.g., 60" />
									<div className="flex flex-wrap gap-2 mt-2">
										{[15, 30, 45, 60, 90, 120].map(time => (
											<Button key={time} type="button" variant="outline" size="sm" onClick={() => setConfig({ ...config, timer: time })} className={parseInt(config.timer) === time ? 'bg-primary text-white hover:bg-primary/90' : ''}>
												{time}m
											</Button>
										))}
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">Max Attempts</label>
									<Input type="number" value={config.attempts} onChange={(e) => setConfig({ ...config, attempts: parseInt(e.target.value) || 1 })} min="1" />
								</div>
								<div>
									<label className="block text-sm font-medium mb-2">Passing Percentage (%)</label>
									<Input type="number" value={config.passingPercentage} onChange={(e) => setConfig({ ...config, passingPercentage: parseInt(e.target.value) || 0 })} min="0" max="100" />
								</div>
							</div>

							<div className="flex items-center justify-between p-4 border border-border rounded-lg bg-neutral-50/50">
								<div>
									<p className="text-sm font-medium text-neutralDark">Allow Late Submissions</p>
									<p className="text-xs text-muted-foreground">Students can submit after the deadline (marked as late)</p>
								</div>
								<Switch checked={config.allowLateSubmission || false} onCheckedChange={(checked) => setConfig({ ...config, allowLateSubmission: checked })} />
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
						<Link href="/assessments"><Button variant="outline" type="button">Cancel</Button></Link>
					</div>
				</div>
			</form>
		</div>
	);
}
