'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function NewCoursePage() {
	const { language } = useLanguage();
	const { userData } = useAuth();
	const router = useRouter();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const t = {
		en: {
			pageTitle: 'Create Course',
			titleLabel: 'Title',
			titlePlaceholder: 'Enter course title',
			descriptionLabel: 'Description',
			descriptionPlaceholder: 'Enter course description',
			saveCourse: 'Create Course',
			saving: 'Creating…',
			hint: 'After creating the course, you can add modules and lessons from the edit page.',
		},
		bm: {
			pageTitle: 'Cipta Kursus',
			titleLabel: 'Tajuk',
			titlePlaceholder: 'Masukkan tajuk kursus',
			descriptionLabel: 'Penerangan',
			descriptionPlaceholder: 'Masukkan penerangan kursus',
			saveCourse: 'Cipta Kursus',
			saving: 'Mencipta…',
			hint: 'Selepas mencipta kursus, anda boleh menambah modul dan pelajaran dari halaman edit.',
		},
	}[language] || {
		pageTitle: 'Create Course', titleLabel: 'Title', titlePlaceholder: 'Enter course title',
		descriptionLabel: 'Description', descriptionPlaceholder: 'Enter course description',
		saveCourse: 'Create Course', saving: 'Creating…',
		hint: 'After creating the course, you can add modules and lessons from the edit page.',
	};

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		if (!title.trim()) { setError('Course title is required'); return; }
		if (title.trim().length < 3) { setError('Course title must be at least 3 characters'); return; }

		setSubmitting(true);
		try {
			const data = await api.post('/api/courses', {
				title: title.trim(),
				description: description.trim(),
			});
			const courseId = data.course._id?.toString() || data.course.id;
			router.push(`/dashboard/courses/${courseId}/edit`);
		} catch (err) {
			setError(err.message || 'Failed to create course');
			setSubmitting(false);
		}
	}

	return (
		<div className="max-w-2xl mx-auto">
			<h1 className="text-h1 text-neutralDark mb-8">{t.pageTitle}</h1>
			<Card>
				<CardContent className="pt-6">
					<form onSubmit={onSubmit} className="space-y-6">
						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">
								{t.titleLabel} <span className="text-error">*</span>
							</span>
							<Input
								required
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder={t.titlePlaceholder}
								minLength={3}
								maxLength={200}
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">
								{t.descriptionLabel}
							</span>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={4}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
								placeholder={t.descriptionPlaceholder}
							/>
						</label>

						<p className="text-sm text-muted-foreground">{t.hint}</p>

						<Button type="submit" disabled={submitting} className="w-full" size="lg">
							{submitting ? t.saving : t.saveCourse}
						</Button>
					</form>
				</CardContent>
			</Card>

			{error && (
				<Card className="mt-6 border-error bg-error/5">
					<CardContent className="pt-6">
						<p className="text-body text-error">{error}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
