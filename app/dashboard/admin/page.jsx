'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserPlus, BookOpen, BarChart3, ArrowRight, Users, FileText, Sparkles, ShieldCheck, Gamepad2, Settings } from 'lucide-react';
import { Metric, Title, Flex, Text } from '@tremor/react';
import { db } from '@/firebase'; // Ensure db is imported
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function AdminDashboard() {
	const [stats, setStats] = useState({
		users: 0,
		courses: 0,
		activeSessions: 0 // Placeholder or real implementation
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchStats() {
			try {
				// Fetch Users Count
				const usersSnap = await getDocs(collection(db, 'users'));
				const usersCount = usersSnap.size;

				// Fetch Courses Count
				const coursesSnap = await getDocs(collection(db, 'course'));
				const coursesCount = coursesSnap.size;

				setStats({
					users: usersCount,
					courses: coursesCount,
					activeSessions: '-' // Placeholder
				});
			} catch (error) {
				console.error("Error fetching admin stats:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchStats();
	}, []);

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-full relative overflow-hidden">
			{/* Premium Background Design */}
			<div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="space-y-8 animate-fadeIn p-6 md:p-8 lg:p-10 relative z-10 w-full max-w-7xl mx-auto">
				{/* Page Header */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<h1 className="text-h1 text-neutralDark flex items-center gap-3">
							<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
								Admin Dashboard
							</span>
							<ShieldCheck className="h-6 w-6 text-blue-500 hidden md:block" />
						</h1>
						<p className="text-body text-muted-foreground mt-1">Manage users, courses, and platform activity</p>
					</div>
					<div className="hidden md:block">
						<p className="text-sm font-medium text-muted-foreground bg-white/50 px-4 py-2 rounded-full border border-gray-100">
							{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
						</p>
					</div>
				</div>

				{/* Quick Stats */}
				<div className="grid gap-6 md:grid-cols-3">
					<Link href="/admin/users" className="group">
						<Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-primary/5 relative overflow-hidden h-full">
							<div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-all duration-500"></div>
							<CardHeader className="pb-3 z-10 relative">
								<Flex justifyContent="start" className="gap-3">
									<div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
										<Users className="h-5 w-5 text-primary" />
									</div>
									<CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">Total Users</CardTitle>
								</Flex>
							</CardHeader>
							<CardContent className="z-10 relative">
								<Metric className="text-3xl font-bold text-neutralDark">{loading ? '-' : stats.users}</Metric>
								<Text className="text-sm text-muted-foreground mt-1">Across all roles</Text>
							</CardContent>
						</Card>
					</Link>

					<Link href="/admin/courses" className="group">
						<Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/50 relative overflow-hidden h-full">
							<div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all duration-500"></div>
							<CardHeader className="pb-3 z-10 relative">
								<Flex justifyContent="start" className="gap-3">
									<div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
										<BookOpen className="h-5 w-5 text-emerald-500" />
									</div>
									<CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">Total Courses</CardTitle>
								</Flex>
							</CardHeader>
							<CardContent className="z-10 relative">
								<Metric className="text-3xl font-bold text-neutralDark">{loading ? '-' : stats.courses}</Metric>
								<Text className="text-sm text-muted-foreground mt-1">Published and draft</Text>
							</CardContent>
						</Card>
					</Link>

					<Card className="card-hover border-none shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-orange-50/50 relative overflow-hidden h-full">
						<div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all duration-500"></div>
						<CardHeader className="pb-3 z-10 relative">
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-300">
									<FileText className="h-5 w-5 text-orange-500" />
								</div>
								<CardTitle className="text-md font-medium text-muted-foreground uppercase tracking-wide text-xs">Active Sessions</CardTitle>
							</Flex>
						</CardHeader>
						<CardContent className="z-10 relative">
							<Metric className="text-3xl font-bold text-neutralDark">-</Metric>
							<Text className="text-sm text-muted-foreground mt-1">Currently online</Text>
						</CardContent>
					</Card>
				</div>

				{/* Action Cards */}
				<div>
					<div className="flex items-center gap-2 mb-6">
						<div className="h-6 w-1 bg-primary rounded-full"></div>
						<h2 className="text-h2 text-neutralDark">Quick Actions</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						<Link href="/admin/register" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-primary/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300">
										<UserPlus className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">User Management</h3>
										<p className="text-sm text-muted-foreground">Register teachers and students</p>
									</div>
									<Button size="sm" variant="ghost" className="text-primary mt-2 group-hover:bg-primary/10">
										Go to Register <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link href="/admin/courses" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-emerald-500/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-emerald-100 rounded-full group-hover:bg-emerald-200 transition-colors duration-300">
										<BookOpen className="h-8 w-8 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">Course Management</h3>
										<p className="text-sm text-muted-foreground">Approve and manage courses</p>
									</div>
									<Button size="sm" variant="ghost" className="text-emerald-600 mt-2 group-hover:bg-emerald-100">
										View Courses <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link href="/admin/settings" className="group">
							<Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-2 group-hover:ring-gray-500/20">
								<CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
									<div className="p-4 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors duration-300">
										<Settings className="h-8 w-8 text-gray-600 group-hover:scale-110 transition-transform duration-300" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-neutralDark mb-1">Settings</h3>
										<p className="text-sm text-muted-foreground">Platform configuration</p>
									</div>
									<Button size="sm" variant="ghost" className="text-gray-600 mt-2 group-hover:bg-gray-100">
										Configure <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</Link>

					</div>
				</div>
			</div>
		</div>
	);
}

