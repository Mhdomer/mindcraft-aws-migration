'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, RefreshCw, Lightbulb, BookOpen, Loader2 } from 'lucide-react';
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

export default function ExplainConceptPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { language } = useLanguage();
	const [concept, setConcept] = useState('');
	const [explanation, setExplanation] = useState(null);
	const [loading, setLoading] = useState(false);
	const [userId, setUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [regenerateCount, setRegenerateCount] = useState(0);

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

	async function runExplain(conceptText, options = { regenerate: false }) {
		const trimmed = conceptText.trim();
		if (!trimmed || loading) return;

		setLoading(true);
		setExplanation(null);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'explain_concept',
					input: trimmed,
					language: language,
					options: {
						regenerate: options.regenerate || regenerateCount > 0,
					}
				}),
			});

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			setExplanation(data);
		} catch (err) {
			console.error('Error getting explanation:', err);
			alert(language === 'bm' 
				? 'Maaf, saya menghadapi ralat. Sila cuba lagi.'
				: 'Sorry, I encountered an error. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	async function handleExplain() {
		if (!concept.trim() || loading) return;
		await runExplain(concept, { regenerate: false });
	}

	async function handleRegenerate() {
		setRegenerateCount(prev => prev + 1);
		await runExplain(concept, { regenerate: true });
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleExplain();
		}
	}

	// If a topic is provided in the query string (?topic=...), prefill and auto-run
	useEffect(() => {
		const topic = searchParams.get('topic');
		if (topic) {
			setConcept(topic);
			// Slight delay to ensure state is set before calling
			setTimeout(() => {
				runExplain(topic, { regenerate: false });
			}, 50);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, language]);

	return (
		<div className="max-w-4xl mx-auto">
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
					<div className="p-2 bg-secondary/10 rounded-lg">
						<Lightbulb className="h-6 w-6 text-secondary" />
					</div>
					<div>
						<h1 className="text-h1 text-neutralDark">
							{language === 'bm' ? 'Terangkan Konsep' : 'Explain Concept'}
						</h1>
						<p className="text-body text-muted-foreground">
							{language === 'bm' 
								? 'Minta AI untuk menerangkan mana-mana subjek akademik atau konsep dengan cara yang jelas dan membantu'
								: 'Ask AI to explain any academic subject or concept in a clear and helpful way'}
						</p>
					</div>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						{language === 'bm' ? 'Apa yang anda ingin fahami?' : 'What would you like to understand?'}
					</CardTitle>
					<CardDescription>
						{language === 'bm' 
							? 'Taipkan mana-mana konsep, kata kunci, atau subjek akademik. AI akan memberikan penjelasan yang jelas.'
							: 'Type in any concept, keyword, or academic subject. AI will provide a clear explanation.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Input Section */}
					<div>
						<label htmlFor="concept" className="block text-sm font-medium mb-2">
							{language === 'bm' ? 'Konsep atau Kata Kunci' : 'Concept or Keyword'}
						</label>
						<div className="flex gap-2">
							<input
								id="concept"
								type="text"
								value={concept}
								onChange={(e) => setConcept(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder={language === 'bm' ? 'cth., pembolehubah, fungsi, gelung, array, objek...' : 'e.g., variables, functions, loops, arrays, objects...'}
								className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								disabled={loading}
							/>
							<Button
								onClick={handleExplain}
								disabled={!concept.trim() || loading}
								size="lg"
							>
								{loading ? (
									<>
										<Loader2 className="h-5 w-5 mr-2 animate-spin" />
										{language === 'bm' ? 'Menerangkan...' : 'Explaining...'}
									</>
								) : (
									<>
										<Sparkles className="h-5 w-5 mr-2" />
										{language === 'bm' ? 'Terangkan' : 'Explain'}
									</>
								)}
							</Button>
						</div>
						<p className="text-caption text-muted-foreground mt-2">
							{language === 'bm' ? 'Tekan Enter untuk dapatkan penjelasan' : 'Press Enter to get explanation'}
						</p>
					</div>

					{/* Explanation Display */}
					{loading && (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					)}

					{explanation && !loading && (
						<div className="space-y-4">
							<div className="border-t pt-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-h3 text-neutralDark">
										{language === 'bm' ? 'Penjelasan' : 'Explanation'}
									</h3>
									<Button
										variant="outline"
										size="sm"
										onClick={handleRegenerate}
										disabled={loading}
									>
										<RefreshCw className="h-4 w-4 mr-2" />
										{language === 'bm' ? 'Jana Semula' : 'Regenerate'}
									</Button>
								</div>
								<div className="prose max-w-none">
									<div className="bg-neutralLight border border-border rounded-lg p-6">
										<div 
											className="text-body text-neutralDark"
											dangerouslySetInnerHTML={{ __html: markdownToHtml(explanation.explanation || explanation.response || explanation) }}
										/>
									</div>
								</div>
							</div>

							{explanation.simplified && (
								<div className="border-t pt-6">
									<h4 className="text-h3 text-neutralDark mb-3 flex items-center gap-2">
										<Lightbulb className="h-5 w-5 text-secondary" />
										{language === 'bm' ? 'Ringkasan Ringkas' : 'Simple Summary'}
									</h4>
									<div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
										<p className="text-body text-neutralDark">{explanation.simplified}</p>
									</div>
								</div>
							)}

							{explanation.examples && explanation.examples.length > 0 && (
								<div className="border-t pt-6">
									<h4 className="text-h3 text-neutralDark mb-3">
										{language === 'bm' ? 'Contoh' : 'Examples'}
									</h4>
									<div className="space-y-2">
										{explanation.examples.map((example, idx) => (
											<div
												key={idx}
												className="bg-neutralDark text-white rounded-lg p-4 font-mono text-sm"
											>
												{example}
											</div>
										))}
									</div>
								</div>
							)}

							<div className="border-t pt-4">
								<Button
									variant="outline"
									onClick={() => {
										setConcept('');
										setExplanation(null);
										setRegenerateCount(0);
									}}
									className="w-full"
								>
									{language === 'bm' ? 'Tanya Tentang Konsep Lain' : 'Ask About Another Concept'}
								</Button>
							</div>
						</div>
					)}

					{!explanation && !loading && (
						<div className="text-center py-12 border-t">
							<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-body text-muted-foreground">
								{language === 'bm' 
									? 'Masukkan konsep di atas untuk mula. Cuba konsep seperti:'
									: 'Enter a concept above to get started. Try concepts like:'}
							</p>
							<div className="flex flex-wrap justify-center gap-2 mt-4">
								{(language === 'bm' 
									? ['pembolehubah', 'fungsi', 'gelung', 'array', 'objek', 'kelas']
									: ['variables', 'functions', 'loops', 'arrays', 'objects', 'classes']
								).map((term) => (
									<Button
										key={term}
										variant="outline"
										size="sm"
										onClick={() => {
											setConcept(term);
											setTimeout(() => handleExplain(), 100);
										}}
									>
										{term}
									</Button>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

