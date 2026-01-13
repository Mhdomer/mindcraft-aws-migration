'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
	CheckCircle2, 
	XCircle, 
	Edit2, 
	Trash2, 
	Plus, 
	Sparkles, 
	Loader2,
	ChevronDown,
	ChevronUp,
	GripVertical
} from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function LessonExercise({ lessonId, userRole, userId }) {
	const { language } = useLanguage();
	const [exercises, setExercises] = useState([]);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState(true);
	const [editingId, setEditingId] = useState(null);
	const [newExercise, setNewExercise] = useState(null);
	const [answers, setAnswers] = useState({});
	const [feedback, setFeedback] = useState({});
	const [submitted, setSubmitted] = useState({});
	const [generating, setGenerating] = useState(false);

	const isTeacher = userRole === 'teacher' || userRole === 'admin';

	const translations = {
		en: {
			title: 'Practice Exercises',
			subtitle: 'Test your understanding with these exercises',
			noExercises: 'No exercises available for this lesson yet.',
			tryExercise: 'Try Exercise',
			submitAnswer: 'Submit Answer',
			retry: 'Retry',
			correct: 'Correct!',
			incorrect: 'Incorrect',
			correctAnswer: 'Correct Answer',
			explanation: 'Explanation',
			addExercise: 'Add Exercise',
			editExercise: 'Edit Exercise',
			deleteExercise: 'Delete Exercise',
			generateWithAI: 'Generate with AI',
			question: 'Question',
			type: 'Type',
			mcq: 'Multiple Choice',
			shortAnswer: 'Short Answer',
			coding: 'Coding',
			options: 'Options',
			addOption: 'Add Option',
			correctAnswerLabel: 'Correct Answer',
			points: 'Points',
			explanationLabel: 'Explanation (shown after submission)',
			save: 'Save',
			cancel: 'Cancel',
			delete: 'Delete',
			selectAnswer: 'Select an answer',
			enterAnswer: 'Enter your answer',
			enterCode: 'Enter your code',
		},
		bm: {
			title: 'Latihan Amalan',
			subtitle: 'Uji pemahaman anda dengan latihan ini',
			noExercises: 'Tiada latihan tersedia untuk pelajaran ini.',
			tryExercise: 'Cuba Latihan',
			submitAnswer: 'Hantar Jawapan',
			retry: 'Cuba Semula',
			correct: 'Betul!',
			incorrect: 'Salah',
			correctAnswer: 'Jawapan Betul',
			explanation: 'Penjelasan',
			addExercise: 'Tambah Latihan',
			editExercise: 'Edit Latihan',
			deleteExercise: 'Padam Latihan',
			generateWithAI: 'Jana dengan AI',
			question: 'Soalan',
			type: 'Jenis',
			mcq: 'Pilihan Berganda',
			shortAnswer: 'Jawapan Pendek',
			coding: 'Pengaturcaraan',
			options: 'Pilihan',
			addOption: 'Tambah Pilihan',
			correctAnswerLabel: 'Jawapan Betul',
			points: 'Mata',
			explanationLabel: 'Penjelasan (ditunjukkan selepas penghantaran)',
			save: 'Simpan',
			cancel: 'Batal',
			delete: 'Padam',
			selectAnswer: 'Pilih jawapan',
			enterAnswer: 'Masukkan jawapan anda',
			enterCode: 'Masukkan kod anda',
		},
	};

	const t = translations[language] || translations.en;

	useEffect(() => {
		loadExercises();
	}, [lessonId]);

	async function loadExercises() {
		setLoading(true);
		try {
			const response = await fetch(`/api/lessons/${lessonId}/exercises`);
			const data = await response.json();
			if (data.exercises) {
				setExercises(data.exercises);
			}
		} catch (err) {
			console.error('Error loading exercises:', err);
		} finally {
			setLoading(false);
		}
	}

	async function handleGenerateAI() {
		setGenerating(true);
		try {
			// Get lesson content for context
			const lessonResponse = await fetch(`/api/lessons?moduleId=dummy`);
			// Actually, we need lesson content - let's use a simpler approach
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'generate_exercises',
					input: `Generate practice exercises for lesson ${lessonId}`,
					language: language,
					options: {
						numQuestions: 3,
						difficulty: 'beginner',
					},
				}),
			});

			const data = await response.json();
			if (data.exercises && data.exercises.length > 0) {
				// Create exercises from AI response
				for (const exercise of data.exercises) {
					await createExercise({
						question: exercise.question,
						type: exercise.type || 'short_answer',
						options: exercise.options,
						correctAnswer: exercise.answer || exercise.correctAnswer,
						points: 1,
						explanation: exercise.explanation || '',
					});
				}
				await loadExercises();
			}
		} catch (err) {
			console.error('Error generating exercises:', err);
			alert(language === 'bm' ? 'Ralat menjana latihan' : 'Error generating exercises');
		} finally {
			setGenerating(false);
		}
	}

	async function createExercise(exerciseData) {
		try {
			const response = await fetch(`/api/lessons/${lessonId}/exercises`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...exerciseData,
					order: exercises.length,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create exercise');
			}

			return await response.json();
		} catch (err) {
			console.error('Error creating exercise:', err);
			throw err;
		}
	}

	async function updateExercise(exerciseId, exerciseData) {
		try {
			const response = await fetch(`/api/lessons/${lessonId}/exercises/${exerciseId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(exerciseData),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update exercise');
			}

			await loadExercises();
			setEditingId(null);
		} catch (err) {
			console.error('Error updating exercise:', err);
			alert(language === 'bm' ? 'Ralat mengemaskini latihan' : 'Error updating exercise');
		}
	}

	async function deleteExercise(exerciseId) {
		if (!confirm(language === 'bm' ? 'Adakah anda pasti mahu memadam latihan ini?' : 'Are you sure you want to delete this exercise?')) {
			return;
		}

		try {
			const response = await fetch(`/api/lessons/${lessonId}/exercises/${exerciseId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete exercise');
			}

			await loadExercises();
		} catch (err) {
			console.error('Error deleting exercise:', err);
			alert(language === 'bm' ? 'Ralat memadam latihan' : 'Error deleting exercise');
		}
	}

	function handleSubmitAnswer(exerciseId) {
		const exercise = exercises.find(e => e.id === exerciseId);
		if (!exercise) return;

		const answer = answers[exerciseId];
		if (answer === undefined || answer === null || answer === '') {
			alert(language === 'bm' ? 'Sila masukkan jawapan' : 'Please enter an answer');
			return;
		}

		// Validate answer based on type
		let isCorrect = false;
		if (exercise.type === 'mcq') {
			isCorrect = answer === exercise.correctAnswer;
		} else if (exercise.type === 'short_answer') {
			// For numbers, compare numerically; for strings, compare case-insensitive
			if (typeof exercise.correctAnswer === 'number') {
				isCorrect = parseFloat(answer) === exercise.correctAnswer;
			} else {
				isCorrect = answer.trim().toLowerCase() === exercise.correctAnswer.toString().toLowerCase().trim();
			}
		} else if (exercise.type === 'coding') {
			// For coding, simple string comparison (can be enhanced later)
			isCorrect = answer.trim() === exercise.correctAnswer.toString().trim();
		}

		setFeedback({
			...feedback,
			[exerciseId]: {
				isCorrect,
				correctAnswer: exercise.correctAnswer,
				explanation: exercise.explanation,
			},
		});
		setSubmitted({ ...submitted, [exerciseId]: true });
	}

	function handleRetry(exerciseId) {
		setAnswers({ ...answers, [exerciseId]: exerciseId === 'mcq' ? null : '' });
		setFeedback({ ...feedback, [exerciseId]: null });
		setSubmitted({ ...submitted, [exerciseId]: false });
	}

	function ExerciseForm({ exercise, onSave, onCancel }) {
		const [formData, setFormData] = useState({
			question: exercise?.question || '',
			type: exercise?.type || 'short_answer',
			options: exercise?.options || ['', ''],
			correctAnswer: exercise?.correctAnswer || '',
			points: exercise?.points || 1,
			explanation: exercise?.explanation || '',
		});

		function handleSave() {
			// Validation
			if (!formData.question.trim()) {
				alert(language === 'bm' ? 'Sila masukkan soalan' : 'Please enter a question');
				return;
			}

			if (formData.type === 'mcq') {
				if (formData.options.length < 2 || formData.options.some(opt => !opt.trim())) {
					alert(language === 'bm' ? 'MCQ mesti mempunyai sekurang-kurangnya 2 pilihan yang diisi' : 'MCQ must have at least 2 filled options');
					return;
				}
				if (!formData.correctAnswer) {
					alert(language === 'bm' ? 'Sila pilih jawapan yang betul' : 'Please select the correct answer');
					return;
				}
			} else {
				if (!formData.correctAnswer && formData.correctAnswer !== 0) {
					alert(language === 'bm' ? 'Sila masukkan jawapan yang betul' : 'Please enter the correct answer');
					return;
				}
			}

			onSave({
				...formData,
				options: formData.type === 'mcq' ? formData.options.filter(opt => opt.trim()) : undefined,
			});
		}

		return (
			<Card className="border-primary/20 bg-primary/5">
				<CardContent className="pt-6 space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2">{t.question}</label>
						<Input
							value={formData.question}
							onChange={(e) => setFormData({ ...formData, question: e.target.value })}
							placeholder={t.question}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">{t.type}</label>
						<select
							value={formData.type}
							onChange={(e) => {
								const newType = e.target.value;
								setFormData({
									...formData,
									type: newType,
									options: newType === 'mcq' ? ['', ''] : undefined,
									correctAnswer: newType === 'mcq' ? '' : formData.correctAnswer,
								});
							}}
							className="w-full px-3 py-2 rounded-lg border border-input bg-background"
						>
							<option value="mcq">{t.mcq}</option>
							<option value="short_answer">{t.shortAnswer}</option>
							<option value="coding">{t.coding}</option>
						</select>
					</div>

					{formData.type === 'mcq' && (
						<div>
							<label className="block text-sm font-medium mb-2">{t.options}</label>
							<div className="space-y-2">
								{formData.options.map((opt, idx) => (
									<div key={idx} className="flex gap-2">
										<input
											type="radio"
											name="correctAnswer"
											checked={formData.correctAnswer === idx.toString()}
											onChange={() => setFormData({ ...formData, correctAnswer: idx.toString() })}
											className="mt-1"
										/>
										<Input
											value={opt}
											onChange={(e) => {
												const newOptions = [...formData.options];
												newOptions[idx] = e.target.value;
												setFormData({ ...formData, options: newOptions });
											}}
											placeholder={`${t.options} ${idx + 1}`}
										/>
										{formData.options.length > 2 && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													const newOptions = formData.options.filter((_, i) => i !== idx);
													setFormData({ ...formData, options: newOptions });
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										)}
									</div>
								))}
								<Button
									variant="outline"
									size="sm"
									onClick={() => setFormData({ ...formData, options: [...formData.options, ''] })}
								>
									<Plus className="h-4 w-4 mr-1" />
									{t.addOption}
								</Button>
							</div>
						</div>
					)}

					{formData.type !== 'mcq' && (
						<div>
							<label className="block text-sm font-medium mb-2">{t.correctAnswerLabel}</label>
							<Input
								type={formData.type === 'short_answer' && typeof formData.correctAnswer === 'number' ? 'number' : 'text'}
								value={formData.correctAnswer}
								onChange={(e) => {
									const value = formData.type === 'short_answer' && e.target.type === 'number' 
										? parseFloat(e.target.value) || 0 
										: e.target.value;
									setFormData({ ...formData, correctAnswer: value });
								}}
								placeholder={t.correctAnswerLabel}
							/>
						</div>
					)}

					<div>
						<label className="block text-sm font-medium mb-2">{t.points}</label>
						<Input
							type="number"
							value={formData.points}
							onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
							min="1"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">{t.explanationLabel}</label>
						<textarea
							value={formData.explanation}
							onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
							className="w-full px-3 py-2 rounded-lg border border-input bg-background min-h-[80px]"
							placeholder={t.explanationLabel}
						/>
					</div>

					<div className="flex gap-2">
						<Button onClick={handleSave}>{t.save}</Button>
						<Button variant="outline" onClick={onCancel}>{t.cancel}</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (loading) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mt-6">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{t.title}</CardTitle>
						<CardDescription>{t.subtitle}</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						{isTeacher && (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={handleGenerateAI}
									disabled={generating}
								>
									{generating ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Sparkles className="h-4 w-4 mr-2" />
									)}
									{t.generateWithAI}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setNewExercise({})}
								>
									<Plus className="h-4 w-4 mr-2" />
									{t.addExercise}
								</Button>
							</>
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setExpanded(!expanded)}
						>
							{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</div>
				</div>
			</CardHeader>
			{expanded && (
				<CardContent className="space-y-4">
					{newExercise && (
						<ExerciseForm
							exercise={null}
							onSave={async (data) => {
								await createExercise(data);
								setNewExercise(null);
								await loadExercises();
							}}
							onCancel={() => setNewExercise(null)}
						/>
					)}

					{exercises.length === 0 && !newExercise ? (
						<p className="text-body text-muted-foreground text-center py-8">{t.noExercises}</p>
					) : (
						exercises.map((exercise) => (
							<div key={exercise.id}>
								{editingId === exercise.id ? (
									<ExerciseForm
										exercise={exercise}
										onSave={(data) => updateExercise(exercise.id, data)}
										onCancel={() => setEditingId(null)}
									/>
								) : (
									<Card>
										<CardContent className="pt-6">
											<div className="space-y-4">
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<h4 className="text-body font-semibold mb-2">{exercise.question}</h4>
														<p className="text-caption text-muted-foreground">
															{exercise.type === 'mcq' ? t.mcq : exercise.type === 'coding' ? t.coding : t.shortAnswer} • {exercise.points} {exercise.points === 1 ? 'point' : 'points'}
														</p>
													</div>
													{isTeacher && (
														<div className="flex gap-2">
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setEditingId(exercise.id)}
															>
																<Edit2 className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => deleteExercise(exercise.id)}
															>
																<Trash2 className="h-4 w-4 text-error" />
															</Button>
														</div>
													)}
												</div>

												{!isTeacher && (
													<div className="space-y-3">
														{exercise.type === 'mcq' ? (
															<div className="space-y-2">
																{exercise.options.map((option, idx) => (
																	<label key={idx} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-neutralLight cursor-pointer">
																		<input
																			type="radio"
																			name={`exercise-${exercise.id}`}
																			value={idx}
																			checked={answers[exercise.id] === idx.toString()}
																			onChange={(e) => setAnswers({ ...answers, [exercise.id]: e.target.value })}
																			disabled={submitted[exercise.id]}
																		/>
																		<span>{option}</span>
																	</label>
																))}
															</div>
														) : exercise.type === 'coding' ? (
															<textarea
																value={answers[exercise.id] || ''}
																onChange={(e) => setAnswers({ ...answers, [exercise.id]: e.target.value })}
																placeholder={t.enterCode}
																disabled={submitted[exercise.id]}
																className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono text-sm min-h-[120px]"
															/>
														) : (
															<Input
																type={typeof exercise.correctAnswer === 'number' ? 'number' : 'text'}
																value={answers[exercise.id] || ''}
																onChange={(e) => setAnswers({ ...answers, [exercise.id]: e.target.value })}
																placeholder={t.enterAnswer}
																disabled={submitted[exercise.id]}
															/>
														)}

														{!submitted[exercise.id] ? (
															<Button onClick={() => handleSubmitAnswer(exercise.id)}>
																{t.submitAnswer}
															</Button>
														) : (
															<div className="space-y-2">
																{feedback[exercise.id] && (
																	<div className={`p-4 rounded-lg ${feedback[exercise.id].isCorrect ? 'bg-success/10 border border-success' : 'bg-error/10 border border-error'}`}>
																		<div className="flex items-center gap-2 mb-2">
																			{feedback[exercise.id].isCorrect ? (
																<CheckCircle2 className="h-5 w-5 text-success" />
																			) : (
																<XCircle className="h-5 w-5 text-error" />
																			)}
																			<span className="font-semibold">
																				{feedback[exercise.id].isCorrect ? t.correct : t.incorrect}
																			</span>
																		</div>
																		{!feedback[exercise.id].isCorrect && (
																			<p className="text-sm mb-2">
																				<strong>{t.correctAnswer}:</strong> {feedback[exercise.id].correctAnswer}
																			</p>
																		)}
																		{feedback[exercise.id].explanation && (
																			<p className="text-sm">
																				<strong>{t.explanation}:</strong> {feedback[exercise.id].explanation}
																			</p>
																		)}
																	</div>
																)}
																<Button variant="outline" onClick={() => handleRetry(exercise.id)}>
																	{t.retry}
																</Button>
															</div>
														)}
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								)}
							</div>
						))
					)}
				</CardContent>
			)}
		</Card>
	);
}
