'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	ArrowLeft,
	CheckCircle,
	XCircle,
	RotateCcw,
	Sparkles,
	Trophy,
	AlertCircle,
	Code,
	Puzzle,
	MousePointerClick,
} from 'lucide-react';

// Game level data - in production, fetch from Firestore
const GAME_DATA = {
	'sql-select-puzzle': {
		type: 'puzzle',
		title: 'SELECT Query Puzzle',
		topic: 'SQL SELECT & WHERE',
		instructions: 'Arrange the SQL query parts in the correct order. Drag pieces to reorder them.',
		puzzle: {
			parts: ['SELECT', 'name, email', 'FROM', 'students', 'WHERE', 'age > 18', 'ORDER BY', 'name ASC'],
			correctOrder: [0, 1, 2, 3, 4, 5, 6, 7],
		},
	},
	'join-adventure': {
		type: 'drag-drop',
		title: 'JOIN Adventure',
		topic: 'INNER / LEFT JOIN',
		instructions: 'Drag JOIN blocks from the palette to build a query that combines students and courses tables.',
		dragDrop: {
			goal: 'Create a query that shows student names with their enrolled courses',
			palette: [
				{ id: 'select', label: 'SELECT', type: 'keyword' },
				{ id: 'from', label: 'FROM', type: 'keyword' },
				{ id: 'inner-join', label: 'INNER JOIN', type: 'join' },
				{ id: 'left-join', label: 'LEFT JOIN', type: 'join' },
				{ id: 'on', label: 'ON', type: 'keyword' },
				{ id: 'students', label: 'students', type: 'table' },
				{ id: 'courses', label: 'courses', type: 'table' },
				{ id: 'enrollments', label: 'enrollments', type: 'table' },
				{ id: 'student_id', label: 'student_id', type: 'column' },
				{ id: 'course_id', label: 'course_id', type: 'column' },
				{ id: 'name', label: 'name', type: 'column' },
				{ id: 'title', label: 'title', type: 'column' },
			],
			solution: ['SELECT', 'students.name', 'courses.title', 'FROM', 'students', 'INNER JOIN', 'enrollments', 'ON', 'students.id = enrollments.student_id', 'INNER JOIN', 'courses', 'ON', 'enrollments.course_id = courses.id'],
		},
	},
	'query-builder': {
		type: 'code-preview',
		title: 'Query Builder Challenge',
		topic: 'SQL Query Writing',
		instructions: 'Write a SQL query to retrieve all students older than 18, ordered by name. See instant results!',
		codePreview: {
			table: 'students',
			sampleData: [
				{ id: 1, name: 'Alice', age: 20, email: 'alice@example.com' },
				{ id: 2, name: 'Bob', age: 17, email: 'bob@example.com' },
				{ id: 3, name: 'Charlie', age: 19, email: 'charlie@example.com' },
				{ id: 4, name: 'Diana', age: 21, email: 'diana@example.com' },
			],
			expectedQuery: "SELECT * FROM students WHERE age > 18 ORDER BY name ASC",
			hint: 'Use SELECT, FROM, WHERE, and ORDER BY clauses.',
		},
	},
	'normalization-puzzle': {
		type: 'puzzle',
		title: 'Normalization Puzzle',
		topic: 'Database Design',
		instructions: 'Arrange the table pieces to show the normalized database structure (1NF, 2NF, 3NF).',
		puzzle: {
			parts: [
				'students (id, name)',
				'courses (id, title)',
				'enrollments (student_id, course_id, grade)',
				'Remove: students (id, name, course_title, grade)',
			],
			correctOrder: [0, 1, 2],
		},
	},
	'aggregate-functions': {
		type: 'code-preview',
		title: 'Aggregate Functions Playground',
		topic: 'COUNT, SUM, AVG, GROUP BY',
		instructions: 'Write queries using COUNT, SUM, AVG, and GROUP BY to analyze student enrollment data.',
		codePreview: {
			table: 'enrollments',
			sampleData: [
				{ student_id: 1, course_id: 101, grade: 85 },
				{ student_id: 1, course_id: 102, grade: 90 },
				{ student_id: 2, course_id: 101, grade: 78 },
				{ student_id: 2, course_id: 103, grade: 88 },
				{ student_id: 3, course_id: 101, grade: 92 },
			],
			expectedQuery: "SELECT course_id, COUNT(*) as enrollments, AVG(grade) as avg_grade FROM enrollments GROUP BY course_id",
			hint: 'Use GROUP BY with aggregate functions.',
		},
	},
	'subquery-master': {
		type: 'drag-drop',
		title: 'Subquery Master',
		topic: 'Nested Queries',
		instructions: 'Build a nested query to find students enrolled in more than 2 courses.',
		dragDrop: {
			goal: 'Find students with more than 2 enrollments using a subquery',
			palette: [
				{ id: 'select', label: 'SELECT', type: 'keyword' },
				{ id: 'from', label: 'FROM', type: 'keyword' },
				{ id: 'where', label: 'WHERE', type: 'keyword' },
				{ id: 'in', label: 'IN', type: 'keyword' },
				{ id: 'students', label: 'students', type: 'table' },
				{ id: 'enrollments', label: 'enrollments', type: 'table' },
				{ id: 'id', label: 'id', type: 'column' },
				{ id: 'student_id', label: 'student_id', type: 'column' },
				{ id: 'count', label: 'COUNT(*)', type: 'function' },
				{ id: 'group-by', label: 'GROUP BY', type: 'keyword' },
				{ id: 'having', label: 'HAVING', type: 'keyword' },
				{ id: 'greater-than', label: '>', type: 'operator' },
				{ id: 'two', label: '2', type: 'value' },
			],
			solution: ['SELECT', '*', 'FROM', 'students', 'WHERE', 'id', 'IN', '(SELECT', 'student_id', 'FROM', 'enrollments', 'GROUP BY', 'student_id', 'HAVING', 'COUNT(*)', '>', '2)'],
		},
	},
};

export default function GameLevelPage() {
	const params = useParams();
	const router = useRouter();
	const gameId = params.id;
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [gameData, setGameData] = useState(null);
	const [score, setScore] = useState(0);
	const [completed, setCompleted] = useState(false);
	const [showHint, setShowHint] = useState(false);

	// Puzzle game state
	const [puzzleParts, setPuzzleParts] = useState([]);
	const [puzzleOrder, setPuzzleOrder] = useState([]);
	const [draggedPuzzleIndex, setDraggedPuzzleIndex] = useState(null);

	// Drag-drop game state
	const [draggedItem, setDraggedItem] = useState(null);
	const [droppedItems, setDroppedItems] = useState([]);
	const dragOverRef = useRef(null);

	// Code-preview game state
	const [code, setCode] = useState('');
	const [queryResults, setQueryResults] = useState([]);
	const [queryError, setQueryError] = useState('');

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			if (!currentUser) {
				router.push('/login');
				return;
			}
			setUser(currentUser);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		const loadGameData = async () => {
			if (!gameId) return;

			// First try to fetch from Firestore
			try {
				const gameDoc = await getDoc(doc(db, 'gameLevel', gameId));
				if (gameDoc.exists()) {
					const data = gameDoc.data();
					setGameData(data);

					// Initialize game state based on type
					if (data.type === 'puzzle' && data.puzzle) {
						const shuffled = [...data.puzzle.parts].sort(() => Math.random() - 0.5);
						setPuzzleParts(shuffled);
						setPuzzleOrder(shuffled.map((_, i) => i));
					} else if (data.type === 'drag-drop' && data.dragDrop) {
						setDroppedItems([]);
					} else if (data.type === 'code-preview' && data.codePreview) {
						setCode('');
						setQueryResults([]);
						setQueryError('');
					}
					setLoading(false);
					return;
				}
			} catch (error) {
				console.error('Error fetching game from Firestore:', error);
			}

			// Fallback to hardcoded data
			if (GAME_DATA[gameId]) {
				const data = GAME_DATA[gameId];
				setGameData(data);

				// Initialize game state based on type
				if (data.type === 'puzzle') {
					const shuffled = [...data.puzzle.parts].sort(() => Math.random() - 0.5);
					setPuzzleParts(shuffled);
					setPuzzleOrder(shuffled.map((_, i) => i));
				} else if (data.type === 'drag-drop') {
					setDroppedItems([]);
				} else if (data.type === 'code-preview') {
					setCode('');
					setQueryResults([]);
					setQueryError('');
				}
			}
			setLoading(false);
		};

		loadGameData();
	}, [gameId]);

	const handlePuzzleReorder = (fromIndex, toIndex) => {
		const newOrder = [...puzzleOrder];
		const [removed] = newOrder.splice(fromIndex, 1);
		newOrder.splice(toIndex, 0, removed);
		setPuzzleOrder(newOrder);
	};

	const checkPuzzleSolution = () => {
		if (!gameData) return;
		const correctOrder = gameData.puzzle.correctOrder;
		const currentOrder = puzzleOrder;
		const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);

		if (isCorrect) {
			setCompleted(true);
			setScore(100);
		} else {
			setShowHint(true);
			setTimeout(() => setShowHint(false), 3000);
		}
	};

	const handleDragStart = (item) => {
		setDraggedItem(item);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (e) => {
		e.preventDefault();
		if (draggedItem) {
			setDroppedItems([...droppedItems, draggedItem]);
			setDraggedItem(null);
		}
	};

	const handleRemoveDropped = (index) => {
		setDroppedItems(droppedItems.filter((_, i) => i !== index));
	};

	const checkDragDropSolution = () => {
		if (!gameData) return;
		const solution = gameData.dragDrop.solution;
		const current = droppedItems.map(item => item.label);
		const isCorrect = JSON.stringify(current) === JSON.stringify(solution);

		if (isCorrect) {
			setCompleted(true);
			setScore(100);
		} else {
			setShowHint(true);
			setTimeout(() => setShowHint(false), 3000);
		}
	};

	const executeQuery = () => {
		if (!gameData || !code.trim()) {
			setQueryError('Please enter a query.');
			return;
		}

		try {
			// Simple SQL-like parser for demo (in production, use a proper SQL parser or backend)
			const query = code.trim().toUpperCase();
			const expected = gameData.codePreview.expectedQuery.toUpperCase().replace(/\s+/g, ' ');

			// Check if query matches expected (simplified check)
			if (query.includes('SELECT') && query.includes('FROM')) {
				// Filter sample data based on query logic (simplified)
				let results = [...gameData.codePreview.sampleData];

				// Parse WHERE clause
				if (query.includes('WHERE')) {
					const whereMatch = query.match(/WHERE\s+(\w+)\s*([><=]+)\s*(\d+)/i);
					if (whereMatch) {
						const [, column, operator, value] = whereMatch;
						const numValue = parseInt(value);
						if (column.toLowerCase() === 'age') {
							if (operator.includes('>')) {
								results = results.filter(row => row.age > numValue);
							} else if (operator.includes('<')) {
								results = results.filter(row => row.age < numValue);
							} else if (operator.includes('=')) {
								results = results.filter(row => row.age === numValue);
							}
						}
					}
				}

				// Parse ORDER BY clause
				if (query.includes('ORDER BY')) {
					const orderMatch = query.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
					if (orderMatch) {
						const [, column, direction] = orderMatch;
						if (column.toLowerCase() === 'name') {
							results.sort((a, b) => {
								const comparison = a.name.localeCompare(b.name);
								return direction && direction.toUpperCase() === 'DESC' ? -comparison : comparison;
							});
						}
					}
				}

				// Parse GROUP BY and aggregates
				if (query.includes('GROUP BY')) {
					const groupMatch = query.match(/GROUP BY\s+(\w+)/i);
					if (groupMatch) {
						const groupColumn = groupMatch[1].toLowerCase();
						const grouped = {};
						results.forEach(row => {
							const key = row[groupColumn];
							if (!grouped[key]) {
								grouped[key] = { ...row, count: 0, sum: 0 };
							}
							grouped[key].count++;
							if (row.grade !== undefined) {
								grouped[key].sum += row.grade;
								grouped[key].avg_grade = grouped[key].sum / grouped[key].count;
							}
						});
						results = Object.values(grouped);
					}
				}

				setQueryResults(results);
				setQueryError('');

				// Check if solution is correct (normalize whitespace)
				const normalizedQuery = query.replace(/\s+/g, ' ').trim();
				if (normalizedQuery === expected.trim()) {
					setCompleted(true);
					setScore(100);
				} else {
					// Partial credit for getting results even if not exact match
					if (results.length > 0) {
						setShowHint(true);
						setTimeout(() => setShowHint(false), 3000);
					}
				}
			} else {
				setQueryError('Invalid query. Must include SELECT and FROM.');
			}
		} catch (error) {
			setQueryError('Error executing query: ' + error.message);
		}
	};

	const resetGame = () => {
		if (!gameData) return;

		if (gameData.type === 'puzzle') {
			const shuffled = [...gameData.puzzle.parts].sort(() => Math.random() - 0.5);
			setPuzzleParts(shuffled);
			setPuzzleOrder(shuffled.map((_, i) => i));
		} else if (gameData.type === 'drag-drop') {
			setDroppedItems([]);
		} else if (gameData.type === 'code-preview') {
			setCode('');
			setQueryResults([]);
			setQueryError('');
		}

		setCompleted(false);
		setScore(0);
		setShowHint(false);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading game...</div>
			</div>
		);
	}

	if (!gameData) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
				<AlertCircle className="h-12 w-12 text-muted-foreground" />
				<h2 className="text-h2 text-neutralDark">Game not found</h2>
				<Button onClick={() => router.push('/game-levels')}>Back to Library</Button>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Button variant="ghost" onClick={() => router.push('/game-levels')}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Library
				</Button>
				{completed && (
					<div className="flex items-center gap-2 text-green-600">
						<Trophy className="h-5 w-5" />
						<span className="font-bold">Completed! Score: {score}</span>
					</div>
				)}
			</div>

			{/* Game Info */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-h1 text-neutralDark">{gameData.title}</CardTitle>
							<p className="text-body text-muted-foreground mt-2">{gameData.topic}</p>
						</div>
						{gameData.type === 'puzzle' && <Puzzle className="h-8 w-8 text-primary" />}
						{gameData.type === 'drag-drop' && <MousePointerClick className="h-8 w-8 text-primary" />}
						{gameData.type === 'code-preview' && <Code className="h-8 w-8 text-primary" />}
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-body text-muted-foreground mb-4">{gameData.instructions}</p>
					{showHint && (
						<div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-700 dark:text-yellow-400">
							<AlertCircle className="h-4 w-4" />
							<span className="text-sm">Not quite right! Try again.</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Puzzle Game */}
			{gameData.type === 'puzzle' && (
				<Card>
					<CardHeader>
						<CardTitle>Arrange the Query Parts</CardTitle>
						<p className="text-sm text-muted-foreground mt-2">
							Drag pieces to reorder them, or click to swap with the previous item.
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-neutralLight/30 rounded-lg">
							{puzzleOrder.map((partIndex, index) => (
								<div
									key={`${index}-${partIndex}`}
									draggable
									onDragStart={(e) => {
										setDraggedPuzzleIndex(index);
										e.dataTransfer.effectAllowed = 'move';
										e.dataTransfer.setData('text/plain', index.toString());
										e.currentTarget.style.opacity = '0.5';
									}}
									onDragEnd={(e) => {
										e.currentTarget.style.opacity = '1';
										setDraggedPuzzleIndex(null);
									}}
									onDragOver={(e) => {
										e.preventDefault();
										e.dataTransfer.dropEffect = 'move';
										if (draggedPuzzleIndex !== null && draggedPuzzleIndex !== index) {
											e.currentTarget.classList.add('ring-2', 'ring-primary');
										}
									}}
									onDragLeave={(e) => {
										e.currentTarget.classList.remove('ring-2', 'ring-primary');
									}}
									onDrop={(e) => {
										e.preventDefault();
										e.currentTarget.classList.remove('ring-2', 'ring-primary');
										const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
										if (!isNaN(fromIndex) && fromIndex !== index) {
											handlePuzzleReorder(fromIndex, index);
										}
									}}
									onClick={() => {
										// Swap with previous item on click
										if (index > 0) {
											handlePuzzleReorder(index, index - 1);
										}
									}}
									className={`px-4 py-2 bg-white dark:bg-gray-800 hover:bg-primary/10 rounded-lg text-sm font-mono border-2 border-primary/30 cursor-move transition-all transform hover:scale-105 ${
										draggedPuzzleIndex === index ? 'opacity-50' : ''
									}`}
								>
									{puzzleParts[partIndex]}
								</div>
							))}
						</div>
						<div className="flex gap-2">
							<Button onClick={checkPuzzleSolution} disabled={completed} className="flex-1">
								<CheckCircle className="h-4 w-4 mr-2" />
								{completed ? 'Completed!' : 'Check Solution'}
							</Button>
							<Button variant="outline" onClick={resetGame}>
								<RotateCcw className="h-4 w-4 mr-2" />
								Reset
							</Button>
						</div>
						{completed && (
							<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
								<Sparkles className="h-5 w-5" />
								<span className="font-semibold">Perfect! You've arranged the query correctly!</span>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Drag-Drop Game */}
			{gameData.type === 'drag-drop' && (
				<div className="grid md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Palette</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{gameData.dragDrop.palette
									.filter(item => !droppedItems.find(d => d.id === item.id))
									.map((item) => (
										<button
											key={item.id}
											draggable
											onDragStart={() => handleDragStart(item)}
											className={`px-3 py-2 rounded-lg text-sm border-2 cursor-move transition-all ${
												item.type === 'keyword'
													? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
													: item.type === 'join'
													? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400'
													: item.type === 'table'
													? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
													: 'bg-gray-500/10 border-gray-500/30'
											}`}
										>
											{item.label}
										</button>
									))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Query Builder</CardTitle>
							<p className="text-sm text-muted-foreground">{gameData.dragDrop.goal}</p>
						</CardHeader>
						<CardContent>
							<div
								ref={dragOverRef}
								onDragOver={handleDragOver}
								onDrop={handleDrop}
								className="min-h-[200px] p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5"
							>
								{droppedItems.length === 0 ? (
									<p className="text-center text-muted-foreground">Drag items here to build your query</p>
								) : (
									<div className="flex flex-wrap gap-2">
										{droppedItems.map((item, index) => (
											<div
												key={index}
												className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border-2 border-primary/50"
											>
												<span className="text-sm font-mono">{item.label}</span>
												<button
													onClick={() => handleRemoveDropped(index)}
													className="text-red-500 hover:text-red-700"
												>
													<XCircle className="h-4 w-4" />
												</button>
											</div>
										))}
									</div>
								)}
							</div>
							<div className="flex gap-2 mt-4">
								<Button onClick={checkDragDropSolution} disabled={completed} className="flex-1">
									<CheckCircle className="h-4 w-4 mr-2" />
									{completed ? 'Completed!' : 'Check Solution'}
								</Button>
								<Button variant="outline" onClick={resetGame}>
									<RotateCcw className="h-4 w-4 mr-2" />
									Reset
								</Button>
							</div>
							{completed && (
								<div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
									<Sparkles className="h-5 w-5" />
									<span className="font-semibold">Excellent! Your query is correct!</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Code-Preview Game */}
			{gameData.type === 'code-preview' && (
				<div className="grid md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Write Your Query</CardTitle>
							<p className="text-sm text-muted-foreground">{gameData.codePreview.hint}</p>
						</CardHeader>
						<CardContent className="space-y-4">
							<textarea
								value={code}
								onChange={(e) => setCode(e.target.value)}
								placeholder="SELECT * FROM students WHERE age > 18 ORDER BY name ASC"
								className="w-full h-32 p-3 font-mono text-sm border-2 border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<Button onClick={executeQuery} className="w-full">
								<Sparkles className="h-4 w-4 mr-2" />
								Run Query
							</Button>
							{queryError && (
								<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
									{queryError}
								</div>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Query Results</CardTitle>
						</CardHeader>
						<CardContent>
							{queryResults.length > 0 ? (
								<div className="overflow-x-auto">
									<table className="w-full border-collapse">
										<thead>
											<tr className="bg-primary/10">
												{Object.keys(queryResults[0]).map((key) => (
													<th key={key} className="border border-border p-2 text-left text-sm font-semibold">
														{key}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{queryResults.map((row, index) => (
												<tr key={index} className="border-b border-border">
													{Object.values(row).map((value, cellIndex) => (
														<td key={cellIndex} className="border border-border p-2 text-sm">
															{value}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="text-center text-muted-foreground py-8">
									<p>Run a query to see results here</p>
								</div>
							)}
							{completed && (
								<div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
									<CheckCircle className="h-4 w-4" />
									<span>Perfect! Your query matches the expected solution.</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}

