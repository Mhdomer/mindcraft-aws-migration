'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import CourseManagement from './CourseManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Filter, SortAsc, SortDesc, Grid3x3, List, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminCoursesPage() {
	const { language } = useLanguage();
	const { userData, loading: authLoading } = useAuth();
	const role = userData?.role;
	const userId = userData?._id?.toString();

	const [allCourses, setAllCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [authorFilter, setAuthorFilter] = useState('all');
	const [sortBy, setSortBy] = useState('createdAt');
	const [sortOrder, setSortOrder] = useState('desc');
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(12);
	const [viewMode, setViewMode] = useState('grid');
	const [selectedCourses, setSelectedCourses] = useState(new Set());
	const [bulkActionLoading, setBulkActionLoading] = useState(false);

	const translations = {
		en: {
			pageTitle: 'Manage Courses', pageDescription: 'Create, edit, and manage your courses',
			createCourse: 'Create Course', loading: 'Loading courses...',
			unauthorized: 'Unauthorized: Admin or Teacher access required',
			searchPlaceholder: 'Search courses by title or description',
			filterByStatus: 'Filter by Status', filterByAuthor: 'Filter by Author',
			all: 'All', draft: 'Draft', published: 'Published', myCourses: 'My Courses',
			sortBy: 'Sort By', newest: 'Newest First', oldest: 'Oldest First',
			titleAZ: 'Title (A-Z)', titleZA: 'Title (Z-A)', recentlyUpdated: 'Recently Updated',
			itemsPerPage: 'Items per page', viewMode: 'View', gridView: 'Grid', listView: 'List',
			selectAll: 'Select All', deselectAll: 'Deselect All', bulkActions: 'Bulk Actions',
			bulkPublish: 'Publish Selected', bulkUnpublish: 'Unpublish Selected', bulkDelete: 'Delete Selected',
			noCourses: 'No courses found', showing: 'Showing', of: 'of', courses: 'courses',
			page: 'Page', previous: 'Previous', next: 'Next',
		},
		bm: {
			pageTitle: 'Urus Kursus', pageDescription: 'Cipta, edit, dan urus kursus anda',
			createCourse: 'Cipta Kursus', loading: 'Memuatkan kursus...',
			unauthorized: 'Tidak dibenarkan: Akses Admin atau Guru diperlukan',
			searchPlaceholder: 'Cari kursus mengikut tajuk atau penerangan',
			filterByStatus: 'Tapis mengikut Status', filterByAuthor: 'Tapis mengikut Pengarang',
			all: 'Semua', draft: 'Draf', published: 'Diterbitkan', myCourses: 'Kursus Saya',
			sortBy: 'Susun mengikut', newest: 'Terbaru', oldest: 'Terlama',
			titleAZ: 'Tajuk (A-Z)', titleZA: 'Tajuk (Z-A)', recentlyUpdated: 'Kemas Kini Terkini',
			itemsPerPage: 'Item setiap halaman', viewMode: 'Paparan', gridView: 'Grid', listView: 'Senarai',
			selectAll: 'Pilih Semua', deselectAll: 'Nyahpilih Semua', bulkActions: 'Tindakan Pukal',
			bulkPublish: 'Terbitkan Dipilih', bulkUnpublish: 'Nyahterbit Dipilih', bulkDelete: 'Padam Dipilih',
			noCourses: 'Tiada kursus dijumpai', showing: 'Menunjukkan', of: 'daripada', courses: 'kursus',
			page: 'Halaman', previous: 'Sebelumnya', next: 'Seterusnya',
		},
	};

	const t = translations[language] || translations.en;

	async function loadCourses() {
		try {
			const data = await api.get('/api/courses');
			setAllCourses(data.courses || []);
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!authLoading && role && (role === 'admin' || role === 'teacher')) {
			loadCourses();
		} else if (!authLoading) {
			setLoading(false);
		}
	}, [authLoading, role]);

	const filteredAndSortedCourses = useMemo(() => {
		let filtered = [...allCourses];

		if (searchTerm.trim()) {
			const normalized = searchTerm.trim().toLowerCase();
			filtered = filtered.filter((course) =>
				(course.title || '').toLowerCase().includes(normalized) ||
				(course.description || '').toLowerCase().includes(normalized)
			);
		}

		if (statusFilter !== 'all') filtered = filtered.filter(c => c.status === statusFilter);

		if (role === 'teacher' && authorFilter === 'mine' && userId) {
			filtered = filtered.filter(c => c.createdBy?.toString() === userId);
		}

		filtered.sort((a, b) => {
			let aVal, bVal;
			if (sortBy === 'title') {
				aVal = (a.title || '').toLowerCase();
				bVal = (b.title || '').toLowerCase();
			} else if (sortBy === 'updatedAt') {
				aVal = new Date(a.updatedAt).getTime() || 0;
				bVal = new Date(b.updatedAt).getTime() || 0;
			} else {
				aVal = new Date(a.createdAt).getTime() || 0;
				bVal = new Date(b.createdAt).getTime() || 0;
			}
			return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
		});

		return filtered;
	}, [allCourses, searchTerm, statusFilter, authorFilter, sortBy, sortOrder, role, userId]);

	const totalPages = Math.ceil(filteredAndSortedCourses.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedCourses = filteredAndSortedCourses.slice(startIndex, endIndex);

	useEffect(() => {
		setCurrentPage(1);
		setSelectedCourses(new Set());
	}, [searchTerm, statusFilter, authorFilter, sortBy, sortOrder]);

	function handleSelectAll() {
		if (selectedCourses.size === paginatedCourses.length) setSelectedCourses(new Set());
		else setSelectedCourses(new Set(paginatedCourses.map(c => c._id?.toString() || c.id)));
	}

	function handleToggleSelect(courseId) {
		const newSelected = new Set(selectedCourses);
		if (newSelected.has(courseId)) newSelected.delete(courseId);
		else newSelected.add(courseId);
		setSelectedCourses(newSelected);
	}

	async function handleBulkPublish() {
		if (selectedCourses.size === 0) return;
		if (!confirm(`Publish ${selectedCourses.size} course(s)?`)) return;
		setBulkActionLoading(true);
		try {
			await Promise.all([...selectedCourses].map(id => api.put(`/api/courses/${id}`, { status: 'published' })));
			setSelectedCourses(new Set());
			await loadCourses();
		} catch (err) {
			alert('Failed to publish courses');
		} finally {
			setBulkActionLoading(false);
		}
	}

	async function handleBulkUnpublish() {
		if (selectedCourses.size === 0) return;
		if (!confirm(`Unpublish ${selectedCourses.size} course(s)?`)) return;
		setBulkActionLoading(true);
		try {
			await Promise.all([...selectedCourses].map(id => api.put(`/api/courses/${id}`, { status: 'draft' })));
			setSelectedCourses(new Set());
			await loadCourses();
		} catch (err) {
			alert('Failed to unpublish courses');
		} finally {
			setBulkActionLoading(false);
		}
	}

	async function handleBulkDelete() {
		if (selectedCourses.size === 0) return;
		if (!confirm(`Delete ${selectedCourses.size} course(s)? This cannot be undone.`)) return;
		setBulkActionLoading(true);
		try {
			await Promise.all([...selectedCourses].map(id => api.delete(`/api/courses/${id}`)));
			setSelectedCourses(new Set());
			await loadCourses();
		} catch (err) {
			alert('Failed to delete courses');
		} finally {
			setBulkActionLoading(false);
		}
	}

	function handleCourseDeleted(courseId) {
		setAllCourses(prev => prev.filter(c => (c._id?.toString() || c.id) !== courseId));
		setSelectedCourses(prev => { const s = new Set(prev); s.delete(courseId); return s; });
	}

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">{t.loading}</p>
			</div>
		);
	}

	if (role !== 'admin' && role !== 'teacher') {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{t.unauthorized}</p>
				</CardContent>
			</Card>
		);
	}

	const allSelected = paginatedCourses.length > 0 && selectedCourses.size === paginatedCourses.length;

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="max-w-7xl mx-auto relative z-10 space-y-8 animate-fadeIn">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
					<div>
						<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent inline-flex items-center gap-2">
							{t.pageTitle} <Sparkles className="h-6 w-6 text-yellow-400" />
						</h1>
						<p className="text-muted-foreground mt-2 text-lg">{t.pageDescription}</p>
					</div>
					<a href="/dashboard/courses/new">
						<Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all duration-300">
							{t.createCourse}
						</Button>
					</a>
				</div>

				<Card className="border-none shadow-md bg-white/80 backdrop-blur-md">
					<CardContent className="pt-6">
						<div className="space-y-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
								<Input
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									placeholder={t.searchPlaceholder}
									className="w-full pl-10 bg-white/60 backdrop-blur-sm border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all h-11"
								/>
							</div>

							<div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
								<div className="flex items-center gap-2">
									<Filter className="h-4 w-4 text-muted-foreground" />
									<label className="text-caption text-muted-foreground">{t.filterByStatus}:</label>
									<select
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value)}
										className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
									>
										<option value="all">{t.all}</option>
										<option value="draft">{t.draft}</option>
										<option value="published">{t.published}</option>
									</select>
								</div>

								{role === 'teacher' && (
									<div className="flex items-center gap-2">
										<label className="text-caption text-muted-foreground">{t.filterByAuthor}:</label>
										<select
											value={authorFilter}
											onChange={(e) => setAuthorFilter(e.target.value)}
											className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
										>
											<option value="all">{t.all}</option>
											<option value="mine">{t.myCourses}</option>
										</select>
									</div>
								)}

								<div className="flex items-center gap-2">
									{sortOrder === 'asc' ? <SortAsc className="h-4 w-4 text-muted-foreground" /> : <SortDesc className="h-4 w-4 text-muted-foreground" />}
									<label className="text-caption text-muted-foreground">{t.sortBy}:</label>
									<select
										value={`${sortBy}-${sortOrder}`}
										onChange={(e) => { const [field, order] = e.target.value.split('-'); setSortBy(field); setSortOrder(order); }}
										className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
									>
										<option value="createdAt-desc">{t.newest}</option>
										<option value="createdAt-asc">{t.oldest}</option>
										<option value="title-asc">{t.titleAZ}</option>
										<option value="title-desc">{t.titleZA}</option>
										<option value="updatedAt-desc">{t.recentlyUpdated}</option>
									</select>
								</div>

								<div className="flex items-center gap-2 ml-auto">
									<label className="text-caption text-muted-foreground">{t.itemsPerPage}:</label>
									<select
										value={itemsPerPage}
										onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
										className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
									>
										<option value="12">12</option>
										<option value="24">24</option>
										<option value="48">48</option>
									</select>
								</div>

								<div className="flex items-center gap-2 border-l border-border pl-4">
									<label className="text-caption text-muted-foreground">{t.viewMode}:</label>
									<div className="flex gap-1">
										<Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
											<Grid3x3 className="h-4 w-4" />
										</Button>
										<Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
											<List className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{selectedCourses.size > 0 && (
					<Card className="border-primary bg-primary/5">
						<CardContent className="pt-6">
							<div className="flex items-center justify-between flex-wrap gap-4">
								<div className="flex items-center gap-3">
									<Button variant="outline" size="sm" onClick={handleSelectAll}>
										{allSelected ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
										{allSelected ? t.deselectAll : t.selectAll}
									</Button>
									<span className="text-body text-neutralDark">{selectedCourses.size} {t.courses} selected</span>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<Button variant="outline" size="sm" onClick={handleBulkPublish} disabled={bulkActionLoading}>{t.bulkPublish}</Button>
									<Button variant="outline" size="sm" onClick={handleBulkUnpublish} disabled={bulkActionLoading}>{t.bulkUnpublish}</Button>
									<Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkActionLoading}>{t.bulkDelete}</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{paginatedCourses.length === 0 ? (
					<Card><CardContent className="pt-6"><p className="text-body text-muted-foreground text-center py-8">{t.noCourses}</p></CardContent></Card>
				) : (
					<>
						{viewMode === 'grid' ? (
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{paginatedCourses.map((course) => {
									const cid = course._id?.toString() || course.id;
									return (
										<div key={cid} className="relative group">
											{selectedCourses.has(cid) && (
												<div className="absolute top-2 right-2 z-10 bg-white rounded-full p-1 shadow-sm">
													<CheckSquare className="h-5 w-5 text-emerald-600" />
												</div>
											)}
											<div
												className={`cursor-pointer transition-all duration-300 ${selectedCourses.has(cid) ? 'ring-2 ring-emerald-500 rounded-xl transform scale-[1.02]' : 'hover:-translate-y-1'}`}
												onClick={() => handleToggleSelect(cid)}
											>
												<CourseManagement course={course} currentUserId={userId} currentRole={role} onDeleted={handleCourseDeleted} />
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="space-y-4">
								{paginatedCourses.map((course) => {
									const cid = course._id?.toString() || course.id;
									return (
										<div key={cid} className="relative">
											{selectedCourses.has(cid) && (
												<div className="absolute top-2 right-2 z-10">
													<CheckSquare className="h-5 w-5 text-primary" />
												</div>
											)}
											<div
												className={`cursor-pointer ${selectedCourses.has(cid) ? 'ring-2 ring-emerald-500 rounded-lg' : ''}`}
												onClick={() => handleToggleSelect(cid)}
											>
												<CourseManagement course={course} currentUserId={userId} currentRole={role} onDeleted={handleCourseDeleted} />
											</div>
										</div>
									);
								})}
							</div>
						)}
					</>
				)}

				{totalPages > 1 && (
					<Card className="border-none shadow-sm bg-white/60">
						<CardContent className="pt-6">
							<div className="flex items-center justify-between flex-wrap gap-4">
								<div className="text-body text-muted-foreground">
									{t.showing} {startIndex + 1}-{Math.min(endIndex, filteredAndSortedCourses.length)} {t.of} {filteredAndSortedCourses.length} {t.courses}
								</div>
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
										<ChevronLeft className="h-4 w-4 mr-1" />{t.previous}
									</Button>
									<div className="flex items-center gap-1">
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											let pageNum;
											if (totalPages <= 5) pageNum = i + 1;
											else if (currentPage <= 3) pageNum = i + 1;
											else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
											else pageNum = currentPage - 2 + i;
											return (
												<Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)}
													className={currentPage === pageNum ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
													{pageNum}
												</Button>
											);
										})}
									</div>
									<Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
										{t.next}<ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
