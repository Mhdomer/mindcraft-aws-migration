'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, BookOpen, ClipboardCheck, Brain, ArrowRight, Sparkles, Plus, GraduationCap, Gamepad2 } from 'lucide-react';
import { Metric, Flex, Text } from '@tremor/react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useState, useEffect } from 'react';

export default function TeacherDashboard() {
	const { userData } = useAuth();
	const { language } = useLanguage();
	const [userName, setUserName] = useState('');
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({ courses: 0, students: 0, pendingGrades: 0 });
	const [recentActivity, setRecentActivity] = useState([]);

	useEffect(() => {
		if (userData) {
			setUserName(userData.name || '');
			fetchDashboardData();
		}
	}, [userData]);

	async function fetchDashboardData() {
		setLoading(true);
		try {
			const [{ courses }, { enrollments }, { submissions }] = await Promise.all([
				api.get('/api/courses'),
				api.get('/api/enrollments/teacher'),
				api.get('/api/submissions'),
			]);

			const pendingGrades = submissions.filter(s => s.grade == null && s.score == null);

			const activities = [
				...enrollments.slice(0, 5).map(e => ({
					type: 'enrollment',
					date: new Date(e.enrolledAt || e.createdAt || Date.now()),
					id: e._id,
				})),
				...pendingGrades.slice(0, 5).map(s => ({
					type: 'submission',
					date: new Date(s.submittedAt || s.createdAt || Date.now()),
					id: s._id,
				})),
			].sort((a, b) => b.date - a.date).slice(0, 5);

			setStats({
				courses: courses.length,
				students: enrollments.length,
				pendingGrades: pendingGrades.length,
			});
			setRecentActivity(activities);
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-full relative overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

			<div className="space-y-10 animate-fadeIn p-6 md:p-8 lg:p-10 relative z-10 w-full max-w-7xl mx-auto">
				{/* Page Header */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<h1 className="text-h1 text-neutralDark flex items-center gap-3">
							<span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
								{userName
									? (language === 'bm' ? `Selamat kembali, ${userName}` : `Welcome back, ${userName}`)
									: (language === 'bm' ? 'Papan Pemuka Guru' : 'Teacher Dashboard')}
							</span>
							<Sparkles className="h-6 w-6 text-yellow-400 animate-pulse hidden md:block" />
						</h1>
						<p className="text-body text-muted-foreground mt-1">
							{language === 'bm'
								? 'Urus kursus, pelajar dan penggredan anda dari sini.'
								: 'Manage your courses, students, and grading from here.'}
						</p>
					</div>
					<div className="hidden md:block">
						<p className="text-sm font-medium text-muted-foreground bg-white/50 px-4 py-2 rounded-full border border-gray-100">
							{new Date().toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
						</p>
					</div>
				</div>

				{/* Quick Stats */}
				<div className="grid gap-6 md:grid-cols-3">
					<Link href="/admin/courses" className="group">
						<Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-primary/5 relative overflow-hidden h-full">
							<div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-all duration-500"></div>
							<CardHeader className="pb-2 z-10 relative">
								<Flex justifyContent="start" className="gap-3">
									<div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
										<BookOpen className="h-5 w-5 text-primary" />
									</div>
									<CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">
										{language === 'bm' ? 'Kursus Saya' : 'My Courses'}
									</CardTitle>
								</Flex>
							</CardHeader>
							<CardContent className="z-10 relative">
								<Metric className="text-4xl font-bold text-neutralDark">{loading ? '-' : stats.courses}</Metric>
								<Text className="text-sm text-muted-foreground mt-1">
									{language === 'bm' ? 'Kandungan diterbitkan dan draf' : 'Published and draft content'}
								</Text>
							</CardContent>
						</Card>
					</Link>

					<Link href="/assignments" className="group">
						<Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-orange-50/50 relative overflow-hidden h-full">
							<div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all duration-500"></div>
							<CardHeader className="pb-2 z-10 relative">
								<Flex justifyContent="start" className="gap-3">
									<div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
										<ClipboardCheck className="h-5 w-5 text-orange-500" />
									</div>
									<CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">
										{language === 'bm' ? 'Gred Tertunda' : 'Pending Grades'}
									</CardTitle>
								</Flex>
							</CardHeader>
							<CardContent className="z-10 relative">
								<Metric className="text-4xl font-bold text-neutralDark">{loading ? '-' : stats.pendingGrades}</Metric>
								<Text className="text-sm text-muted-foreground mt-1">
									{language === 'bm' ? 'Tugasan memerlukan semakan' : 'Assignments requiring review'}
								</Text>
							</CardContent>
						</Card>
					</Link>

					<Link href="/admin/users" className="group">
						<Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-sky-50/50 relative overflow-hidden h-full">
							<div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-sky-500/20 transition-all duration-500"></div>
							<CardHeader className="pb-2 z-10 relative">
								<Flex justifyContent="start" className="gap-3">
									<div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
										<GraduationCap className="h-5 w-5 text-sky-500" />
									</div>
									<CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">
										{language === 'bm' ? 'Jumlah Pelajar' : 'Total Students'}
									</CardTitle>
								</Flex>
							</CardHeader>
							<CardContent className="z-10 relative">
								<Metric className="text-4xl font-bold text-neutralDark">{loading ? '-' : stats.students}</Metric>
								<Text className="text-sm text-muted-foreground mt-1">
									{language === 'bm' ? 'Mendaftar di semua kursus' : 'Enrolled across all courses'}
								</Text>
							</CardContent>
						</Card>
					</Link>
				</div>

				{/* Quick Actions */}
				<div>
					<div className="flex items-center gap-2 mb-6">
						<div className="h-6 w-1 bg-primary rounded-full"></div>
						<h2 className="text-h2 text-neutralDark">
							{language === 'bm' ? 'Tindakan Pantas' : 'Quick Actions'}
						</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						<Link href="/dashboard/courses/new" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-emerald-500/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-emerald-100 rounded-full group-hover:bg-emerald-200 transition-colors duration-300">
										<Plus className="h-8 w-8 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">
											{language === 'bm' ? 'Cipta Kursus' : 'Create Course'}
										</h3>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Mula membina kandungan baharu' : 'Start building new content'}
										</p>
									</div>
									<Button size="sm" variant="ghost" className="text-emerald-600 mt-2 group-hover:bg-emerald-100">
										{language === 'bm' ? 'Cipta Sekarang' : 'Create Now'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link href="/admin/courses" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-blue-500/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors duration-300">
										<BookOpen className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">
											{language === 'bm' ? 'Kursus Saya' : 'My Courses'}
										</h3>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Urus kursus sedia ada' : 'Manage existing courses'}
										</p>
									</div>
									<Button size="sm" variant="ghost" className="text-blue-600 mt-2 group-hover:bg-blue-100">
										{language === 'bm' ? 'Lihat Semua' : 'View All'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link href="/assignments" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-orange-500/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors duration-300">
										<ClipboardCheck className="h-8 w-8 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">
											{language === 'bm' ? 'Tugasan' : 'Assignments'}
										</h3>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Semak dan gred kerja' : 'Review and grade work'}
										</p>
									</div>
									<Button size="sm" variant="ghost" className="text-orange-600 mt-2 group-hover:bg-orange-100">
										{language === 'bm' ? 'Urus' : 'Manage'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link href="/game-levels" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-purple-500/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors duration-300">
										<Gamepad2 className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">
											{language === 'bm' ? 'Tahap Permainan' : 'Game Levels'}
										</h3>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Pengurusan tahap' : 'Level management'}
										</p>
									</div>
									<Button size="sm" variant="ghost" className="text-purple-600 mt-2 group-hover:bg-purple-100">
										{language === 'bm' ? 'Urus' : 'Manage'} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>
					</div>
				</div>

				{/* Recent Activity */}
				<div>
					<div className="flex items-center gap-2 mb-6">
						<div className="h-6 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
						<h2 className="text-h2 text-neutralDark">
							{language === 'bm' ? 'Aktiviti Terkini' : 'Recent Activity'}
						</h2>
					</div>

					{loading ? (
						<div className="flex items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-neutral-100">
							<p className="text-muted-foreground">
								{language === 'bm' ? 'Memuatkan aktiviti...' : 'Loading activity...'}
							</p>
						</div>
					) : recentActivity.length > 0 ? (
						<div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
							<div className="divide-y divide-gray-100">
								{recentActivity.map((activity, index) => (
									<div key={index} className="p-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
										<div className={`p-2 rounded-lg ${activity.type === 'enrollment' ? 'bg-sky-100 text-sky-600' : 'bg-orange-100 text-orange-600'}`}>
											{activity.type === 'enrollment' ? (
												<GraduationCap className="h-5 w-5" />
											) : (
												<FileText className="h-5 w-5" />
											)}
										</div>
										<div className="flex-1">
											<p className="font-medium text-neutralDark">
												{activity.type === 'enrollment'
													? (language === 'bm' ? 'Pelajar baharu mendaftar' : 'New student enrolled')
													: (language === 'bm' ? 'Tugasan baharu diterima' : 'New submission received')}
											</p>
											<p className="text-xs text-muted-foreground">
												{activity.date.toLocaleDateString(language === 'bm' ? 'ms-MY' : undefined, {
													month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
												})}
											</p>
										</div>
										<Link href={activity.type === 'enrollment' ? '/admin/users' : '/assignments'}>
											<Button variant="ghost" size="sm" className="hidden sm:flex">
												{language === 'bm' ? 'Lihat' : 'View'} <ArrowRight className="h-4 w-4 ml-2" />
											</Button>
										</Link>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-neutral-100 text-center">
							<div className="p-4 bg-gray-50 rounded-full mb-4">
								<Sparkles className="h-8 w-8 text-gray-300" />
							</div>
							<h3 className="text-lg font-semibold text-neutralDark mb-2">
								{language === 'bm' ? 'Tiada data lagi' : 'No data yet'}
							</h3>
							<p className="text-sm text-muted-foreground max-w-sm mb-4">
								{language === 'bm'
									? 'Apabila pelajar mendaftar atau menghantar kerja, anda akan melihat aktiviti di sini. Cipta kursus pertama anda untuk bermula!'
									: "When students enroll or submit work, you'll see the activity here. Create your first course to get started!"}
							</p>
							<Link href="/dashboard/courses/new">
								<Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
									{language === 'bm' ? 'Cipta Kursus' : 'Create Course'} <Plus className="h-4 w-4 ml-2" />
								</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
