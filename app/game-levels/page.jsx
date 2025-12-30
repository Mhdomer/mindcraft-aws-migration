'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Target, BookOpen, Puzzle, MousePointerClick, Code, Sparkles, Trophy } from 'lucide-react';

// Game level types
const GAME_TYPES = {
	PUZZLE: 'puzzle',
	DRAG_DROP: 'drag-drop',
	CODE_PREVIEW: 'code-preview',
};

// Sample game levels library - in production, these would come from Firestore
const sampleGameLevels = [
	{
		id: 'sql-select-puzzle',
		title: 'SELECT Query Puzzle',
		type: GAME_TYPES.PUZZLE,
		topic: 'SQL SELECT & WHERE',
		difficulty: 'Easy',
		description: 'Arrange SQL query parts in the correct order to retrieve student data.',
		points: 50,
		estimatedTime: '3 min',
	},
	{
		id: 'join-adventure',
		title: 'JOIN Adventure',
		type: GAME_TYPES.DRAG_DROP,
		topic: 'INNER / LEFT JOIN',
		difficulty: 'Medium',
		description: 'Drag and drop JOIN blocks to combine tables and solve database puzzles.',
		points: 100,
		estimatedTime: '5 min',
	},
	{
		id: 'query-builder',
		title: 'Query Builder Challenge',
		type: GAME_TYPES.CODE_PREVIEW,
		topic: 'SQL Query Writing',
		difficulty: 'Medium',
		description: 'Write SQL queries and see instant results. Perfect your query skills!',
		points: 75,
		estimatedTime: '4 min',
	},
	{
		id: 'normalization-puzzle',
		title: 'Normalization Puzzle',
		type: GAME_TYPES.PUZZLE,
		topic: 'Database Design',
		difficulty: 'Hard',
		description: 'Break down tables into normalized forms by arranging the pieces correctly.',
		points: 150,
		estimatedTime: '7 min',
	},
	{
		id: 'aggregate-functions',
		title: 'Aggregate Functions Playground',
		type: GAME_TYPES.CODE_PREVIEW,
		topic: 'COUNT, SUM, AVG, GROUP BY',
		difficulty: 'Easy',
		description: 'Practice using aggregate functions with instant feedback and visual results.',
		points: 60,
		estimatedTime: '3 min',
	},
	{
		id: 'subquery-master',
		title: 'Subquery Master',
		type: GAME_TYPES.DRAG_DROP,
		topic: 'Nested Queries',
		difficulty: 'Hard',
		description: 'Build complex nested queries by dragging subqueries into the right positions.',
		points: 200,
		estimatedTime: '10 min',
	},
];

const getGameTypeIcon = (type) => {
	switch (type) {
		case GAME_TYPES.PUZZLE:
			return Puzzle;
		case GAME_TYPES.DRAG_DROP:
			return MousePointerClick;
		case GAME_TYPES.CODE_PREVIEW:
			return Code;
		default:
			return Gamepad2;
	}
};

const getDifficultyColor = (difficulty) => {
	switch (difficulty) {
		case 'Easy':
			return 'bg-green-500/20 text-green-700 dark:text-green-400';
		case 'Medium':
			return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
		case 'Hard':
			return 'bg-red-500/20 text-red-700 dark:text-red-400';
		default:
			return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
	}
};

export default function GameLevelsPage() {
	const router = useRouter();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [gameLevels, setGameLevels] = useState(sampleGameLevels);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			if (!currentUser) {
				router.push('/login');
				return;
			}
			setUser(currentUser);
			setLoading(false);

			// TODO: Fetch game levels from Firestore
			// const levelsQuery = query(collection(db, 'gameLevel'), where('published', '==', true));
			// const levelsSnapshot = await getDocs(levelsQuery);
			// const levels = levelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			// setGameLevels(levels);
		});

		return () => unsubscribe();
	}, [router]);

	const handlePlayGame = (level) => {
		router.push(`/game-levels/${level.id}`);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading game levels...</div>
			</div>
		);
	}

	return (
		<div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="p-4 bg-primary/10 rounded-lg">
					<Gamepad2 className="h-12 w-12 text-primary" />
				</div>
				<div>
					<h1 className="text-h1 text-neutralDark mb-1">Game Levels Library</h1>
					<p className="text-body text-muted-foreground">
						Interactive, fun database learning games. Practice SQL, design, and query skills with instant feedback!
					</p>
				</div>
			</div>

			{/* Stats Bar */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="border-l-4 border-l-primary">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Games</p>
								<p className="text-2xl font-bold text-neutralDark">{gameLevels.length}</p>
							</div>
							<Sparkles className="h-8 w-8 text-primary" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Points</p>
								<p className="text-2xl font-bold text-neutralDark">
									{gameLevels.reduce((sum, level) => sum + level.points, 0)}
								</p>
							</div>
							<Trophy className="h-8 w-8 text-green-500" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Game Types</p>
								<p className="text-2xl font-bold text-neutralDark">3</p>
							</div>
							<Code className="h-8 w-8 text-blue-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Game Levels Grid */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{gameLevels.map((level) => {
					const TypeIcon = getGameTypeIcon(level.type);
					return (
						<Card
							key={level.id}
							className="border-l-4 border-l-primary/70 hover:shadow-lg transition-all duration-200 cursor-pointer group"
							onClick={() => handlePlayGame(level)}
						>
							<CardHeader>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 space-y-2">
										<div className="flex items-center gap-2">
											<TypeIcon className="h-5 w-5 text-primary" />
											<CardTitle className="text-h3 text-neutralDark group-hover:text-primary transition-colors">
												{level.title}
											</CardTitle>
										</div>
										<div className="flex items-center gap-2 flex-wrap">
											<Badge className={getDifficultyColor(level.difficulty)}>{level.difficulty}</Badge>
											<Badge variant="outline" className="text-xs">
												<Target className="h-3 w-3 mr-1" />
												{level.points} pts
											</Badge>
											<Badge variant="outline" className="text-xs">
												⏱ {level.estimatedTime}
											</Badge>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<CardDescription className="text-body text-muted-foreground">
									{level.description}
								</CardDescription>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<BookOpen className="h-4 w-4" />
									<span>{level.topic}</span>
								</div>
								<Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
									<Gamepad2 className="h-6 w-6 mr-2" />
									Play Now
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
