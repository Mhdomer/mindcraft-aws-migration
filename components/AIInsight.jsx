'use client';

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AIInsight({ 
	chartType, 
	data, 
	chartTitle,
	onDataChange 
}) {
	const { language } = useLanguage();
	const [insight, setInsight] = useState('');
	const [loading, setLoading] = useState(true);
	const [regenerating, setRegenerating] = useState(false);

	const translations = {
		en: {
			regenerate: 'Regenerate',
			generating: 'Generating insight...',
			aiGenerated: 'AI-generated insight',
			clickRegenerate: 'Click regenerate for a different perspective',
		},
		bm: {
			regenerate: 'Jana Semula',
			generating: 'Menjana pandangan...',
			aiGenerated: 'Pandangan dijana AI',
			clickRegenerate: 'Klik jana semula untuk perspektif yang berbeza',
		},
	};

	const t = translations[language] || translations.en;

	useEffect(() => {
		generateInsight();
	}, [chartType, data, chartTitle]);

	// Regenerate when data changes
	useEffect(() => {
		if (onDataChange) {
			generateInsight();
		}
	}, [onDataChange]);

	async function generateInsight() {
		setLoading(true);
		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'explain_analytics',
					input: JSON.stringify({
						chartType,
						chartTitle,
						data,
					}),
					language: language,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to generate insight');
			}

			const result = await response.json();
			setInsight(result.insight || result.response || '');
		} catch (err) {
			console.error('Error generating insight:', err);
			setInsight(language === 'bm' 
				? 'Tidak dapat menjana pandangan pada masa ini.' 
				: 'Unable to generate insight at this time.');
		} finally {
			setLoading(false);
		}
	}

	async function handleRegenerate() {
		setRegenerating(true);
		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'explain_analytics',
					input: JSON.stringify({
						chartType,
						chartTitle,
						data,
					}),
					language: language,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to regenerate insight');
			}

			const result = await response.json();
			setInsight(result.insight || result.response || '');
		} catch (err) {
			console.error('Error regenerating insight:', err);
		} finally {
			setRegenerating(false);
		}
	}

	if (loading) {
		return (
			<div className="border-l-4 border-primary pl-4 py-2 bg-primary/5 italic text-muted-foreground">
				<div className="flex items-start gap-2">
					<Loader2 className="h-4 w-4 text-primary mt-1 animate-spin" />
					<div className="text-sm">{t.generating}</div>
				</div>
			</div>
		);
	}

	if (!insight) {
		return null;
	}

	return (
		<div className="border-l-4 border-primary pl-4 py-2 bg-primary/5 italic text-muted-foreground mt-4">
			<div className="flex items-start gap-2">
				<Sparkles className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
				<div className="flex-1">
					<div className="text-sm">{insight}</div>
					<div className="flex items-center justify-between mt-2">
						<span className="text-xs text-muted-foreground/70">
							{t.aiGenerated} • {t.clickRegenerate}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleRegenerate}
							disabled={regenerating}
							className="h-7 text-xs"
						>
							{regenerating ? (
								<Loader2 className="h-3 w-3 mr-1 animate-spin" />
							) : (
								<RefreshCw className="h-3 w-3 mr-1" />
							)}
							{t.regenerate}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
