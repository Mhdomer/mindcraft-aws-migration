'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, Code, Lightbulb, Send, Loader2, Cpu, FileCode, Zap, Database, BookOpen, TrendingUp, Target, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

// Database recommendations (same as recommendations page)
const databaseRecommendations = [
	{
		id: 'db-normalization',
		title: 'Database Normalization',
		icon: <Database className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'Normalization is fundamental to database design. Understanding how to organize data into well-structured tables reduces redundancy and improves data integrity.',
		overview: 'Learn about the different normal forms (1NF, 2NF, 3NF, BCNF) and how to apply them to your database designs.',
		topics: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)', 'Practical examples'],
		actionPath: '/courses'
	},
	{
		id: 'sql-joins',
		title: 'Advanced SQL Joins',
		icon: <BookOpen className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'SQL joins are crucial for combining data from multiple tables. Mastering different join types allows you to write efficient queries.',
		overview: 'Deep dive into INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, and CROSS JOIN.',
		topics: ['INNER JOIN', 'LEFT/RIGHT JOIN', 'FULL OUTER JOIN', 'Self-joins', 'Join optimization'],
		actionPath: '/courses'
	},
	{
		id: 'indexing-strategies',
		title: 'Database Indexing Strategies',
		icon: <TrendingUp className="h-5 w-5 text-primary" />,
		priority: 'medium',
		why: 'Proper indexing dramatically improves query performance. Understanding when and how to create indexes is critical.',
		overview: 'Explore different types of indexes and learn when to create indexes for optimal performance.',
		topics: ['Types of indexes', 'Composite indexes', 'Index maintenance', 'Query optimization', 'Index monitoring'],
		actionPath: '/courses'
	},
	{
		id: 'transaction-management',
		title: 'Transaction Management & ACID',
		icon: <Target className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'Transactions ensure data consistency and reliability. Understanding ACID properties is essential for robust database applications.',
		overview: 'Learn about database transactions, transaction isolation levels, and locking mechanisms.',
		topics: ['ACID properties', 'Transaction isolation', 'Locking mechanisms', 'Deadlock prevention', 'Concurrency control'],
		actionPath: '/courses'
	},
];

function getPriorityColor(priority) {
	switch (priority) {
		case 'high':
			return 'border-l-error bg-error/5';
		case 'medium':
			return 'border-l-warning bg-warning/5';
		case 'low':
			return 'border-l-success bg-success/5';
		default:
			return 'border-l-primary bg-primary/5';
	}
}

function getPriorityBadge(priority) {
	switch (priority) {
		case 'high':
			return <span className="px-2 py-1 rounded-full text-caption font-medium bg-error/10 text-error">High Priority</span>;
		case 'medium':
			return <span className="px-2 py-1 rounded-full text-caption font-medium bg-warning/10 text-warning">Medium Priority</span>;
		case 'low':
			return <span className="px-2 py-1 rounded-full text-caption font-medium bg-success/10 text-success">Low Priority</span>;
		default:
			return null;
	}
}

// Simple markdown to HTML converter
function markdownToHtml(text) {
	if (!text) return '';

	let html = text;

	// Code blocks (must be first to avoid processing content inside)
	html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre class="bg-black/10 dark:bg-white/10 p-3 rounded mb-2 overflow-x-auto text-sm font-mono whitespace-pre"><code>$2</code></pre>');

	// Inline code
	html = html.replace(/`([^`\n]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>');

	// Bold
	html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-neutralDark dark:text-white">$1</strong>');

	// Headers
	html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mb-1 mt-2 first:mt-0 text-neutralDark dark:text-white">$1</h3>');
	html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2 mt-3 first:mt-0 text-neutralDark dark:text-white">$1</h2>');
	html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-2 mt-3 first:mt-0 text-neutralDark dark:text-white">$1</h1>');

	// Bullet lists
	html = html.replace(/^\* (.+)$/gim, '<li class="ml-1">$1</li>');
	html = html.replace(/(<li[^>]*>.*?<\/li>)/gs, '<ul class="list-disc list-inside mb-2 space-y-1 ml-2">$1</ul>');

	// Paragraphs
	const paragraphs = html.split(/\n\n+/);
	html = paragraphs
		.map(para => {
			const trimmed = para.trim();
			if (!trimmed) return '';
			if (trimmed.startsWith('<')) return trimmed;
			return `<p class="mb-2 last:mb-0 leading-relaxed">${trimmed}</p>`;
		})
		.join('');

	return html;
}

// Mini Coding Help Component
function MiniCodingHelp({ language }) {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [loadingState, setLoadingState] = useState('');
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	const loadingStates = [
		{ text: language === 'bm' ? 'Menganalisis kod...' : 'Analyzing code...', icon: FileCode },
		{ text: language === 'bm' ? 'Menyusun...' : 'Compiling...', icon: Cpu },
		{ text: language === 'bm' ? 'Memproses logik...' : 'Processing logic...', icon: Zap },
		{ text: language === 'bm' ? 'Mencari penyelesaian...' : 'Finding solution...', icon: Brain },
	];

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	useEffect(() => {
		if (loading) {
			let stateIndex = 0;
			const interval = setInterval(() => {
				setLoadingState(loadingStates[stateIndex].text);
				stateIndex = (stateIndex + 1) % loadingStates.length;
			}, 1500);
			return () => clearInterval(interval);
		} else {
			setLoadingState('');
		}
	}, [loading, language]);

	async function handleSend() {
		if (!input.trim() || loading) return;

		const userMessage = {
			id: Date.now(),
			role: 'user',
			content: input.trim(),
			timestamp: new Date()
		};

		setMessages(prev => [...prev, userMessage]);
		setInput('');
		setLoading(true);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'coding_help',
					input: userMessage.content,
					language: language,
					options: { conversationHistory: messages }
				}),
			});

			const data = await response.json();

			if (data.error) throw new Error(data.error);

			const fullText = data.response || '';
			const messageId = Date.now() + 1;

			// Add placeholder assistant message
			setMessages(prev => [
				...prev,
				{
					id: messageId,
					role: 'assistant',
					content: '',
					timestamp: new Date()
				}
			]);

			// Simulate streaming (~1s per 50 words)
			const wordCount = fullText.split(/\\s+/).filter(Boolean).length || 1;
			const totalDurationMs = Math.max(700, (wordCount / 50) * 1000);
			const charCount = Math.max(1, fullText.length);
			const intervalMs = Math.max(15, totalDurationMs / charCount);

			let index = 0;
			const interval = setInterval(() => {
				index += 1;
				const partial = fullText.slice(0, index);
				setMessages(prev =>
					prev.map(msg =>
						msg.id === messageId ? { ...msg, content: partial } : msg
					)
				);
				if (index >= charCount) {
					clearInterval(interval);
				}
			}, intervalMs);
		} catch (err) {
			console.error('Error getting AI response:', err);
			const errorMessage = {
				id: Date.now() + 1,
				role: 'assistant',
				content: language === 'bm'
					? 'Maaf, saya menghadapi ralat. Sila cuba lagi.'
					: 'Sorry, I encountered an error. Please try again.',
				timestamp: new Date()
			};
			setMessages(prev => [...prev, errorMessage]);
		} finally {
			setLoading(false);
			inputRef.current?.focus();
		}
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="flex-shrink-0 pb-2">
				<div className="flex items-center gap-2">
					<Code className="h-6 w-6 text-blue-600" />
					<CardTitle className="text-h3 text-neutralDark">
						{language === 'bm' ? 'Bantuan Pengaturcaraan' : 'Coding Help'}
					</CardTitle>
				</div>
				<CardDescription className="text-xs">
					{language === 'bm' ? 'Bantuan teknikal untuk kod dan debug' : 'Technical help for code and debugging'}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col p-0 min-h-0">
				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
					{messages.length === 0 ? (
						<div className="flex items-center justify-center h-full text-center">
							<div className="space-y-2">
								<div className="text-muted-foreground text-sm font-medium mb-3">
									{language === 'bm' ? 'Selamat datang! Bagaimana saya boleh membantu?' : 'Welcome! How can I help you?'}
								</div>
								<div className="text-xs text-muted-foreground space-y-1">
									<div>{language === 'bm' ? 'Cuba tanya:' : 'Try asking:'}</div>
									<div className="text-left space-y-1 mt-2">
										<div className="bg-neutralLight p-2 rounded text-xs">• {language === 'bm' ? 'Kenapa gelung saya tidak berfungsi?' : 'Why is my loop not working?'}</div>
										<div className="bg-neutralLight p-2 rounded text-xs">• {language === 'bm' ? 'Bantu saya debug ralat ini' : 'Help me debug this error'}</div>
										<div className="bg-neutralLight p-2 rounded text-xs">• {language === 'bm' ? 'Terangkan bagaimana fungsi berfungsi' : 'Explain how functions work'}</div>
									</div>
								</div>
							</div>
						</div>
					) : (
						<>
							{messages.map((message) => (
								<div
									key={message.id}
									className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
								>
									<div
										className={`max-w-[85%] rounded-lg p-2.5 text-sm ${message.role === 'user'
											? 'bg-primary text-white'
											: 'bg-neutralLight border border-border'
											}`}
									>
										{message.role === 'assistant' ? (
											<div
												className="prose prose-sm max-w-none dark:prose-invert"
												dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
											/>
										) : (
											<div className="whitespace-pre-wrap">{message.content}</div>
										)}
									</div>
								</div>
							))}
							{loading && (
								<div className="flex justify-start">
									<div className="bg-neutralLight border border-border rounded-lg p-3">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span>{loadingState || (language === 'bm' ? 'Memproses...' : 'Processing...')}</span>
										</div>
									</div>
								</div>
							)}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>

				{/* Input Area */}
				<div className="border-t p-3 flex-shrink-0">
					<div className="flex gap-2">
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder={language === 'bm' ? 'Tanya soalan kod...' : 'Ask coding question...'}
							className="flex-1 min-h-[30px] max-h-[50px] px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
							disabled={loading}
						/>
						<Button
							onClick={handleSend}
							disabled={!input.trim() || loading}
							className="self-end"
							size="default"
						>
							{loading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Send className="h-5 w-5" />
							)}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Mini Explain Concept Component
function MiniExplainConcept({ language }) {
	const [concept, setConcept] = useState('');
	const [explanation, setExplanation] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadingState, setLoadingState] = useState('');
	const explanationRef = useRef(null);

	const loadingStates = [
		{ text: language === 'bm' ? 'Menganalisis konsep...' : 'Analyzing concept...', icon: Brain },
		{ text: language === 'bm' ? 'Mencari penjelasan...' : 'Finding explanation...', icon: Lightbulb },
		{ text: language === 'bm' ? 'Menyusun maklumat...' : 'Organizing information...', icon: FileCode },
	];

	useEffect(() => {
		if (loading) {
			let stateIndex = 0;
			const interval = setInterval(() => {
				setLoadingState(loadingStates[stateIndex].text);
				stateIndex = (stateIndex + 1) % loadingStates.length;
			}, 1500);
			return () => clearInterval(interval);
		} else {
			setLoadingState('');
		}
	}, [loading, language]);

	useEffect(() => {
		if (explanation) {
			explanationRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [explanation]);

	async function handleExplain() {
		if (!concept.trim() || loading) return;

		setLoading(true);
		setExplanation(null);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'explain_concept',
					input: concept.trim(),
					language: language,
				}),
			});

			const data = await response.json();

			if (data.error) throw new Error(data.error);

			const fullText = data.explanation || data.response || data;

			// Simulate streaming (~1s per 50 words) into a single text blob
			const asString = typeof fullText === 'string' ? fullText : String(fullText || '');
			const wordCount = asString.split(/\\s+/).filter(Boolean).length || 1;
			const totalDurationMs = Math.max(700, (wordCount / 50) * 1000);
			const charCount = Math.max(1, asString.length);
			const intervalMs = Math.max(15, totalDurationMs / charCount);

			let index = 0;
			const interval = setInterval(() => {
				index += 1;
				const partial = asString.slice(0, index);
				setExplanation(partial);
				if (index >= charCount) {
					clearInterval(interval);
				}
			}, intervalMs);
		} catch (err) {
			console.error('Error getting explanation:', err);
			setExplanation(language === 'bm'
				? 'Maaf, saya menghadapi ralat. Sila cuba lagi.'
				: 'Sorry, I encountered an error. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleExplain();
		}
	}

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="flex-shrink-0 pb-2">
				<div className="flex items-center gap-2">
					<Lightbulb className="h-6 w-6 text-yellow-600" />
					<CardTitle className="text-h3 text-neutralDark">
						{language === 'bm' ? 'Terangkan Konsep' : 'Explain Concept'}
					</CardTitle>
				</div>
				<CardDescription className="text-xs">
					{language === 'bm' ? 'Penjelasan teori dan konsep' : 'Theory and concept explanations'}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col p-0 min-h-0">
				{/* Explanation Area */}
				<div className="flex-1 overflow-y-auto p-4 min-h-0">
					{loading ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center">
								<Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
								<p className="text-sm text-muted-foreground">{loadingState || (language === 'bm' ? 'Memproses...' : 'Processing...')}</p>
							</div>
						</div>
					) : explanation ? (
						<div
							ref={explanationRef}
							className="prose prose-sm max-w-none dark:prose-invert"
							dangerouslySetInnerHTML={{ __html: markdownToHtml(explanation) }}
						/>
					) : (
						<div className="flex items-center justify-center h-full text-center">
							<div className="space-y-2">
								<div className="text-muted-foreground text-sm font-medium mb-3">
									{language === 'bm' ? 'Selamat datang! Apa yang anda ingin fahami?' : 'Welcome! What would you like to understand?'}
								</div>
								<div className="text-xs text-muted-foreground space-y-1">
									<div>{language === 'bm' ? 'Cuba tanya:' : 'Try asking:'}</div>
									<div className="text-left space-y-1 mt-2">
										<div className="bg-neutralLight p-2 rounded text-xs">• {language === 'bm' ? 'Apa itu database?' : 'What is a database?'}</div>
										<div className="bg-neutralLight p-2 rounded text-xs">• {language === 'bm' ? 'Terangkan konsep OOP' : 'Explain OOP concepts'}</div>
										<div className="bg-neutralLight p-2 rounded text-xs">• {language === 'bm' ? 'Bagaimana fungsi berfungsi?' : 'How do functions work?'}</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Input Area */}
				<div className="border-t p-2 flex-shrink-0">
					<div className="flex gap-2">
						<input
							type="text"
							value={concept}
							onChange={(e) => setConcept(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder={language === 'bm' ? 'Masukkan konsep...' : 'Enter concept...'}
							className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							disabled={loading}
						/>
						<Button
							onClick={handleExplain}
							disabled={!concept.trim() || loading}
							size="default"
						>
							{loading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Send className="h-5 w-5" />
							)}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function AIDashboardPage() {
	const router = useRouter();
	const { language } = useLanguage();
	const [userId, setUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [expandedRecommendationId, setExpandedRecommendationId] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const { db } = await import('@/firebase');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'student' && role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="max-w-7xl mx-auto min-h-screen relative z-10 animate-fadeIn -mt-[30px]">
				<div className="mb-4">
					<Link href="/dashboard/student">
						<Button
							variant="ghost"
							className="mb-0.5 flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-transparent hover:bg-neutralLight/60 hover:border-2 hover:border-primary/50 border-2 border-transparent transition-all duration-300 ease-in-out"
						>
							<ArrowLeft className="h-5 w-5" />
							<span>{language === 'bm' ? 'Kembali ke Dashboard' : 'Back to Dashboard'}</span>
						</Button>
					</Link>
					<div className="flex items-center gap-3 mb-2 -mt-[10px]">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Brain className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h1 className="text-h2 text-neutralDark">
								{language === 'bm' ? 'Pembantu AI' : 'AI Assistant'}
							</h1>
							<p className="text-sm text-muted-foreground">
								{language === 'bm'
									? 'Akses semua alat bantuan AI untuk pembelajaran anda'
									: 'Access all AI assistance tools for your learning'}
							</p>
						</div>
					</div>
				</div>

				{/* Upper Section: Mini Coding Help and Explain Concept */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
					<div className="h-[360px]">
						<MiniCodingHelp language={language} />
					</div>
					<div className="h-[360px]">
						<MiniExplainConcept language={language} />
					</div>
				</div>

				{/* Lower Section: Learning Recommendations */}
				<div className="w-full pb-8 space-y-5 scale-[0.95] origin-top-left">
					<div>
						<h2 className="text-h3 text-neutralDark mb-2">
							{language === 'bm' ? 'Cadangan Pembelajaran' : 'Learning Recommendations'}
						</h2>
						<p className="text-body text-muted-foreground">
							{language === 'bm'
								? 'Cadangan peribadi untuk meningkatkan pengetahuan dan kemahiran database anda'
								: 'Personalized suggestions to enhance your database knowledge and skills'}
						</p>
					</div>

					<div className="flex flex-col md:flex-row gap-6">
						{/* Left Column */}
						<div className="flex flex-col gap-6 flex-1">
							{databaseRecommendations.filter((_, index) => index % 2 === 0).map((recommendation) => {
								const isExpanded = expandedRecommendationId === recommendation.id;

								return (
									<Card
										key={recommendation.id}
										className={`border-l-4 ${getPriorityColor(recommendation.priority)} transition-all duration-200 hover:shadow-lg`}
									>
										<CardHeader>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-start gap-3 flex-1">
													<div className="p-2 bg-primary/10 rounded-lg">
														{recommendation.icon}
													</div>
													<div className="flex-1">
														<CardTitle className="text-h3 mb-2">{recommendation.title}</CardTitle>
														{getPriorityBadge(recommendation.priority)}
													</div>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.preventDefault();
														const currentScroll = window.scrollY;
														setExpandedRecommendationId(isExpanded ? null : recommendation.id);
														// Restore scroll position after state update
														setTimeout(() => {
															window.scrollTo({ top: currentScroll, behavior: 'auto' });
														}, 0);
													}}
													className="flex-shrink-0"
												>
													{isExpanded ? (
														<ChevronUp className="h-5 w-5" />
													) : (
														<ChevronDown className="h-5 w-5" />
													)}
												</Button>
											</div>
										</CardHeader>

										<CardContent
											className={`pt-0 overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[420px] opacity-100 mt-2' : 'max-h-0 opacity-0'
												}`}
										>
											<div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
												<div className="p-4 bg-neutralLight rounded-lg border border-border">
													<h3 className="text-body font-semibold text-neutralDark mb-2 flex items-center gap-2">
														<Lightbulb className="h-4 w-4 text-primary" />
														{language === 'bm' ? 'Mengapa Ini Penting' : 'Why This Matters'}
													</h3>
													<p className="text-caption text-muted-foreground leading-relaxed">
														{recommendation.why}
													</p>
												</div>

												<div className="p-4 bg-neutralLight rounded-lg border border-border">
													<h3 className="text-body font-semibold text-neutralDark mb-2 flex items-center gap-2">
														<BookOpen className="h-4 w-4 text-primary" />
														{language === 'bm' ? 'Gambaran Keseluruhan' : 'Overview'}
													</h3>
													<p className="text-caption text-muted-foreground leading-relaxed mb-3">
														{recommendation.overview}
													</p>
												</div>

												<div className="p-4 bg-neutralLight rounded-lg border border-border">
													<h3 className="text-body font-semibold text-neutralDark mb-3 flex items-center gap-2">
														<Target className="h-4 w-4 text-primary" />
														{language === 'bm' ? 'Apa Yang Akan Anda Pelajari' : 'What You\'ll Learn'}
													</h3>
													<ul className="space-y-2">
														{recommendation.topics.map((topic, index) => (
															<li key={index} className="flex items-start gap-2 text-caption text-muted-foreground">
																<span className="text-primary mt-1">•</span>
																<span>{topic}</span>
															</li>
														))}
													</ul>
												</div>

												<Button
													onClick={() => router.push(recommendation.actionPath)}
													className="w-full"
												>
													{language === 'bm' ? 'Terokai Kursus Berkaitan' : 'Explore Related Courses'}
												</Button>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>

						{/* Right Column */}
						<div className="flex flex-col gap-6 flex-1">
							{databaseRecommendations.filter((_, index) => index % 2 === 1).map((recommendation) => {
								const isExpanded = expandedRecommendationId === recommendation.id;

								return (
									<Card
										key={recommendation.id}
										className={`border-l-4 ${getPriorityColor(recommendation.priority)} transition-all duration-200 hover:shadow-lg`}
									>
										<CardHeader>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-start gap-3 flex-1">
													<div className="p-2 bg-primary/10 rounded-lg">
														{recommendation.icon}
													</div>
													<div className="flex-1">
														<CardTitle className="text-h3 mb-2">{recommendation.title}</CardTitle>
														{getPriorityBadge(recommendation.priority)}
													</div>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.preventDefault();
														const currentScroll = window.scrollY;
														setExpandedRecommendationId(isExpanded ? null : recommendation.id);
														// Restore scroll position after state update
														setTimeout(() => {
															window.scrollTo({ top: currentScroll, behavior: 'auto' });
														}, 0);
													}}
													className="flex-shrink-0"
												>
													{isExpanded ? (
														<ChevronUp className="h-5 w-5" />
													) : (
														<ChevronDown className="h-5 w-5" />
													)}
												</Button>
											</div>
										</CardHeader>

										<CardContent
											className={`pt-0 overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[420px] opacity-100 mt-2' : 'max-h-0 opacity-0'
												}`}
										>
											<div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
												<div className="p-4 bg-neutralLight rounded-lg border border-border">
													<h3 className="text-body font-semibold text-neutralDark mb-2 flex items-center gap-2">
														<Lightbulb className="h-4 w-4 text-primary" />
														{language === 'bm' ? 'Mengapa Ini Penting' : 'Why This Matters'}
													</h3>
													<p className="text-caption text-muted-foreground leading-relaxed">
														{recommendation.why}
													</p>
												</div>

												<div className="p-4 bg-neutralLight rounded-lg border border-border">
													<h3 className="text-body font-semibold text-neutralDark mb-2 flex items-center gap-2">
														<BookOpen className="h-4 w-4 text-primary" />
														{language === 'bm' ? 'Gambaran Keseluruhan' : 'Overview'}
													</h3>
													<p className="text-caption text-muted-foreground leading-relaxed mb-3">
														{recommendation.overview}
													</p>
												</div>

												<div className="p-4 bg-neutralLight rounded-lg border border-border">
													<h3 className="text-body font-semibold text-neutralDark mb-3 flex items-center gap-2">
														<Target className="h-4 w-4 text-primary" />
														{language === 'bm' ? 'Apa Yang Akan Anda Pelajari' : 'What You\'ll Learn'}
													</h3>
													<ul className="space-y-2">
														{recommendation.topics.map((topic, index) => (
															<li key={index} className="flex items-start gap-2 text-caption text-muted-foreground">
																<span className="text-primary mt-1">•</span>
																<span>{topic}</span>
															</li>
														))}
													</ul>
												</div>

												<Button
													onClick={() => router.push(recommendation.actionPath)}
													className="w-full"
												>
													{language === 'bm' ? 'Terokai Kursus Berkaitan' : 'Explore Related Courses'}
												</Button>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
