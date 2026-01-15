'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, X, Send, Loader2, Sparkles, Mic, Paperclip, Image as ImageIcon, HelpCircle, MessageSquare, ExternalLink, Star } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tooltip } from '@/components/ui/tooltip';

export default function FloatingAIAssistant({ userRole, userId }) {
	const { language } = useLanguage();
	const pathname = usePathname();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [pageContext, setPageContext] = useState(null);
	const [showFeedback, setShowFeedback] = useState(false);
	const [feedbackRating, setFeedbackRating] = useState(0);
	const [feedbackText, setFeedbackText] = useState('');
	const messagesEndRef = useRef(null);
	const chatWindowRef = useRef(null);
	const buttonRef = useRef(null);

	const translations = {
		en: {
			title: 'AI Assistant',
			placeholder: 'Ask me anything...',
			send: 'Send',
			close: 'Close',
			hint: 'I can help explain concepts, provide hints, or answer questions about the current page.',
			helpSuggestions: 'What can I help you with?',
			quickActions: 'Quick Actions',
			viewFAQ: 'View FAQ',
			giveFeedback: 'Give Feedback',
			feedbackTitle: 'Send Feedback',
			feedbackPlaceholder: 'Tell us what you think...',
			submitFeedback: 'Submit',
			feedbackSubmitted: 'Thank you for your feedback!',
			ratingLabel: 'Rate your experience',
		},
		bm: {
			title: 'Pembantu AI',
			placeholder: 'Tanya saya apa-apa...',
			send: 'Hantar',
			close: 'Tutup',
			hint: 'Saya boleh membantu menerangkan konsep, memberikan petunjuk, atau menjawab soalan tentang halaman semasa.',
			helpSuggestions: 'Apa yang boleh saya bantu?',
			quickActions: 'Tindakan Pantas',
			viewFAQ: 'Lihat FAQ',
			giveFeedback: 'Berikan Maklum Balas',
			feedbackTitle: 'Hantar Maklum Balas',
			feedbackPlaceholder: 'Beritahu kami pendapat anda...',
			submitFeedback: 'Hantar',
			feedbackSubmitted: 'Terima kasih atas maklum balas anda!',
			ratingLabel: 'Nilai pengalaman anda',
		},
	};

	const helpSuggestions = {
		en: [
			'How do I enroll in a course?',
			'Explain database normalization',
			'Help with SQL queries',
			'What are transactions?',
		],
		bm: [
			'Bagaimana saya boleh mendaftar dalam kursus?',
			'Terangkan normalisasi pangkalan data',
			'Bantuan dengan pertanyaan SQL',
			'Apakah transaksi?',
		],
	};

	const t = translations[language] || translations.en;

	// Determine page type and restrictions
	const pageType = getPageType(pathname);
	const restrictions = getRestrictions(pageType, userRole);

	useEffect(() => {
		// Extract page context based on current route
		extractPageContext();
	}, [pathname]);

	useEffect(() => {
		// Auto-scroll to bottom when new messages arrive
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages]);

	// Click outside to close
	useEffect(() => {
		function handleClickOutside(event) {
			if (
				isOpen &&
				chatWindowRef.current &&
				!chatWindowRef.current.contains(event.target) &&
				!buttonRef.current?.contains(event.target)
			) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	function getPageType(pathname) {
		if (pathname?.includes('/assessments/') && pathname?.includes('/take')) return 'assessment';
		if (pathname?.includes('/assignments/') && pathname?.includes('/submit')) return 'assignment';
		if (pathname?.includes('/lessons/')) return 'lesson';
		if (pathname?.includes('/progress')) return 'progress';
		if (pathname?.includes('/courses/')) return 'course';
		return 'general';
	}

	function getRestrictions(pageType, userRole) {
		if (pageType === 'assessment' || pageType === 'assignment') {
			return {
				allowed: true,
				restriction: 'Provide hints and guidance, but do not give direct answers or complete solutions.',
			};
		}
		return {
			allowed: true,
			restriction: null,
		};
	}

	async function extractPageContext() {
		// Extract relevant context from the current page
		// This is a simplified version - can be enhanced to read actual page content
		const context = {
			pageType,
			pathname,
			restrictions: restrictions.restriction,
		};

		// Try to extract lesson/course info from URL
		const pathParts = pathname.split('/');
		if (pathParts.includes('lessons')) {
			const lessonIndex = pathParts.indexOf('lessons');
			if (lessonIndex >= 0 && pathParts[lessonIndex + 1]) {
				context.lessonId = pathParts[lessonIndex + 1];
			}
		}
		if (pathParts.includes('courses')) {
			const courseIndex = pathParts.indexOf('courses');
			if (courseIndex >= 0 && pathParts[courseIndex + 1]) {
				context.courseId = pathParts[courseIndex + 1];
			}
		}

		setPageContext(context);
	}

	async function handleSend() {
		if (!input.trim() || loading) return;

		const userMessage = input.trim();
		setInput('');
		setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
		setLoading(true);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'contextual_help',
					input: userMessage,
					language: language,
					options: {
						pageContext,
						pageType,
						userRole,
						restrictions: restrictions.restriction,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to get AI response');
			}

			const data = await response.json();
			const aiResponse = data.response || data.message || 'I apologize, but I could not generate a response.';

			setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
		} catch (err) {
			console.error('Error getting AI response:', err);
			setMessages(prev => [...prev, {
				role: 'assistant',
				content: language === 'bm' 
					? 'Maaf, terdapat ralat. Sila cuba lagi.' 
					: 'Sorry, there was an error. Please try again.',
			}]);
		} finally {
			setLoading(false);
		}
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleSuggestionClick(suggestion) {
		setInput(suggestion);
		// Auto-send after a brief delay
		setTimeout(() => {
			handleSend();
		}, 100);
	}

	async function handleFeedbackSubmit() {
		if (!feedbackText.trim()) return;

		try {
			console.log('Feedback submitted:', { rating: feedbackRating, text: feedbackText });
			// In production, save to Firestore
			setShowFeedback(false);
			setFeedbackText('');
			setFeedbackRating(0);
			setMessages(prev => [...prev, {
				role: 'assistant',
				content: t.feedbackSubmitted,
			}]);
		} catch (error) {
			console.error('Error submitting feedback:', error);
		}
	}

	// Hide on certain pages (can be customized)
	const hiddenPages = ['/login', '/register'];
	const shouldHide = hiddenPages.some(page => pathname?.startsWith(page));

	if (shouldHide) {
		return null;
	}

	return (
		<>
			{/* Floating Button */}
			{!isOpen && (
				<Tooltip content={language === 'en' ? 'Click to open AI Assistant for help and questions' : 'Klik untuk membuka Pembantu AI untuk bantuan dan soalan'}>
					<Button
						ref={buttonRef}
						onClick={() => setIsOpen(true)}
						className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 transition-all"
						size="icon"
						title={t.title}
					>
						<Brain className="h-7 w-7" />
					</Button>
				</Tooltip>
			)}

			{/* Chat Window */}
			{isOpen && (
				<Card 
					ref={chatWindowRef}
					className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col"
				>
					<CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
						<div className="flex items-center gap-2">
							<Brain className="h-5 w-5 text-primary" />
							<CardTitle className="text-h4">{t.title}</CardTitle>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsOpen(false)}
							className="h-8 w-8"
						>
							<X className="h-4 w-4" />
						</Button>
					</CardHeader>

					<CardContent className="flex-1 flex flex-col p-0">
						{/* Messages Area */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{messages.length === 0 && !showFeedback && (
								<div className="space-y-4">
									<div className="text-center text-muted-foreground text-sm py-4">
										<p>{t.hint}</p>
									</div>
									
									{/* Help Suggestions */}
									<div className="space-y-2">
										<p className="text-xs font-medium text-neutralDark">{t.helpSuggestions}</p>
										<div className="flex flex-wrap gap-2">
											{helpSuggestions[language]?.map((suggestion, idx) => (
												<button
													key={idx}
													onClick={() => handleSuggestionClick(suggestion)}
													className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
												>
													{suggestion}
												</button>
											))}
										</div>
									</div>

									{/* Quick Actions */}
									<div className="border-t pt-4 space-y-2">
										<p className="text-xs font-medium text-neutralDark">{t.quickActions}</p>
										<div className="flex flex-col gap-2">
											<Link href="/support">
												<Button variant="outline" size="sm" className="w-full justify-start">
													<HelpCircle className="h-5 w-5 mr-2" />
													{t.viewFAQ}
													<ExternalLink className="h-4 w-4 ml-auto" />
												</Button>
											</Link>
											<Button
												variant="outline"
												size="sm"
												className="w-full justify-start"
												onClick={() => setShowFeedback(true)}
											>
												<MessageSquare className="h-5 w-5 mr-2" />
												{t.giveFeedback}
											</Button>
										</div>
									</div>
								</div>
							)}

							{showFeedback && (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h3 className="font-medium text-neutralDark">{t.feedbackTitle}</h3>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => {
												setShowFeedback(false);
												setFeedbackText('');
												setFeedbackRating(0);
											}}
											className="h-6 w-6"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
									<div>
										<label className="text-xs font-medium text-neutralDark mb-2 block">
											{t.ratingLabel}
										</label>
										<div className="flex gap-1">
											{[1, 2, 3, 4, 5].map((rating) => (
												<button
													key={rating}
													onClick={() => setFeedbackRating(rating)}
													className={`p-1.5 rounded transition-all ${
														feedbackRating >= rating
															? 'bg-warning text-white'
															: 'bg-neutralLight hover:bg-neutralLight/80'
													}`}
												>
													<Star
														className={`h-4 w-4 ${
															feedbackRating >= rating ? 'fill-current' : ''
														}`}
													/>
												</button>
											))}
										</div>
									</div>
									<textarea
										value={feedbackText}
										onChange={(e) => setFeedbackText(e.target.value)}
										placeholder={t.feedbackPlaceholder}
										className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
									/>
									<Button
										onClick={handleFeedbackSubmit}
										disabled={!feedbackText.trim()}
										className="w-full"
										size="sm"
									>
										{t.submitFeedback}
									</Button>
								</div>
							)}

							{messages.map((msg, idx) => (
								<div
									key={idx}
									className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
								>
									<div
										className={`max-w-[80%] rounded-lg px-4 py-2 ${
											msg.role === 'user'
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-foreground'
										}`}
									>
										<p className="text-sm whitespace-pre-wrap">{msg.content}</p>
									</div>
								</div>
							))}

							{loading && (
								<div className="flex justify-start">
									<div className="bg-muted rounded-lg px-4 py-2">
										<Loader2 className="h-4 w-4 animate-spin" />
									</div>
								</div>
							)}

							<div ref={messagesEndRef} />
						</div>

						{/* Input Area */}
						<div className="border-t p-4">
							<div className="flex gap-2">
								<Input
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyPress={handleKeyPress}
									placeholder={t.placeholder}
									disabled={loading}
									className="flex-1"
								/>
								<Button
									onClick={handleSend}
									disabled={!input.trim() || loading}
									size="icon"
								>
									{loading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Send className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}
