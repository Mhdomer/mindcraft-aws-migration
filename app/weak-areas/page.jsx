/**
 * US010-04: Identify Weak Learning Areas
 * 
 * This page allows students to view topics they struggle with based on their performance.
 * Weak areas are identified by analyzing assessment and assignment scores grouped by topic/module.
 * 
 * Features:
 * - Displays topics where student scored below 70%
 * - Shows average score per topic
 * - Provides recommendations for improvement
 * - Links to relevant course content for review
 * 
 * Acceptance Criteria:
 * - Student can view weak learning areas
 * - Topics are identified based on performance thresholds
 * - Data is updated in real-time from submissions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, ArrowRight, Brain, Lightbulb, History, BookOpen, Target, ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { AreaChart } from '@tremor/react';

export default function WeakAreasPage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [weakAreas, setWeakAreas] = useState([]);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				setError('You must be signed in to view weak learning areas.');
				setLoading(false);
				return;
			}

			await loadWeakAreasForStudent(user.uid);
		});

		return () => unsubscribe();
	}, []);

	async function loadWeakAreasForStudent(studentId) {
		setLoading(true);
		setError('');

		try {
			// 1. Fetch all submissions for this student
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', studentId)
			);
			const submissionsSnapshot = await getDocs(submissionsQuery);
			const submissions = submissionsSnapshot.docs.map(docSnap => ({
				id: docSnap.id,
				...docSnap.data(),
			}));

			if (submissions.length === 0) {
				setWeakAreas([]);
				return;
			}

			// 2. Group scores by topic (assessment or assignment title)
			const topicScores = new Map();

			for (const submission of submissions) {
				let title = 'Unknown Topic';
				let courseId = null;
				let percentScore = null;
				let date = submission.submittedAt?.toDate ? submission.submittedAt.toDate() : new Date();

				// Assessments
				if (submission.assessmentId) {
					try {
						const assessmentDoc = await getDoc(doc(db, 'assessment', submission.assessmentId));
						if (assessmentDoc.exists()) {
							const data = assessmentDoc.data();
							title = data.title;
							courseId = data.courseId;
							if (typeof submission.score === 'number' && typeof submission.totalPoints === 'number' && submission.totalPoints > 0) {
								percentScore = (submission.score / submission.totalPoints) * 100;
							} else if (typeof submission.grade === 'number') {
								percentScore = submission.grade;
							}
						}
					} catch (err) {
						console.warn('Error loading assessment:', err);
					}
				}
				// Assignments
				else if (submission.assignmentId) {
					try {
						const assignmentDoc = await getDoc(doc(db, 'assignment', submission.assignmentId));
						if (assignmentDoc.exists()) {
							const data = assignmentDoc.data();
							title = data.title;
							courseId = data.courseId;
							percentScore = typeof submission.grade === 'number' ? submission.grade : null;
						}
					} catch (err) {
						console.warn('Error loading assignment:', err);
					}
				}

				if (percentScore !== null && title !== 'Unknown Topic') {
					// Use a composite key of CourseID + Title to avoid collisions if titles are generic (e.g. "Final Exam")
					// But for simplicity and grouping similar topics across courses, we might just use title or a smart grouping.
					// Let's stick to unique ID if possible, but we don't have topic IDs. 
					// Using assessmentId/assignmentId prevents grouping *re-attempts* of the same assessment properly if they are different submissions (which they usually are).
					// If we want to group "Mathematics" we need course metadata.
					// For US011-04, let's group by the *Assessment/Assignment ID* itself to track specific improvement on THAT item, 
					// OR group by Title if we assume re-attempts.
					// Let's group by Title + CourseId to capture "Module 1 Quiz" distinct from "Module 2 Quiz".
					const key = `${courseId}_${title}`;

					const existing = topicScores.get(key) || {
						topic: title,
						courseId: courseId,
						history: [],
						lessonPath: courseId ? `/courses/${courseId}` : '/courses',
					};

					existing.history.push({
						date: date,
						score: percentScore,
						dateStr: date.toLocaleDateString()
					});

					topicScores.set(key, existing);
				}
			}

			// 3. Process weak areas
			const weakAreaList = Array.from(topicScores.values())
				.map((entry) => {
					// Sort history by date
					entry.history.sort((a, b) => a.date - b.date);

					// Compute average
					const sum = entry.history.reduce((acc, curr) => acc + curr.score, 0);
					const avgScore = sum / entry.history.length;

					// Generate mock recommendations if we don't have a sophisticated engine
					const recommendations = [
						{
							title: `Review ${entry.topic} Materials`,
							type: 'reading',
							link: entry.lessonPath
						},
						{
							title: 'Practice Quiz: Core Concepts',
							type: 'quiz',
							link: entry.lessonPath
						}
					];

					return {
						id: entry.courseId + entry.topic,
						topic: entry.topic,
						avgScore: avgScore,
						history: entry.history,
						lessonPath: entry.lessonPath,
						recommendations: recommendations
					};
				})
				.filter((area) => area.avgScore < 70) // Threshold for weakness
				.sort((a, b) => a.avgScore - b.avgScore);

			setWeakAreas(weakAreaList);
		} catch (err) {
			console.error('Error loading weak areas:', err);
			setError('Failed to analyze your performance. Please try again later.');
		} finally {
			setLoading(false);
		}
	}

	function getSeverity(score) {
		if (typeof score !== 'number') return { label: 'Unknown', colorClass: 'text-muted-foreground' };
		if (score < 50) return { label: 'Severe Weakness', colorClass: 'text-destructive' };
		if (score < 70) return { label: 'Needs Improvement', colorClass: 'text-warning' };
		return { label: 'Stable', colorClass: 'text-success' };
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Weak Learning Areas</h1>
					<p className="text-body text-muted-foreground">Analyzing your assessments and assignments...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Weak Learning Areas</h1>
					<p className="text-body text-muted-foreground">
						We ran into a problem while trying to analyze your performance.
					</p>
				</div>
				<Card className="border-destructive bg-destructive/5">
					<CardContent className="py-6 flex items-center gap-3">
						<AlertCircle className="h-5 w-5 text-destructive" />
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Weak Learning Areas</h1>
					<p className="text-body text-muted-foreground">
						Insights into topics where your scores are lowest, based on your recent assessments and assignments.
					</p>
				</div>
				<div className="flex flex-col gap-2 shrink-0">
					<Link href="/progress" className="print:hidden">
						<Button variant="outline" size="sm" className="w-full gap-2 justify-start">
							<ArrowLeft className="h-5 w-5" />
							Back to Dashboard
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						className="gap-2 print:hidden"
						onClick={() => window.print()}
					>
						<Printer className="h-5 w-5" />
						Export
					</Button>
				</div>
			</div>

			{weakAreas.length === 0 ? (
				<Card className="border-success/30 bg-success/5">
					<CardContent className="py-8 flex items-center gap-3">
						<Brain className="h-6 w-6 text-success" />
						<div>
							<p className="text-body font-semibold text-neutralDark">
								No weak areas detected right now.
							</p>
							<p className="text-caption text-muted-foreground mt-1">
								Keep completing assessments and assignments. If any topics become challenging, they will appear here
								with targeted suggestions.
							</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{weakAreas.map((area, index) => {
						const score = typeof area.avgScore === 'number' ? area.avgScore : null;
						const severity = getSeverity(score ?? NaN);


						return (
							<Card key={index} className="card-hover overflow-hidden border-l-4 border-l-error">
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3 flex-1">
											<div className="p-2 bg-error/10 rounded-lg">
												<TrendingDown className="h-5 w-5 text-error" />
											</div>
											<div className="flex-1">
												<CardTitle className="text-h3 mb-1">
													{area.topic || 'Unknown Topic'}
												</CardTitle>
												<CardDescription>
													Average Score: <span className="font-bold text-error">{score.toFixed(0)}%</span> • {severity.label}
												</CardDescription>
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="grid md:grid-cols-2 gap-8 mt-2">
										{/* History Chart */}
										<div className="space-y-2">
											<h4 className="text-sm font-semibold text-neutralDark flex items-center gap-2">
												<History className="h-4 w-4 text-neutral-500" />
												Performance History
											</h4>
											<div className="h-32 w-full">
												<AreaChart
													className="h-32"
													data={area.history}
													index="dateStr"
													categories={['score']}
													colors={['rose']}
													valueFormatter={(number) => `${number}%`}
													showLegend={false}
													showGridLines={false}
													showYAxis={false}
													startEndOnly={true}
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												Latest attempt: {area.history[area.history.length - 1]?.score}%
											</p>
										</div>

										{/* Recommendations */}
										<div className="space-y-3">
											<h4 className="text-sm font-semibold text-neutralDark flex items-center gap-2">
												<Lightbulb className="h-4 w-4 text-amber-500" />
												Recommended Practice
											</h4>
											<div className="space-y-2">
												{area.recommendations.map((rec, idx) => (
													<Link href={rec.link} key={idx} className="block group">
														<div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100 group-hover:bg-neutral-100 transition-colors">
															<div className="flex items-center gap-3">
																<div className="p-1.5 bg-white rounded-md shadow-sm">
																	{rec.type === 'quiz' ? (
																		<Target className="h-4 w-4 text-blue-500" />
																	) : (
																		<BookOpen className="h-4 w-4 text-emerald-500" />
																	)}
																</div>
																<span className="text-sm font-medium text-neutralDark group-hover:text-primary transition-colors">
																	{rec.title}
																</span>
															</div>
															<ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-primary transition-colors" />
														</div>
													</Link>
												))}
											</div>
										</div>
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


