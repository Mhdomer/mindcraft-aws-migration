'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import CourseManagement from './CourseManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminCoursesPage() {
	const { language } = useLanguage();
	const [draftCourses, setDraftCourses] = useState([]);
	const [publishedCourses, setPublishedCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [userId, setUserId] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');

	// Translations
	const translations = {
		en: {
			pageTitle: 'Manage Courses',
			pageDescription: 'Create, edit, and manage your courses',
			createCourse: 'Create Course',
			draftCourses: 'Draft Courses',
			publishedCourses: 'Published Courses',
			draft: 'draft',
			drafts: 'drafts',
			course: 'course',
			courses: 'courses',
			noDraftCourses: 'No draft courses yet',
			noPublishedCourses: 'No published courses yet',
			loading: 'Loading courses...',
			unauthorized: 'Unauthorized: Admin or Teacher access required',
			searchPlaceholder: 'Search courses by title or description',
		},
		bm: {
			pageTitle: 'Urus Kursus',
			pageDescription: 'Cipta, edit, dan urus kursus anda',
			createCourse: 'Cipta Kursus',
			draftCourses: 'Kursus Draf',
			publishedCourses: 'Kursus Diterbitkan',
			draft: 'draf',
			drafts: 'draf',
			course: 'kursus',
			courses: 'kursus',
			noDraftCourses: 'Tiada kursus draf lagi',
			noPublishedCourses: 'Tiada kursus diterbitkan lagi',
			loading: 'Memuatkan kursus...',
			unauthorized: 'Tidak dibenarkan: Akses Admin atau Guru diperlukan',
			searchPlaceholder: 'Cari kursus mengikut tajuk atau penerangan',
		},
	};

	const t = translations[language] || translations.en;

	useEffect(() => {
		// Wait for Firebase Auth to initialize
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					setLoading(false);
					return;
				}

				// Get user role from Firestore
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (!userDoc.exists()) {
					setLoading(false);
					return;
				}

				const userData = userDoc.data();
				const currentRole = userData.role;
				const currentUserId = user.uid;

				setRole(currentRole);
				setUserId(currentUserId);

				if (currentRole !== 'admin' && currentRole !== 'teacher') {
					setLoading(false);
					return;
				}

				// Load courses
				await loadCoursesForUser(currentRole, currentUserId);
			} catch (err) {
				console.error('Error in auth state change:', err);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	async function loadCoursesForUser(currentRole, currentUserId) {
		try {
			// Build queries based on role
			let draftsQuery, publishedQuery;

			if (currentRole === 'admin') {
				// Admin sees all courses
				draftsQuery = query(
					collection(db, 'course'),
					where('status', '==', 'draft'),
					orderBy('createdAt', 'desc')
				);
				publishedQuery = query(
					collection(db, 'course'),
					where('status', '==', 'published'),
					orderBy('createdAt', 'desc')
				);
			} else {
				// Teacher sees only their own courses
				if (!currentUserId) {
					setLoading(false);
					return;
				}
				draftsQuery = query(
					collection(db, 'course'),
					where('status', '==', 'draft'),
					where('createdBy', '==', currentUserId),
					orderBy('createdAt', 'desc')
				);
				publishedQuery = query(
					collection(db, 'course'),
					where('status', '==', 'published'),
					where('createdBy', '==', currentUserId),
					orderBy('createdAt', 'desc')
				);
			}

			const [draftsSnap, publishedSnap] = await Promise.all([
				getDocs(draftsQuery),
				getDocs(publishedQuery)
			]);

			const drafts = draftsSnap.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			const published = publishedSnap.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			setDraftCourses(drafts);
			setPublishedCourses(published);
		} catch (err) {
			console.error('Error loading courses:', err);
			// If there's an error (like missing index), try without orderBy
			try {
				if (currentRole === 'admin') {
					const allDocs = await getDocs(collection(db, 'course'));
					const all = allDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
					setDraftCourses(all.filter(c => c.status === 'draft'));
					setPublishedCourses(all.filter(c => c.status === 'published'));
				} else if (currentUserId) {
					const allDocs = await getDocs(collection(db, 'course'));
					const all = allDocs.docs
						.map(doc => ({ id: doc.id, ...doc.data() }))
						.filter(c => c.createdBy === currentUserId);
					setDraftCourses(all.filter(c => c.status === 'draft'));
					setPublishedCourses(all.filter(c => c.status === 'published'));
				}
			} catch (fallbackErr) {
				console.error('Fallback query also failed:', fallbackErr);
			}
		} finally {
			setLoading(false);
		}
	}

	const normalizedSearch = searchTerm.trim().toLowerCase();

	const filteredDraftCourses = normalizedSearch
		? draftCourses.filter((course) => {
			const title = (course.title || '').toLowerCase();
			const description = (course.description || '').toLowerCase();
			return title.includes(normalizedSearch) || description.includes(normalizedSearch);
		})
		: draftCourses;

	const filteredPublishedCourses = normalizedSearch
		? publishedCourses.filter((course) => {
			const title = (course.title || '').toLowerCase();
			const description = (course.description || '').toLowerCase();
			return title.includes(normalizedSearch) || description.includes(normalizedSearch);
		})
		: publishedCourses;

	function handleCourseDeleted(courseId) {
		setDraftCourses((prev) => prev.filter((c) => c.id !== courseId));
		setPublishedCourses((prev) => prev.filter((c) => c.id !== courseId));
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">{t.loading}</p>
			</div>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[80px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-100/40 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="max-w-6xl mx-auto relative z-10 space-y-8 animate-fadeIn">
				{/* Page Header */}
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
					<div>
						<h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent inline-flex items-center gap-2">
							{t.pageTitle} <Sparkles className="h-6 w-6 text-yellow-400" />
						</h1>
						<p className="text-muted-foreground mt-2 text-lg">
							{t.pageDescription}
						</p>
						<div className="mt-6 max-w-md relative group">
							<div className="absolute inset-0 bg-emerald-200/20 rounded-lg blur-md group-hover:bg-emerald-200/30 transition-all opacity-0 group-hover:opacity-100"></div>
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 group-hover:text-emerald-500 transition-colors z-10" />
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder={t.searchPlaceholder}
								className="w-full pl-10 bg-white/60 backdrop-blur-sm border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all relative z-10 h-11"
							/>
						</div>
					</div>
					<a href="/dashboard/courses/new" className="self-start md:self-auto">
						<Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all duration-300">
							{t.createCourse}
						</Button>
					</a>
				</div>

				{/* Draft Courses */}
				<div>
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-neutralDark flex items-center gap-2">
							{t.draftCourses}
							<div className="h-1 w-1 rounded-full bg-neutral-300"></div>
						</h2>
						<span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-semibold shadow-sm">
							{filteredDraftCourses.length} {filteredDraftCourses.length === 1 ? t.draft : t.drafts}
						</span>
					</div>
					{filteredDraftCourses.length === 0 ? (
						<div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-xl p-12 text-center">
							<p className="text-lg text-muted-foreground font-medium">{t.noDraftCourses}</p>
						</div>
					) : (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{filteredDraftCourses.map((course) => (
								<CourseManagement
									key={course.id}
									course={course}
									currentUserId={userId}
									currentRole={role}
									onDeleted={handleCourseDeleted}
								/>
							))}
						</div>
					)}
				</div>

				{/* Published Courses */}
				<div>
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-neutralDark flex items-center gap-2">
							{t.publishedCourses}
							<div className="h-1 w-1 rounded-full bg-neutral-300"></div>
						</h2>
						<span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-sm">
							{filteredPublishedCourses.length} {filteredPublishedCourses.length === 1 ? t.course : t.courses}
						</span>
					</div>
					{filteredPublishedCourses.length === 0 ? (
						<div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-xl p-12 text-center">
							<p className="text-lg text-muted-foreground font-medium">{t.noPublishedCourses}</p>
						</div>
					) : (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{filteredPublishedCourses.map((course) => (
								<CourseManagement
									key={course.id}
									course={course}
									currentUserId={userId}
									currentRole={role}
									onDeleted={handleCourseDeleted}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
