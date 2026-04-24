'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
	ArrowLeft,
	Save,
	Puzzle,
	MousePointerClick,
	Code,
	Plus,
	X,
	AlertCircle,
} from 'lucide-react';

const GAME_TYPES = {
	PUZZLE: 'puzzle',
	DRAG_DROP: 'drag-drop',
	CODE_PREVIEW: 'code-preview',
};

export default function CreateGameLevelPage() {
	const router = useRouter();
	const { userData, loading: authLoading } = useAuth();
	const [submitting, setSubmitting] = useState(false);

	// Form state
	const [gameType, setGameType] = useState(GAME_TYPES.PUZZLE);
	const [title, setTitle] = useState('');
	const [topic, setTopic] = useState('');
	const [instructions, setInstructions] = useState('');
	const [difficulty, setDifficulty] = useState('Easy');
	const [points, setPoints] = useState(50);
	const [estimatedTime, setEstimatedTime] = useState('3 min');

	// Validation errors
	const [errors, setErrors] = useState({});

	// Puzzle-specific state
	const [puzzleParts, setPuzzleParts] = useState(['SELECT', 'FROM', 'WHERE']);
	const [newPuzzlePart, setNewPuzzlePart] = useState('');

	// Drag-drop specific state
	const [paletteItems, setPaletteItems] = useState([]);
	const [newPaletteItem, setNewPaletteItem] = useState({ label: '', type: 'keyword' });
	const [solution, setSolution] = useState('');

	// Code-preview specific state
	const [tableName, setTableName] = useState('');
	const [sampleDataRows, setSampleDataRows] = useState([{ id: 1, name: '', age: '' }]);
	const [expectedQuery, setExpectedQuery] = useState('');
	const [hint, setHint] = useState('');

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		if (userData.role !== 'teacher' && userData.role !== 'admin') {
			router.push('/game-levels');
		}
	}, [authLoading, userData, router]);

	const validateField = (fieldName, value) => {
		const newErrors = { ...errors };
		if (!value || (typeof value === 'string' && value.trim() === '')) {
			newErrors[fieldName] = `Please input ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
		} else {
			delete newErrors[fieldName];
		}
		setErrors(newErrors);
	};

	const validateForm = () => {
		const newErrors = {};
		if (!title.trim()) newErrors.title = 'Please input title';
		if (!topic.trim()) newErrors.topic = 'Please input topic';
		if (!instructions.trim()) newErrors.instructions = 'Please input instructions';

		if (gameType === GAME_TYPES.PUZZLE) {
			if (puzzleParts.length < 2) newErrors.puzzleParts = 'Please add at least 2 puzzle parts';
		} else if (gameType === GAME_TYPES.DRAG_DROP) {
			if (paletteItems.length === 0) newErrors.paletteItems = 'Please add at least one palette item';
			if (!solution.trim()) newErrors.solution = 'Please input solution';
		} else if (gameType === GAME_TYPES.CODE_PREVIEW) {
			if (!tableName.trim()) newErrors.tableName = 'Please input table name';
			if (sampleDataRows.length === 0 || sampleDataRows.some(row => !row.name || !row.id)) {
				newErrors.sampleData = 'Please add at least one sample data row with id and name';
			}
			if (!expectedQuery.trim()) newErrors.expectedQuery = 'Please input expected query';
			if (!hint.trim()) newErrors.hint = 'Please input hint';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const addPuzzlePart = () => {
		if (newPuzzlePart.trim()) {
			setPuzzleParts([...puzzleParts, newPuzzlePart.trim()]);
			setNewPuzzlePart('');
		}
	};

	const removePuzzlePart = (index) => setPuzzleParts(puzzleParts.filter((_, i) => i !== index));

	const addPaletteItem = () => {
		if (newPaletteItem.label.trim()) {
			setPaletteItems([
				...paletteItems,
				{ id: `item-${Date.now()}`, label: newPaletteItem.label.trim(), type: newPaletteItem.type },
			]);
			setNewPaletteItem({ label: '', type: 'keyword' });
		}
	};

	const removePaletteItem = (index) => setPaletteItems(paletteItems.filter((_, i) => i !== index));

	const addSampleDataRow = () =>
		setSampleDataRows([...sampleDataRows, { id: sampleDataRows.length + 1, name: '', age: '' }]);

	const removeSampleDataRow = (index) =>
		setSampleDataRows(sampleDataRows.filter((_, i) => i !== index));

	const updateSampleDataRow = (index, field, value) => {
		const updated = [...sampleDataRows];
		updated[index] = { ...updated[index], [field]: value };
		setSampleDataRows(updated);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) return;

		setSubmitting(true);
		try {
			const gameData = {
				type: gameType,
				title: title.trim(),
				topic: topic.trim(),
				instructions: instructions.trim(),
				description: instructions.trim(),
				difficulty,
				points: parseInt(points) || 50,
				estimatedTime: estimatedTime.trim(),
				createdBy: userData._id?.toString(),
				published: true,
			};

			if (gameType === GAME_TYPES.PUZZLE) {
				gameData.puzzle = {
					parts: puzzleParts,
					correctOrder: puzzleParts.map((_, i) => i),
				};
			} else if (gameType === GAME_TYPES.DRAG_DROP) {
				const solutionArray = solution.split(',').map(s => s.trim()).filter(s => s);
				gameData.dragDrop = {
					goal: instructions,
					palette: paletteItems,
					solution: solutionArray,
				};
			} else if (gameType === GAME_TYPES.CODE_PREVIEW) {
				const formattedSampleData = sampleDataRows.map(row => {
					const formatted = { id: parseInt(row.id) || row.id };
					if (row.name) formatted.name = row.name;
					if (row.age) formatted.age = parseInt(row.age) || row.age;
					return formatted;
				});
				gameData.codePreview = {
					table: tableName.trim(),
					sampleData: formattedSampleData,
					expectedQuery: expectedQuery.trim(),
					hint: hint.trim(),
				};
			}

			await api.post('/api/game-levels', gameData);
			router.push('/game-levels');
		} catch (error) {
			console.error('Error creating game level:', error);
			alert('Failed to create game level: ' + (error.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	};

	if (authLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<div className="flex items-center justify-between">
				<Button variant="ghost" onClick={() => router.push('/game-levels')}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Game Levels
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-h1 text-neutralDark">Create New Game Level</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Game Type Selection */}
						<div className="space-y-2">
							<label className="text-body font-medium text-neutralDark">Game Type *</label>
							<div className="grid grid-cols-3 gap-4">
								{[
									{ type: GAME_TYPES.PUZZLE, label: 'Puzzle', Icon: Puzzle },
									{ type: GAME_TYPES.DRAG_DROP, label: 'Drag & Drop', Icon: MousePointerClick },
									{ type: GAME_TYPES.CODE_PREVIEW, label: 'Code Preview', Icon: Code },
								].map(({ type, label, Icon }) => (
									<button
										key={type}
										type="button"
										onClick={() => setGameType(type)}
										className={`p-4 border-2 rounded-lg transition-all ${
											gameType === type
												? 'border-primary bg-primary/10'
												: 'border-border hover:border-primary/50'
										}`}
									>
										<Icon className="h-8 w-8 mx-auto mb-2" />
										<div className="text-sm font-medium">{label}</div>
									</button>
								))}
							</div>
						</div>

						{/* Common Fields */}
						<div className="space-y-2">
							<label htmlFor="title" className="text-body font-medium text-neutralDark">Title *</label>
							<Input
								id="title"
								value={title}
								onChange={(e) => { setTitle(e.target.value); validateField('title', e.target.value); }}
								onBlur={(e) => validateField('title', e.target.value)}
								placeholder="e.g., SELECT Query Puzzle"
								className={errors.title ? 'border-red-500' : ''}
							/>
							{errors.title && (
								<p className="text-sm text-red-500 flex items-center gap-1">
									<AlertCircle className="h-4 w-4" />{errors.title}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<label htmlFor="topic" className="text-body font-medium text-neutralDark">Topic *</label>
							<Input
								id="topic"
								value={topic}
								onChange={(e) => { setTopic(e.target.value); validateField('topic', e.target.value); }}
								onBlur={(e) => validateField('topic', e.target.value)}
								placeholder="e.g., SQL SELECT & WHERE"
								className={errors.topic ? 'border-red-500' : ''}
							/>
							{errors.topic && (
								<p className="text-sm text-red-500 flex items-center gap-1">
									<AlertCircle className="h-4 w-4" />{errors.topic}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<label htmlFor="instructions" className="text-body font-medium text-neutralDark">Instructions *</label>
							<Textarea
								id="instructions"
								value={instructions}
								onChange={(e) => { setInstructions(e.target.value); validateField('instructions', e.target.value); }}
								onBlur={(e) => validateField('instructions', e.target.value)}
								placeholder="Describe what students need to do..."
								className={errors.instructions ? 'border-red-500' : ''}
								rows={3}
							/>
							{errors.instructions && (
								<p className="text-sm text-red-500 flex items-center gap-1">
									<AlertCircle className="h-4 w-4" />{errors.instructions}
								</p>
							)}
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<label htmlFor="difficulty" className="text-body font-medium text-neutralDark">Difficulty</label>
								<select
									id="difficulty"
									value={difficulty}
									onChange={(e) => setDifficulty(e.target.value)}
									className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-body"
								>
									<option value="Easy">Easy</option>
									<option value="Medium">Medium</option>
									<option value="Hard">Hard</option>
								</select>
							</div>
							<div className="space-y-2">
								<label htmlFor="points" className="text-body font-medium text-neutralDark">Points</label>
								<Input id="points" type="number" value={points} onChange={(e) => setPoints(e.target.value)} min="0" />
							</div>
							<div className="space-y-2">
								<label htmlFor="estimatedTime" className="text-body font-medium text-neutralDark">Estimated Time</label>
								<Input id="estimatedTime" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="e.g., 3 min" />
							</div>
						</div>

						{/* Puzzle Type Fields */}
						{gameType === GAME_TYPES.PUZZLE && (
							<div className="space-y-4 p-4 bg-neutralLight/30 rounded-lg">
								<label className="text-body font-medium text-neutralDark">Puzzle Parts *</label>
								<div className="space-y-2">
									<div className="flex gap-2">
										<Input
											value={newPuzzlePart}
											onChange={(e) => setNewPuzzlePart(e.target.value)}
											onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPuzzlePart(); } }}
											placeholder="e.g., SELECT, FROM, WHERE"
										/>
										<Button type="button" onClick={addPuzzlePart}><Plus className="h-4 w-4" /></Button>
									</div>
									<div className="flex flex-wrap gap-2">
										{puzzleParts.map((part, index) => (
											<Badge key={index} variant="outline" className="flex items-center gap-1">
												{part}
												<button type="button" onClick={() => removePuzzlePart(index)} className="ml-1 hover:text-red-500">
													<X className="h-3 w-3" />
												</button>
											</Badge>
										))}
									</div>
									{errors.puzzleParts && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.puzzleParts}
										</p>
									)}
								</div>
							</div>
						)}

						{/* Drag-Drop Type Fields */}
						{gameType === GAME_TYPES.DRAG_DROP && (
							<div className="space-y-4 p-4 bg-neutralLight/30 rounded-lg">
								<label className="text-body font-medium text-neutralDark">Palette Items *</label>
								<div className="space-y-2">
									<div className="flex gap-2">
										<Input
											value={newPaletteItem.label}
											onChange={(e) => setNewPaletteItem({ ...newPaletteItem, label: e.target.value })}
											placeholder="Item label (e.g., SELECT)"
											className="flex-1"
										/>
										<select
											value={newPaletteItem.type}
											onChange={(e) => setNewPaletteItem({ ...newPaletteItem, type: e.target.value })}
											className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-body"
										>
											<option value="keyword">Keyword</option>
											<option value="join">Join</option>
											<option value="table">Table</option>
											<option value="column">Column</option>
											<option value="function">Function</option>
											<option value="operator">Operator</option>
											<option value="value">Value</option>
										</select>
										<Button type="button" onClick={addPaletteItem}><Plus className="h-4 w-4" /></Button>
									</div>
									<div className="flex flex-wrap gap-2">
										{paletteItems.map((item, index) => (
											<Badge key={index} variant="outline" className="flex items-center gap-1">
												{item.label} ({item.type})
												<button type="button" onClick={() => removePaletteItem(index)} className="ml-1 hover:text-red-500">
													<X className="h-3 w-3" />
												</button>
											</Badge>
										))}
									</div>
									{errors.paletteItems && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.paletteItems}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<label htmlFor="solution" className="text-body font-medium text-neutralDark">Solution (comma-separated) *</label>
									<Textarea
										id="solution"
										value={solution}
										onChange={(e) => { setSolution(e.target.value); validateField('solution', e.target.value); }}
										onBlur={(e) => validateField('solution', e.target.value)}
										placeholder="SELECT, students.name, courses.title, FROM, students, INNER JOIN..."
										className={errors.solution ? 'border-red-500' : ''}
										rows={3}
									/>
									{errors.solution && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.solution}
										</p>
									)}
								</div>
							</div>
						)}

						{/* Code-Preview Type Fields */}
						{gameType === GAME_TYPES.CODE_PREVIEW && (
							<div className="space-y-4 p-4 bg-neutralLight/30 rounded-lg">
								<div className="space-y-2">
									<label htmlFor="tableName" className="text-body font-medium text-neutralDark">Table Name *</label>
									<Input
										id="tableName"
										value={tableName}
										onChange={(e) => { setTableName(e.target.value); validateField('tableName', e.target.value); }}
										onBlur={(e) => validateField('tableName', e.target.value)}
										placeholder="e.g., students"
										className={errors.tableName ? 'border-red-500' : ''}
									/>
									{errors.tableName && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.tableName}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<label className="text-body font-medium text-neutralDark">Sample Data *</label>
									<div className="space-y-2">
										{sampleDataRows.map((row, index) => (
											<div key={index} className="flex gap-2 items-center">
												<Input type="number" value={row.id} onChange={(e) => updateSampleDataRow(index, 'id', e.target.value)} placeholder="ID" className="w-20" />
												<Input value={row.name} onChange={(e) => updateSampleDataRow(index, 'name', e.target.value)} placeholder="Name" className="flex-1" />
												<Input type="number" value={row.age} onChange={(e) => updateSampleDataRow(index, 'age', e.target.value)} placeholder="Age" className="w-20" />
												<Button type="button" variant="ghost" size="sm" onClick={() => removeSampleDataRow(index)}>
													<X className="h-4 w-4" />
												</Button>
											</div>
										))}
										<Button type="button" variant="outline" onClick={addSampleDataRow} className="w-full">
											<Plus className="h-4 w-4 mr-2" />Add Row
										</Button>
									</div>
									{errors.sampleData && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.sampleData}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<label htmlFor="expectedQuery" className="text-body font-medium text-neutralDark">Expected Query *</label>
									<Textarea
										id="expectedQuery"
										value={expectedQuery}
										onChange={(e) => { setExpectedQuery(e.target.value); validateField('expectedQuery', e.target.value); }}
										onBlur={(e) => validateField('expectedQuery', e.target.value)}
										placeholder="SELECT * FROM students WHERE age > 18 ORDER BY name ASC"
										className={errors.expectedQuery ? 'border-red-500' : ''}
										rows={3}
									/>
									{errors.expectedQuery && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.expectedQuery}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<label htmlFor="hint" className="text-body font-medium text-neutralDark">Hint *</label>
									<Input
										id="hint"
										value={hint}
										onChange={(e) => { setHint(e.target.value); validateField('hint', e.target.value); }}
										onBlur={(e) => validateField('hint', e.target.value)}
										placeholder="e.g., Use SELECT, FROM, WHERE, and ORDER BY clauses"
										className={errors.hint ? 'border-red-500' : ''}
									/>
									{errors.hint && (
										<p className="text-sm text-red-500 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />{errors.hint}
										</p>
									)}
								</div>
							</div>
						)}

						<div className="flex gap-4 pt-4">
							<Button type="submit" disabled={submitting} className="flex-1">
								<Save className="h-4 w-4 mr-2" />
								{submitting ? 'Saving...' : 'Create Game Level'}
							</Button>
							<Button type="button" variant="outline" onClick={() => router.push('/game-levels')}>Cancel</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
