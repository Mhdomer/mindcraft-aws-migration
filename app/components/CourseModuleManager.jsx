'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function CourseModuleManager({ courseId, onModulesChange }) {
	const { language } = useLanguage();
	const [modules, setModules] = useState([]);
	const [newModuleTitle, setNewModuleTitle] = useState('');
	const [loading, setLoading] = useState(false);
	const [showModuleLibrary, setShowModuleLibrary] = useState(false);
	const [moduleLibrary, setModuleLibrary] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');

	const translations = {
		en: {
			modulesLessons: 'Modules & Lessons',
			moduleTitlePlaceholder: "Module title (e.g., 'Introduction to Python')",
			addNewModule: 'Add Module',
			browseLibrary: 'Browse Library',
			hideLibrary: 'Hide Library',
			moduleLibrary: 'Module Library',
			addExistingModules: 'Add existing standalone modules to this course',
			searchModules: 'Search modules...',
			noModulesFound: 'No modules found matching your search.',
			noModulesAvailable: 'No standalone modules in library.',
			lesson: 'lesson',
			lessons: 'lessons',
			manageLessons: 'Manage Lessons',
			add: 'Add',
			remove: 'Remove',
			loading: 'Loading modules...',
			noModulesYet: 'No modules yet. Add modules to structure your course content.',
			removeConfirm: 'Remove this module from the course? (The module itself will not be deleted)',
			addFailed: 'Failed to add module',
			removeFailed: 'Failed to remove module',
		},
		bm: {
			modulesLessons: 'Modul & Pelajaran',
			moduleTitlePlaceholder: "Tajuk modul (cth., 'Pengenalan kepada Python')",
			addNewModule: 'Tambah Modul',
			browseLibrary: 'Layari Perpustakaan',
			hideLibrary: 'Sembunyikan Perpustakaan',
			moduleLibrary: 'Perpustakaan Modul',
			addExistingModules: 'Tambah modul sedia ada ke kursus ini',
			searchModules: 'Cari modul...',
			noModulesFound: 'Tiada modul ditemui yang sepadan dengan carian anda.',
			noModulesAvailable: 'Tiada modul bebas dalam perpustakaan.',
			lesson: 'pelajaran',
			lessons: 'pelajaran',
			manageLessons: 'Urus Pelajaran',
			add: 'Tambah',
			remove: 'Buang',
			loading: 'Memuatkan modul...',
			noModulesYet: 'Tiada modul lagi. Tambah modul untuk menyusun kandungan kursus anda.',
			removeConfirm: 'Buang modul ini dari kursus? (Modul itu sendiri tidak akan dipadam)',
			addFailed: 'Gagal menambah modul',
			removeFailed: 'Gagal membuang modul',
		},
	};

	const t = translations[language] || translations.en;

	useEffect(() => {
		if (courseId) loadModules();
	}, [courseId]);

	async function loadModules() {
		if (!courseId) return;
		setLoading(true);
		try {
			const data = await api.get(`/api/modules?courseId=${courseId}`);
			const mods = (data.modules || []).map(m => ({
				...m,
				id: m._id?.toString() || m.id,
				lessonCount: Array.isArray(m.lessons) ? m.lessons.length : 0,
			}));
			setModules(mods);
		} catch (err) {
			console.error('Error loading modules:', err);
		} finally {
			setLoading(false);
		}
	}

	async function loadModuleLibrary() {
		setLoading(true);
		try {
			// Standalone modules have no courseId
			const data = await api.get('/api/modules');
			const currentIds = new Set(modules.map(m => m.id));
			const available = (data.modules || [])
				.map(m => ({ ...m, id: m._id?.toString() || m.id, lessonCount: Array.isArray(m.lessons) ? m.lessons.length : 0 }))
				.filter(m => !currentIds.has(m.id));
			setModuleLibrary(available);
		} catch (err) {
			console.error('Error loading module library:', err);
		} finally {
			setLoading(false);
		}
	}

	async function addModule() {
		if (!newModuleTitle.trim() || !courseId) return;
		setLoading(true);
		try {
			await api.post('/api/modules', { courseId, title: newModuleTitle.trim() });
			setNewModuleTitle('');
			await loadModules();
		} catch (err) {
			alert(err.message || t.addFailed);
		} finally {
			setLoading(false);
		}
	}

	async function addExistingModule(moduleId) {
		setLoading(true);
		try {
			await api.post(`/api/courses/${courseId}/modules`, { moduleId });
			await loadModules();
			setShowModuleLibrary(false);
			setSearchTerm('');
		} catch (err) {
			alert(err.message || t.addFailed);
		} finally {
			setLoading(false);
		}
	}

	async function removeModule(moduleId) {
		if (!confirm(t.removeConfirm)) return;
		setLoading(true);
		try {
			await api.delete(`/api/courses/${courseId}/modules/${moduleId}`);
			await loadModules();
		} catch (err) {
			alert(err.message || t.removeFailed);
		} finally {
			setLoading(false);
		}
	}

	function toggleLibrary() {
		if (!showModuleLibrary) loadModuleLibrary();
		setShowModuleLibrary(v => !v);
	}

	const filteredLibrary = moduleLibrary.filter(m =>
		m.title.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading && modules.length === 0) {
		return <p className="text-body text-muted-foreground">{t.loading}</p>;
	}

	return (
		<div className="space-y-4">
			<h3 className="text-h3 text-neutralDark">{t.modulesLessons}</h3>

			{/* Add Module */}
			<div className="flex gap-2">
				<Input
					value={newModuleTitle}
					onChange={(e) => setNewModuleTitle(e.target.value)}
					placeholder={t.moduleTitlePlaceholder}
					className="flex-1"
					onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }}
				/>
				<Button onClick={addModule} disabled={loading || !newModuleTitle.trim()}>
					<Plus className="h-5 w-5 mr-2" />{t.addNewModule}
				</Button>
				<Button onClick={toggleLibrary} variant="outline" disabled={loading}>
					<Search className="h-5 w-5 mr-2" />
					{showModuleLibrary ? t.hideLibrary : t.browseLibrary}
				</Button>
			</div>

			{/* Module Library */}
			{showModuleLibrary && (
				<Card className="border-primary/20">
					<CardHeader>
						<CardTitle className="text-h3">{t.moduleLibrary}</CardTitle>
						<CardDescription>{t.addExistingModules}</CardDescription>
						<Input
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t.searchModules}
							className="mt-4"
						/>
					</CardHeader>
					<CardContent>
						{filteredLibrary.length === 0 ? (
							<p className="text-body text-muted-foreground text-center py-4">
								{searchTerm ? t.noModulesFound : t.noModulesAvailable}
							</p>
						) : (
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{filteredLibrary.map((module) => (
									<div key={module.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-neutralLight">
										<div className="flex-1 min-w-0">
											<p className="text-body font-medium text-neutralDark">{module.title}</p>
											<p className="text-caption text-muted-foreground">
												{module.lessonCount} {module.lessonCount === 1 ? t.lesson : t.lessons}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Link href={`/dashboard/modules/${module.id}`}>
												<Button variant="ghost" size="sm"><ExternalLink className="h-5 w-5" /></Button>
											</Link>
											<Button size="sm" onClick={() => addExistingModule(module.id)} disabled={loading}>
												{t.add}
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Modules List */}
			<div className="space-y-3">
				{modules.map((module, index) => (
					<Card key={module.id} className="overflow-hidden">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3 flex-1">
									<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-body font-semibold">
										{index + 1}
									</div>
									<div className="flex-1 min-w-0">
										<CardTitle className="text-h3">{module.title}</CardTitle>
										<CardDescription>
											{module.lessonCount} {module.lessonCount === 1 ? t.lesson : t.lessons}
										</CardDescription>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Link href={`/dashboard/modules/${module.id}`}>
										<Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10 hover:border-primary/40">
											<ExternalLink className="h-5 w-5 mr-2 text-primary" />{t.manageLessons}
										</Button>
									</Link>
									<Button
										variant="outline"
										size="sm"
										onClick={() => removeModule(module.id)}
										className="border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 text-destructive hover:text-destructive"
										disabled={loading}
									>
										<Trash2 className="h-5 w-5 mr-2 fill-destructive text-destructive" />{t.remove}
									</Button>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>

			{modules.length === 0 && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-4">{t.noModulesYet}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
