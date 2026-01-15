'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wand2, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * AI Learning Helper Component
 * Provides placeholder functionality for:
 * - Format Learning Content: Formats and cleans up lesson content
 * - Generate Learning Content: Generates lesson content using AI
 * 
 * Note: This is a placeholder implementation for SDM meeting demonstration.
 * Actual AI integration will be implemented later.
 */
export default function AILearningHelper({ 
	onFormatContent, 
	onGenerateContent,
	currentContent = '',
	lessonTitle = ''
}) {
	const [isFormatting, setIsFormatting] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [formatSuccess, setFormatSuccess] = useState(false);
	const [generateSuccess, setGenerateSuccess] = useState(false);

	/**
	 * Format Learning Content
	 * Uses real Gemini AI to improve and structure lesson content
	 */
	async function handleFormatContent() {
		if (!currentContent.trim()) {
			alert('Please add some content to format first.');
			return;
		}

		setIsFormatting(true);
		setFormatSuccess(false);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'improve_lesson',
					input: currentContent,
					language: 'en', // Can be made dynamic later
					options: {
						includeSampleCode: true,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to format content');
			}

			const data = await response.json();
			
			// Combine explanation and examples into formatted HTML
			let formatted = '';
			if (data.summary) {
				formatted += `<h2>${data.summary}</h2>\n\n`;
			}
			if (data.objectives && data.objectives.length > 0) {
				formatted += `<h3>Learning Objectives</h3>\n<ul>\n`;
				data.objectives.forEach(obj => {
					formatted += `<li>${obj}</li>\n`;
				});
				formatted += `</ul>\n\n`;
			}
			if (data.explanation) {
				formatted += data.explanation + '\n\n';
			}
			if (data.examples && data.examples.length > 0) {
				formatted += `<h3>Examples</h3>\n`;
				data.examples.forEach(example => {
					if (example.code) {
						formatted += `<pre><code>${example.code}</code></pre>\n`;
					}
					if (example.explain) {
						formatted += `<p>${example.explain}</p>\n`;
					}
				});
			}
			
			if (onFormatContent) {
				onFormatContent(formatted.trim() || currentContent);
			}

			setFormatSuccess(true);
			setTimeout(() => setFormatSuccess(false), 3000);
		} catch (error) {
			console.error('Error formatting content:', error);
			alert('Failed to format content. Please try again.');
		} finally {
			setIsFormatting(false);
		}
	}

	/**
	 * Generate Learning Content
	 * Uses real Gemini AI to generate lesson content from title
	 */
	async function handleGenerateContent() {
		if (!lessonTitle.trim()) {
			alert('Please enter a lesson title first.');
			return;
		}

		setIsGenerating(true);
		setGenerateSuccess(false);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'improve_lesson',
					input: `Lesson topic: ${lessonTitle}`,
					language: 'en', // Can be made dynamic later
					options: {
						lessonTitle: lessonTitle,
						includeSampleCode: true,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to generate content');
			}

			const data = await response.json();
			
			// Combine all parts into formatted HTML
			let generated = '';
			if (data.summary) {
				generated += `<h2>${data.summary}</h2>\n\n`;
			}
			if (data.objectives && data.objectives.length > 0) {
				generated += `<h3>Learning Objectives</h3>\n<ul>\n`;
				data.objectives.forEach(obj => {
					generated += `<li>${obj}</li>\n`;
				});
				generated += `</ul>\n\n`;
			}
			if (data.explanation) {
				generated += data.explanation + '\n\n';
			}
			if (data.examples && data.examples.length > 0) {
				generated += `<h3>Examples</h3>\n`;
				data.examples.forEach(example => {
					if (example.code) {
						generated += `<pre><code>${example.code}</code></pre>\n`;
					}
					if (example.explain) {
						generated += `<p>${example.explain}</p>\n`;
					}
				});
			}
			
			if (onGenerateContent) {
				onGenerateContent(generated.trim());
			}

			setGenerateSuccess(true);
			setTimeout(() => setGenerateSuccess(false), 3000);
		} catch (error) {
			console.error('Error generating content:', error);
			alert('Failed to generate content. Please try again.');
		} finally {
			setIsGenerating(false);
		}
	}


	return (
		<Card className="border-primary/20 bg-primary/5">
			<CardHeader>
				<div className="flex items-center gap-2">
					<Sparkles className="h-6 w-6 text-primary" />
					<CardTitle className="text-h3">AI Learning Assistant</CardTitle>
				</div>
				<CardDescription>
					Use AI-powered tools to enhance your lesson content
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Format Content Button */}
				<div className="flex items-center gap-3">
					<Button
						onClick={handleFormatContent}
						disabled={isFormatting || isGenerating || !currentContent.trim()}
						variant="outline"
						className="flex-1"
						title="Format and clean up the lesson content (removes extra whitespace, fixes formatting)"
					>
						{isFormatting ? (
							<>
								<Loader2 className="h-5 w-5 mr-2 animate-spin" />
								Formatting...
							</>
						) : formatSuccess ? (
							<>
								<CheckCircle2 className="h-5 w-5 mr-2 text-success" />
								Formatted!
							</>
						) : (
							<>
								<Wand2 className="h-5 w-5 mr-2" />
								Format Learning Content
							</>
						)}
					</Button>
					<div className="text-caption text-muted-foreground max-w-xs">
						Cleans up formatting, removes extra whitespace, and improves structure
					</div>
				</div>

				{/* Generate Content Button */}
				<div className="flex items-center gap-3">
					<Button
						onClick={handleGenerateContent}
						disabled={isFormatting || isGenerating || !lessonTitle.trim()}
						variant="outline"
						className="flex-1"
						title="Generate structured lesson content using AI based on the lesson title"
					>
						{isGenerating ? (
							<>
								<Loader2 className="h-5 w-5 mr-2 animate-spin" />
								Generating...
							</>
						) : generateSuccess ? (
							<>
								<CheckCircle2 className="h-5 w-5 mr-2 text-success" />
								Generated!
							</>
						) : (
							<>
								<Sparkles className="h-5 w-5 mr-2" />
								Generate Learning Content
							</>
						)}
					</Button>
					<div className="text-caption text-muted-foreground max-w-xs">
						AI generates structured lesson content based on the lesson title
					</div>
				</div>

			</CardContent>
		</Card>
	);
}

