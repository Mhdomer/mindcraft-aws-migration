'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Gamepad2, Target, BookOpen, Puzzle, MousePointerClick, Code, Sparkles, Trophy, Edit, Trash2, Plus } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

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
	const { language } = useLanguage();
	const { userData, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [gameLevels, setGameLevels] = useState(sampleGameLevels);
	const [deletingId, setDeletingId] = useState(null);

	const tooltips = {
		en: {
			playNow: 'Click to start this interactive learning game',
		},
		bm: {
			playNow: 'Klik untuk memulakan permainan pembelajaran interaktif ini',
		},
	};
	const t = tooltips[language] || tooltips.en;

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }

		api.get('/api/game-levels').then(data => {
			const apiLevels = (data.levels || []).map(l => ({ ...l, id: l._id?.toString() || l.id }));
			// Merge: API levels take precedence over sample data
			const levelsMap = new Map();
			sampleGameLevels.forEach(l => levelsMap.set(l.id, l));
			apiLevels.forEach(l => levelsMap.set(l.id, l));
			setGameLevels(Array.from(levelsMap.values()));
		}).catch(() => {
			setGameLevels(sampleGameLevels);
		}).finally(() => setLoading(false));
	}, [authLoading, userData, router]);

	const handlePlayGame = (level) => {
		router.push(`/game-levels/${level.id}`);
	};

	const handleEdit = (e, level) => {
		e.stopPropagation();
		router.push(`/game-levels/${level.id}/edit`);
	};

	const handleDelete = async (e, level) => {
		e.stopPropagation();

		// Only allow deletion of DB levels (not sample levels)
		if (!level.createdBy) {
			alert('Cannot delete sample game levels. Only levels created by teachers can be deleted.');
			return;
		}

		if (!confirm(`Are you sure you want to delete "${level.title}"? This action cannot be undone.`)) {
			return;
		}

		setDeletingId(level.id);
		try {
			await api.delete(`/api/game-levels/${level.id}`);
			setGameLevels(gameLevels.filter((l) => l.id !== level.id));
		} catch (error) {
			console.error('Error deleting game level:', error);
			alert('Failed to delete game level: ' + (error.message || 'Unknown error'));
		} finally {
			setDeletingId(null);
		}
	};

	const canEdit = (level) => {
		if (userData?.role !== 'admin' && userData?.role !== 'teacher') return false;
		if (userData?.role === 'admin') return true;
		return level.createdBy === userData?._id?.toString();
	};

	const canDelete = (level) => {
		if (userData?.role !== 'admin' && userData?.role !== 'teacher') return false;
		if (!level.createdBy) return false;
		if (userData?.role === 'admin') return true;
		return level.createdBy === userData?._id?.toString();
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
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3 flex-1">
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
				{(userData?.role === 'teacher' || userData?.role === 'admin') && (
					<Button onClick={() => router.push('/game-levels/new')} className="flex items-center gap-2">
						<Plus className="h-5 w-5" />
						Create New
					</Button>
				)}
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
							<Sparkles className="h-10 w-10 text-primary" />
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
							<Trophy className="h-10 w-10 text-green-500" />
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
							<Code className="h-10 w-10 text-blue-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Game Levels Grid */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{gameLevels.map((level) => {
					const TypeIcon = getGameTypeIcon(level.type);
					const showEdit = canEdit(level);
					const showDelete = canDelete(level);
					return (
						<Card
							key={level.id}
							className="border-l-4 border-l-primary/70 hover:shadow-lg transition-all duration-200 cursor-pointer group relative"
							onClick={() => handlePlayGame(level)}
						>
							{/* Edit/Delete buttons for teachers */}
							{(showEdit || showDelete) && (
								<div className="absolute top-3 right-3 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
									{showEdit && (
										<Button
											variant="ghost"
											onClick={(e) => handleEdit(e, level)}
											className="h-10 w-10 p-0 bg-white/90 hover:bg-white shadow-md border border-border/50"
											title="Edit"
										>
											<Edit className="h-5 w-5" />
										</Button>
									)}
									{showDelete && (
										<Button
											variant="ghost"
											onClick={(e) => handleDelete(e, level)}
											disabled={deletingId === level.id}
											className="h-10 w-10 p-0 bg-white/90 hover:bg-red-50 hover:text-red-600 shadow-md border border-border/50"
											title="Delete"
										>
											<Trash2 className="h-5 w-5" />
										</Button>
									)}
								</div>
							)}
							<CardHeader>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 space-y-2">
										<div className="flex items-center gap-2">
											<TypeIcon className="h-6 w-6 text-primary" />
											<CardTitle className="text-h3 text-neutralDark group-hover:text-primary transition-colors">
												{level.title}
											</CardTitle>
										</div>
										<div className="flex items-center gap-2 flex-wrap">
											<Badge className={getDifficultyColor(level.difficulty)}>{level.difficulty}</Badge>
											<Badge variant="outline" className="text-xs">
												<Target className="h-4 w-4 mr-1" />
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
									<BookOpen className="h-5 w-5" />
									<span>{level.topic}</span>
								</div>
								<Tooltip content={t.playNow}>
									<Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
										<Gamepad2 className="h-6 w-6 mr-2" />
										Play Now
									</Button>
								</Tooltip>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
