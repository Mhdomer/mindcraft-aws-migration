'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function SubmitAssignmentPage() {
	const params = useParams();
	const router = useRouter();
	const { language } = useLanguage();
	const { userData } = useAuth();
	const assignmentId = params.id;

	const [assignment, setAssignment] = useState(null);
	const [existingSubmission, setExistingSubmission] = useState(null);
	const [content, setContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const userRole = userData?.role;

	useEffect(() => {
		if (!userData) return;
		if (userRole !== 'student') { router.push('/assignments'); return; }
		loadData();
	}, [userData]);

	async function loadData() {
		setLoading(true);
		try {
			const [{ assignment: a }, { submissions }] = await Promise.all([
				api.get(`/api/assignments/${assignmentId}`),
				api.get(`/api/submissions?assignmentId=${assignmentId}`),
			]);

			if (a.status !== 'published') {
				setError(language === 'bm' ? 'Tugasan ini tidak tersedia' : 'This assignment is not available');
				setLoading(false);
				return;
			}

			const deadlinePassed = a.deadline && new Date(a.deadline) < new Date();
			if (deadlinePassed && !a.allowLateSubmissions) {
				setError(language === 'bm'
					? 'Tarikh akhir telah tamat dan penyerahan lewat tidak dibenarkan'
					: 'Deadline has passed and late submissions are not allowed');
				setLoading(false);
				return;
			}

			setAssignment({ ...a, id: a._id });

			if (submissions.length > 0) {
				setExistingSubmission(submissions[0]);
				setContent(submissions[0].content || '');
			}
		} catch (err) {
			setError(err.message || 'Failed to load assignment');
		} finally {
			setLoading(false);
		}
	}

	async function handleSubmit() {
		if (!content.trim()) {
			alert(language === 'bm' ? 'Sila masukkan kandungan penyerahan' : 'Please enter submission content');
			return;
		}
		setSubmitting(true);
		setError('');
		try {
			await api.post('/api/submissions', { assignmentId, content });
			setSuccess(language === 'bm' ? 'Tugasan dihantar dengan jayanya!' : 'Assignment submitted successfully!');
			setTimeout(() => router.push('/assignments'), 2000);
		} catch (err) {
			setError(err.message || 'Failed to submit assignment');
		} finally {
			setSubmitting(false);
		}
	}

	function formatDate(ts) {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}</h1>
				<p className="text-body text-muted-foreground">{language === 'bm' ? 'Memuatkan...' : 'Loading...'}</p>
			</div>
		);
	}

	if (error && !assignment) {
		return (
			<div className="space-y-8">
				<Link href="/assignments"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />{language === 'bm' ? 'Kembali' : 'Back'}</Button></Link>
				<Card className="border-destructive/50">
					<CardContent className="pt-6 text-center">
						<AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const deadlinePassed = assignment?.deadline ? new Date(assignment.deadline) < new Date() : false;

	return (
		<div className="space-y-6">
			<div>
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />{language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}</h1>
				<p className="text-body text-muted-foreground">{assignment?.title}</p>
			</div>

			{assignment?.deadline && (
				<div className={`flex items-center gap-3 p-4 rounded-lg border ${deadlinePassed ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border'}`}>
					<Calendar className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-primary'}`} />
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wider">Deadline</p>
						<p className={`text-sm font-semibold ${deadlinePassed ? 'text-destructive' : ''}`}>{formatDate(assignment.deadline)}</p>
					</div>
					{deadlinePassed && assignment.allowLateSubmissions && (
						<span className="ml-auto text-xs text-warning font-medium">{language === 'bm' ? 'Penyerahan lewat dibenarkan' : 'Late submission allowed'}</span>
					)}
				</div>
			)}

			{existingSubmission && (
				<div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
					<CheckCircle className="h-5 w-5 text-success" />
					<p className="text-sm text-success font-medium">
						{language === 'bm' ? 'Anda telah menghantar tugasan ini. Anda boleh mengemas kini kandungan di bawah.' : 'You have already submitted. You can update your submission below.'}
					</p>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{language === 'bm' ? 'Kandungan Penyerahan' : 'Submission Content'}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						{language === 'bm' ? 'Taip jawapan anda, pautan GitHub, atau mana-mana kandungan berkaitan di bawah.' : 'Type your answer, GitHub link, or any relevant content below.'}
					</p>
					<RichTextEditor value={content} onChange={setContent} placeholder={language === 'bm' ? 'Masukkan jawapan anda di sini...' : 'Enter your answer here...'} />
				</CardContent>
			</Card>

			{error && (
				<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
					<AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			{success && (
				<div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
					<CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
					<p className="text-sm text-success">{success}</p>
				</div>
			)}

			<div className="flex gap-4">
				<Button onClick={handleSubmit} disabled={submitting} size="lg">
					{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{language === 'bm' ? 'Menghantar...' : 'Submitting...'}</> : language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}
				</Button>
				<Link href="/assignments">
					<Button variant="outline" size="lg">{language === 'bm' ? 'Batal' : 'Cancel'}</Button>
				</Link>
			</div>
		</div>
	);
}
