'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, CheckCircle, Clock, AlertCircle, Edit, Search, Filter } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Input } from '@/components/ui/input';

export default function AssignmentSubmissionsPage() {
	const params = useParams();
	const router = useRouter();
	const { language } = useLanguage();
	const { userData } = useAuth();
	const assignmentId = params.id;

	const [assignment, setAssignment] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [filteredSubmissions, setFilteredSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

	const userRole = userData?.role;

	useEffect(() => {
		if (!userData) return;
		if (userRole === 'teacher' || userRole === 'admin') {
			loadData();
		} else {
			router.push('/dashboard/student');
		}
	}, [userData]);

	async function loadData() {
		setLoading(true);
		try {
			const [{ assignment: a }, { submissions: subs }] = await Promise.all([
				api.get(`/api/assignments/${assignmentId}`),
				api.get(`/api/submissions?assignmentId=${assignmentId}`),
			]);
			setAssignment({ ...a, id: a._id });
			setSubmissions(subs);
			setFilteredSubmissions(subs);
		} catch (err) {
			console.error('Error loading data:', err);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		let filtered = [...submissions];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter(s =>
				(s.studentName || '').toLowerCase().includes(q) ||
				(s.studentEmail || '').toLowerCase().includes(q)
			);
		}
		if (statusFilter !== 'all') {
			filtered = filtered.filter(s => {
				const isGraded = s.grade !== undefined || s.feedback;
				const isReleased = s.feedbackReleased;
				if (statusFilter === 'pending') return !isGraded;
				if (statusFilter === 'graded') return isGraded && !isReleased;
				if (statusFilter === 'released') return isReleased;
				return true;
			});
		}
		setFilteredSubmissions(filtered);
	}, [submissions, searchQuery, statusFilter]);

	function formatDate(ts) {
		if (!ts) return language === 'bm' ? 'Tiada' : 'N/A';
		return new Date(ts).toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<h1 className="text-h1 text-neutralDark mb-2">{language === 'bm' ? 'Penyerahan' : 'Submissions'}</h1>
				<p className="text-body text-muted-foreground">{language === 'bm' ? 'Memuatkan...' : 'Loading...'}</p>
			</div>
		);
	}

	if (!assignment) {
		return (
			<div className="space-y-8">
				<Link href="/assignments"><Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />{language === 'bm' ? 'Kembali' : 'Back'}</Button></Link>
				<Card><CardContent className="py-12 text-center"><p className="text-body text-muted-foreground">{language === 'bm' ? 'Tugasan tidak dijumpai' : 'Assignment not found'}</p></CardContent></Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />{language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">{assignment.title}</h1>
				<p className="text-body text-muted-foreground">{language === 'bm' ? 'Lihat dan gred semua penyerahan' : 'View and grade all submissions'}</p>
			</div>

			{submissions.length > 0 && (
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col md:flex-row gap-4">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input type="text" placeholder={language === 'bm' ? 'Cari pelajar...' : 'Search students...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
							</div>
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-muted-foreground" />
								<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
									<option value="all">{language === 'bm' ? 'Semua Status' : 'All Status'}</option>
									<option value="pending">{language === 'bm' ? 'Menunggu Gred' : 'Pending Grade'}</option>
									<option value="graded">{language === 'bm' ? 'Sudah Digred' : 'Graded'}</option>
									<option value="released">{language === 'bm' ? 'Telah Dilepaskan' : 'Released'}</option>
								</select>
							</div>
						</div>
						{filteredSubmissions.length !== submissions.length && (
							<p className="text-sm text-muted-foreground mt-2">
								{language === 'bm' ? `Menunjukkan ${filteredSubmissions.length} daripada ${submissions.length} penyerahan` : `Showing ${filteredSubmissions.length} of ${submissions.length} submissions`}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{filteredSubmissions.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground">{language === 'bm' ? 'Tiada penyerahan lagi untuk tugasan ini.' : 'No submissions yet for this assignment.'}</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{filteredSubmissions.map((submission) => {
						const subId = submission._id || submission.id;
						const isGraded = submission.grade !== undefined || submission.feedback;
						const isReleased = submission.feedbackReleased;
						return (
							<Card key={subId} className="card-hover">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-h4 mb-2">{submission.studentName || submission.studentEmail || 'Unknown Student'}</CardTitle>
											<div className="flex flex-wrap gap-2">
												{submission.submittedAt && (
													<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
														<Calendar className="h-4 w-4" />
														{language === 'bm' ? 'Dihantar:' : 'Submitted:'} {formatDate(submission.submittedAt)}
													</div>
												)}
												{isReleased ? (
													<span className="text-xs bg-success/10 text-success px-2.5 py-1.5 rounded-md font-medium border border-success/20 flex items-center gap-1.5">
														<CheckCircle className="h-3.5 w-3.5" /> {language === 'bm' ? 'Telah dilepaskan' : 'Released'}
													</span>
												) : isGraded ? (
													<span className="text-xs bg-warning/10 text-warning px-2.5 py-1.5 rounded-md font-medium border border-warning/20 flex items-center gap-1.5">
														<Clock className="h-3.5 w-3.5" /> {language === 'bm' ? 'Belum dilepaskan' : 'Not Released'}
													</span>
												) : (
													<span className="text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-md font-medium border border-info/20 flex items-center gap-1.5">
														<AlertCircle className="h-3.5 w-3.5" /> {language === 'bm' ? 'Menunggu gred' : 'Pending Grade'}
													</span>
												)}
											</div>
										</div>
										<Link href={`/submissions/${subId}/grade`}>
											<Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />{language === 'bm' ? 'Gred' : 'Grade'}</Button>
										</Link>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{submission.grade !== undefined && (
											<p className="text-sm font-medium">{language === 'bm' ? 'Gred:' : 'Grade:'} <span className="text-primary font-bold">{submission.grade}%</span></p>
										)}
										{submission.feedback && isReleased && (
											<div>
												<p className="text-sm font-medium mb-1">{language === 'bm' ? 'Maklum Balas:' : 'Feedback:'}</p>
												<div className="text-sm text-muted-foreground p-3 bg-neutralLight rounded-lg" dangerouslySetInnerHTML={{ __html: submission.feedback }} />
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
