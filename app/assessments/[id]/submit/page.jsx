'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function SubmitAssessmentPage() {
	const params = useParams();
	const router = useRouter();
	const { userData, loading: authLoading } = useAuth();
	const { language } = useLanguage();
	const assessmentId = params.id;

	const [assessment, setAssessment] = useState(null);
	const [existingSubmission, setExistingSubmission] = useState(null);
	const [content, setContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		if (authLoading) return;
		if (userData) loadData();
	}, [userData, authLoading]);

	async function loadData() {
		setLoading(true);
		try {
			const [{ assessment: a }, { submissions }] = await Promise.all([
				api.get(`/api/assessments/${assessmentId}`),
				api.get(`/api/submissions?assessmentId=${assessmentId}`),
			]);

			if (a.status !== 'published') {
				setError('This assessment is not available');
				setLoading(false);
				return;
			}

			if (a.type !== 'assignment') {
				setError('This page is only for assignment-type assessments');
				setLoading(false);
				return;
			}

			if (a.endDate && new Date(a.endDate) < new Date() && !a.allowLateSubmission) {
				setError('This assignment is closed');
				setLoading(false);
				return;
			}

			setAssessment({ ...a, id: a._id });

			if (submissions.length > 0) {
				setExistingSubmission(submissions[0]);
				setContent(submissions[0].content || '');
			}
		} catch (err) {
			setError(err.message || 'Failed to load assessment');
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
			const isLate = assessment?.endDate && new Date(assessment.endDate) < new Date();
			await api.post('/api/submissions', { assessmentId, content, isLate });
			setSuccess(language === 'bm' ? 'Tugasan dihantar dengan jayanya!' : 'Assignment submitted successfully!');
			setTimeout(() => router.push('/assessments'), 2000);
		} catch (err) {
			setError(err.message || 'Failed to submit assignment');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">Submit Assignment</h1>
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (error && !assessment) {
		return (
			<div className="space-y-8">
				<Link href="/assessments"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></Link>
				<Card className="border-destructive/50">
					<CardContent className="pt-6 text-center">
						<AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<Link href="/assessments">
					<Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assessments</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">Submit Assignment</h1>
				<p className="text-body text-muted-foreground">{assessment?.title}</p>
			</div>

			{existingSubmission && (
				<div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
					<CheckCircle className="h-5 w-5 text-success" />
					<p className="text-sm text-success font-medium">
						{language === 'bm'
							? 'Anda telah menghantar tugasan ini. Anda boleh mengemas kini kandungan di bawah.'
							: 'You have already submitted. You can update your submission below.'}
					</p>
				</div>
			)}

			{assessment?.description && (
				<Card>
					<CardHeader><CardTitle>Assignment Details</CardTitle></CardHeader>
					<CardContent>
						<div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: assessment.description }} />
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{language === 'bm' ? 'Kandungan Penyerahan' : 'Submission Content'}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						{language === 'bm'
							? 'Taip jawapan anda, pautan GitHub, atau mana-mana kandungan berkaitan di bawah.'
							: 'Type your answer, GitHub link, or any relevant content below.'}
					</p>
					<RichTextEditor
						value={content}
						onChange={setContent}
						placeholder={language === 'bm' ? 'Masukkan jawapan anda di sini...' : 'Enter your answer here...'}
					/>
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
					{submitting
						? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{language === 'bm' ? 'Menghantar...' : 'Submitting...'}</>
						: (language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment')}
				</Button>
				<Link href="/assessments">
					<Button variant="outline" size="lg">{language === 'bm' ? 'Batal' : 'Cancel'}</Button>
				</Link>
			</div>
		</div>
	);
}
