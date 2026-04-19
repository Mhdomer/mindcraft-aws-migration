'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function ModulesPage() {
	const { language } = useLanguage();
	const { userData, loading: authLoading } = useAuth();
	const router = useRouter();
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [newModuleTitle, setNewModuleTitle] = useState('');
	const [creating, setCreating] = useState(false);

	const t = {
		en: {
			pageTitle: 'Module Library',
			pageDescription: 'Create and manage standalone modules that can be added to any course',
			createNewModule: 'Create New Module',
			createDescription: 'Build a new module that can be added to any course',
			moduleTitlePlaceholder: "Module title (e.g., 'Introduction to Python')",
			createModule: 'Create Module',
			searchPlaceholder: 'Search modules...',
			allModules: 'All Modules',
			module: 'module', modules: 'modules',
			lesson: 'lesson', lessons: 'lessons',
			manageLessons: 'Manage Lessons',
			loading: 'Loading modules...',
			noModulesFound: 'No modules found matching your search.',
			noModulesYet: 'No standalone modules yet. Create your first module!',
			deleteConfirm: 'Delete this module and all its lessons? This cannot be undone.',
			createFailed: 'Failed to create module',
			deleteFailed: 'Failed to delete module',
		},
		bm: {
			pageTitle: 'Perpustakaan Modul',
			pageDescription: 'Cipta dan urus modul bebas yang boleh ditambah ke mana-mana kursus',
			createNewModule: 'Cipta Modul Baru',
			createDescription: 'Bina modul baharu yang boleh ditambah ke mana-mana kursus',
			moduleTitlePlaceholder: "Tajuk modul (cth., 'Pengenalan kepada Python')",
			createModule: 'Cipta Modul',
			searchPlaceholder: 'Cari modul...',
			allModules: 'Semua Modul',
			module: 'modul', modules: 'modul',
			lesson: 'pelajaran', lessons: 'pelajaran',
			manageLessons: 'Urus Pelajaran',
			loading: 'Memuatkan modul...',
			noModulesFound: 'Tiada modul ditemui yang sepadan dengan carian anda.',
			noModulesYet: 'Tiada modul bebas lagi. Cipta modul pertama anda!',
			deleteConfirm: 'Padam modul ini dan semua pelajarannya? Tindakan ini tidak boleh dibatalkan.',
			createFailed: 'Gagal mencipta modul',
			deleteFailed: 'Gagal memadam modul',
		},
	}[language] || {};

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		if (userData.role !== 'teacher' && userData.role !== 'admin') {
			router.push('/dashboard/student');
			return;
		}
		loadModules();
	}, [authLoading, userData]);

	async function loadModules() {
		setLoading(true);
		try {
			// No courseId → returns standalone modules only
			const data = await api.get('/api/modules');
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

	async function createModule() {
		if (!newModuleTitle.trim()) return;
		setCreating(true);
		try {
			await api.post('/api/modules', { title: newModuleTitle.trim() });
			setNewModuleTitle('');
			await loadModules();
		} catch (err) {
			alert(err.message || t.createFailed);
		} finally {
			setCreating(false);
		}
	}

	async function deleteModule(moduleId) {
		if (!confirm(t.deleteConfirm)) return;
		setLoading(true);
		try {
			await api.delete(`/api/modules/${moduleId}`);
			await loadModules();
		} catch (err) {
			alert(err.message || t.deleteFailed);
		} finally {
			setLoading(false);
		}
	}

	const filteredModules = modules.filter(m =>
		m.title.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">{t.loading || 'Loading...'}</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">{t.pageTitle}</h1>
				<p className="text-body text-muted-foreground">{t.pageDescription}</p>
			</div>

			{/* Create New Module */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h3">{t.createNewModule}</CardTitle>
					<CardDescription>{t.createDescription}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Input
							value={newModuleTitle}
							onChange={(e) => setNewModuleTitle(e.target.value)}
							placeholder={t.moduleTitlePlaceholder}
							className="flex-1"
							onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createModule(); } }}
						/>
						<Button onClick={createModule} disabled={creating || !newModuleTitle.trim()}>
							<Plus className="h-4 w-4 mr-2" />{t.createModule}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<Input
					type="text"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder={t.searchPlaceholder}
					className="pl-10"
				/>
			</div>

			{/* Modules Grid */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-h2 text-neutralDark">{t.allModules}</h2>
					<p className="text-body text-muted-foreground">
						{filteredModules.length} {filteredModules.length === 1 ? t.module : t.modules}
					</p>
				</div>

				{filteredModules.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center py-8">
								<BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
								<p className="text-body text-muted-foreground">
									{searchTerm ? t.noModulesFound : t.noModulesYet}
								</p>
							</div>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredModules.map((module) => (
							<Card key={module.id} className="card-hover">
								<CardHeader>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<CardTitle className="text-h3 mb-2 line-clamp-2">{module.title}</CardTitle>
											<CardDescription>
												{module.lessonCount} {module.lessonCount === 1 ? t.lesson : t.lessons}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2 text-caption text-muted-foreground">
										<BookOpen className="h-4 w-4" />
										<span>
											{module.createdAt
												? new Date(module.createdAt).toLocaleDateString()
												: 'Recently'}
										</span>
									</div>
									<div className="flex items-center gap-2 pt-2 border-t border-border">
										<Link href={`/dashboard/modules/${module.id}`} className="flex-1">
											<Button variant="default" className="w-full">
												<ExternalLink className="h-4 w-4 mr-2" />{t.manageLessons}
											</Button>
										</Link>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => deleteModule(module.id)}
											className="text-error hover:text-error"
											disabled={loading}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
