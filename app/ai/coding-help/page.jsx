'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, Code, MessageSquare, Database } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

// Enhanced markdown to HTML converter
function markdownToHtml(text) {
	if (!text) return '';
	
	let html = text;
	
	// Code blocks (must be first to avoid processing content inside)
	html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
		return `<pre class="bg-black/10 dark:bg-white/10 p-3 rounded mb-2 overflow-x-auto text-sm font-mono whitespace-pre"><code>${code.trim()}</code></pre>`;
	});
	
	// Inline code (but not inside code blocks - process after code blocks)
	html = html.replace(/`([^`\n]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>');
	
	// Bold text - handle **text** format (non-greedy to handle multiple instances)
	html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="font-semibold text-neutralDark dark:text-white">$1</strong>');
	// Also handle single asterisk italic (but not if it's part of **)
	html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="italic">$1</em>');
	
	// Headers - match at start of line (with optional leading whitespace)
	html = html.replace(/^(\s*)### (.*)$/gim, '<h3 class="text-base font-semibold mb-1 mt-2 first:mt-0 text-neutralDark dark:text-white">$2</h3>');
	html = html.replace(/^(\s*)## (.*)$/gim, '<h2 class="text-lg font-semibold mb-2 mt-3 first:mt-0 text-neutralDark dark:text-white">$2</h2>');
	html = html.replace(/^(\s*)# (.*)$/gim, '<h1 class="text-xl font-bold mb-2 mt-3 first:mt-0 text-neutralDark dark:text-white">$2</h1>');
	
	// Numbered lists (1., 2., etc.) - must come before bullet lists
	html = html.replace(/^(\s*)\d+\. (.+)$/gim, '<li class="ml-1">$2</li>');
	
	// Bullet lists (* or -)
	html = html.replace(/^(\s*)[\*\-] (.+)$/gim, '<li class="ml-1">$2</li>');
	
	// Wrap consecutive list items in <ul> or <ol>
	html = html.replace(/(<li[^>]*>.*?<\/li>)(?:\s*<li[^>]*>.*?<\/li>)*/gs, (match) => {
		// Check if it starts with a number pattern to determine if it's ordered
		const firstItem = match.match(/<li[^>]*>(.*?)<\/li>/);
		if (firstItem && /^\d+\./.test(firstItem[1])) {
			return `<ol class="list-decimal list-inside mb-2 space-y-1 ml-4">${match}</ol>`;
		}
		return `<ul class="list-disc list-inside mb-2 space-y-1 ml-4">${match}</ul>`;
	});
	
	// Split into paragraphs (by double newlines), but preserve HTML tags
	const lines = html.split('\n');
	const processedLines = [];
	let currentParagraph = [];
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		
		// If line is empty, end current paragraph
		if (!line) {
			if (currentParagraph.length > 0) {
				const paraText = currentParagraph.join(' ');
				if (!paraText.startsWith('<')) {
					processedLines.push(`<p class="mb-2 leading-relaxed">${paraText}</p>`);
				} else {
					processedLines.push(paraText);
				}
				currentParagraph = [];
			}
			continue;
		}
		
		// If line is already HTML (starts with <), add it directly
		if (line.startsWith('<')) {
			if (currentParagraph.length > 0) {
				const paraText = currentParagraph.join(' ');
				if (!paraText.startsWith('<')) {
					processedLines.push(`<p class="mb-2 leading-relaxed">${paraText}</p>`);
				} else {
					processedLines.push(paraText);
				}
				currentParagraph = [];
			}
			processedLines.push(line);
			continue;
		}
		
		// Otherwise, add to current paragraph
		currentParagraph.push(line);
	}
	
	// Handle remaining paragraph
	if (currentParagraph.length > 0) {
		const paraText = currentParagraph.join(' ');
		if (!paraText.startsWith('<')) {
			processedLines.push(`<p class="mb-2 leading-relaxed">${paraText}</p>`);
		} else {
			processedLines.push(paraText);
		}
	}
	
	return processedLines.join('\n');
}

export default function CodingHelpPage() {
	const router = useRouter();
	const { language } = useLanguage();
	const { userData, loading: authLoading } = useAuth();
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [loadingState, setLoadingState] = useState('');
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	const loadingStates = [
		{ text: language === 'bm' ? 'Menganalisis kod...' : 'Analyzing code...' },
		{ text: language === 'bm' ? 'Menyusun...' : 'Compiling...' },
		{ text: language === 'bm' ? 'Memproses logik...' : 'Processing logic...' },
		{ text: language === 'bm' ? 'Mencari penyelesaian...' : 'Finding solution...' },
	];

	useEffect(() => {
		if (authLoading) return;
		if (!userData) router.push('/login');
	}, [authLoading, userData, router]);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Rotate friendly loading state text while waiting for AI
	useEffect(() => {
		if (loading) {
			let stateIndex = 0;
			setLoadingState(loadingStates[0].text);
			const interval = setInterval(() => {
				stateIndex = (stateIndex + 1) % loadingStates.length;
				setLoadingState(loadingStates[stateIndex].text);
			}, 1500);
			return () => clearInterval(interval);
		} else {
			setLoadingState('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'coding_help',
					input: userMessage.content,
					language: language,
					options: {
						conversationHistory: messages
					}
				}),
			});

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			const fullText = data.response || '';
			const messageId = Date.now() + 1;

			// Add empty assistant message first
			setMessages(prev => [
				...prev,
				{
					id: messageId,
					role: 'assistant',
					content: '',
					suggestions: data.suggestions || [],
					timestamp: new Date()
				}
			]);

			// Simulate streaming: ~1s per 50 words
			const wordCount = fullText.split(/\s+/).filter(Boolean).length || 1;
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
					? 'Maaf, saya menghadapi ralat. Sila cuba lagi atau semula soalan anda.'
					: 'Sorry, I encountered an error. Please try again or rephrase your question.',
				timestamp: new Date()
			};
			setMessages(prev => [...prev, errorMessage]);
		} finally {
			setLoading(false);
			inputRef.current?.focus();
		}
	}

	function handleSuggestionClick(suggestion) {
		setInput(suggestion);
		inputRef.current?.focus();
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	return (
		<div className="max-w-4xl mx-auto bg-neutralLight/20 rounded-2xl p-6 -mt-[50px]">
			<div className="mb-6">
				<Link href="/dashboard/student">
					<Button
						variant="ghost"
						className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-transparent hover:bg-neutralLight/60 hover:border-2 hover:border-primary/50 border-2 border-transparent transition-all duration-300 ease-in-out"
					>
						<ArrowLeft className="h-5 w-5" />
						<span>Back to Dashboard</span>
					</Button>
				</Link>
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-primary/10 rounded-lg">
						<Database className="h-6 w-6 text-primary" />
					</div>
					<div>
						<h1 className="text-h2 text-neutralDark">
							{language === 'bm' ? 'Bantuan Pengaturcaraan Pangkalan Data' : 'Database Coding Help'}
						</h1>
						<p className="text-sm text-muted-foreground">
							{language === 'bm' 
								? 'Dapatkan bantuan AI untuk pertanyaan SQL, reka bentuk pangkalan data, debug, dan konsep pengaturcaraan yang berkaitan dengan pangkalan data'
								: 'Get AI assistance with SQL queries, database design, debugging, and programming concepts that support your database work'}
						</p>
					</div>
				</div>
			</div>

			<Card className="h-[600px] flex flex-col overflow-hidden bg-neutral-200/90 backdrop-blur-sm border border-border/80">
				<CardHeader className="border-b flex-shrink-0 py-3 bg-neutral-200/90">
					<CardTitle className="flex items-center gap-2 text-sm">
						<MessageSquare className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
						{language === 'bm' ? 'Berbual dengan Pembantu AI Pangkalan Data' : 'Chat with Database AI Assistant'}
					</CardTitle>
					<CardDescription className="text-xs mt-1">
						{language === 'bm' 
							? 'Tanya soalan tentang SQL, reka bentuk jadual, normalisasi, indeks, atau kod yang berinteraksi dengan pangkalan data. Mesej sebelumnya dikekalkan.'
							: 'Ask questions about SQL, table design, normalization, indexing, or code that interacts with databases. Previous messages are retained.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-neutral-200/90">
					{/* Messages Area */}
					<div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-neutral-200/90">
						{messages.length === 0 ? (
							<div className="flex items-center justify-center h-full">
								<div className="text-center max-w-md">
									<Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-lg font-semibold text-neutralDark mb-2">
										{language === 'bm' ? 'Mulakan Perbualan' : 'Start a Conversation'}
									</h3>
									<p className="text-sm text-muted-foreground mb-4">
										{language === 'bm' 
											? 'Tampal pertanyaan SQL anda, terangkan ralat pangkalan data, atau tanya tentang konsep pangkalan data dan pengaturcaraan berkaitan. Saya di sini untuk membantu!'
											: 'Paste your SQL query, describe a database error, or ask about database concepts and related programming. I\'m here to help!'}
									</p>
									<div className="space-y-2 text-left">
										<p className="text-xs text-muted-foreground">
											{language === 'bm' ? 'Cuba tanya:' : 'Try asking:'}
										</p>
										<ul className="text-caption text-muted-foreground space-y-1 list-disc list-inside">
											{language === 'bm' ? (
												<>
													<li>"Kenapa pertanyaan SELECT saya perlahan?"</li>
													<li>"Bantu saya debug ralat JOIN ini"</li>
													<li>"Terangkan normalisasi pangkalan data"</li>
												</>
											) : (
												<>
													<li>"Why is my SELECT query so slow?"</li>
													<li>"Help me fix this SQL JOIN error"</li>
													<li>"Explain database normalization"</li>
												</>
											)}
										</ul>
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
											className={`max-w-[80%] rounded-lg p-4 ${
												message.role === 'user'
													? 'bg-primary text-white'
													: 'bg-neutral-300/90 border border-border/60'
											}`}
										>
											{message.role === 'assistant' ? (
												<div 
													className="text-body prose prose-sm max-w-none dark:prose-invert"
													dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
												/>
											) : (
												<div className="text-body whitespace-pre-wrap">{message.content}</div>
											)}
											{message.suggestions && message.suggestions.length > 0 && (
												<div className="mt-3 pt-3 border-t border-border/50">
													<p className="text-caption text-muted-foreground mb-2">Suggestions:</p>
													<div className="flex flex-wrap gap-2">
														{message.suggestions.map((suggestion, idx) => (
															<Button
																key={idx}
																variant="outline"
																size="sm"
																onClick={() => handleSuggestionClick(suggestion)}
																className="text-xs"
															>
																{suggestion}
															</Button>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								))}
								{loading && (
									<div className="flex justify-start">
										<div className="bg-neutral-300/90 border border-border/60 rounded-lg p-3">
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Loader2 className="h-4 w-4 animate-spin text-primary" />
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
					<div className="border-t p-4 flex-shrink-0 bg-neutral-200/95">
						<div className="flex gap-2">
							<textarea
								ref={inputRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder={language === 'bm' ? 'Tampal pertanyaan SQL anda atau terangkan masalah pangkalan data / kod anda...' : 'Paste your SQL query or describe your database / code issue...'}
								className="flex-1 min-h-[80px] max-h-[200px] px-4 py-3 rounded-lg border border-border/60 bg-neutral-300/90 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
								disabled={loading}
							/>
							<Button
								onClick={handleSend}
								disabled={!input.trim() || loading}
								className="self-end"
								size="lg"
							>
								{loading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<Send className="h-5 w-5" />
								)}
							</Button>
						</div>
						<p className="text-caption text-muted-foreground mt-2">
							{language === 'bm' ? 'Tekan Enter untuk hantar, Shift+Enter untuk baris baru' : 'Press Enter to send, Shift+Enter for new line'}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

