'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Edit2, Trash2, Save, X, User, Sparkles, Shield, BookOpen, GraduationCap } from 'lucide-react';

export default function ManageUsersPage() {
	const router = useRouter();
	const { userData, loading: authLoading } = useAuth();
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [editingUserId, setEditingUserId] = useState(null);
	const [editName, setEditName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [deletingUserId, setDeletingUserId] = useState(null);
	const [filterRole, setFilterRole] = useState('all');

	const getRoleIcon = (role) => {
		switch (role) {
			case 'admin': return <Shield className="h-3 w-3 mr-1" />;
			case 'teacher': return <BookOpen className="h-3 w-3 mr-1" />;
			case 'student': return <GraduationCap className="h-3 w-3 mr-1" />;
			default: return <User className="h-3 w-3 mr-1" />;
		}
	};

	const formatRole = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

	const isUserOnline = (user) => {
		if (user.isOnline) return true;
		if (!user.lastSeen) return false;
		const diff = Date.now() - new Date(user.lastSeen).getTime();
		return diff < 2 * 60 * 1000;
	};

	async function loadUsers() {
		try {
			const data = await api.get('/api/users');
			setUsers(data.users || []);
		} catch (err) {
			setError('Failed to load users');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (authLoading) return;
		if (!userData) { router.push('/login'); return; }
		if (userData.role !== 'admin') { router.push('/dashboard/admin'); setLoading(false); return; }
		loadUsers();
	}, [authLoading, userData, router]);

	const startEdit = (user) => {
		setEditingUserId(user._id?.toString() || user.id);
		setEditName(user.name || '');
		setEditEmail(user.email || '');
		setError('');
		setSuccess('');
	};

	const cancelEdit = () => {
		setEditingUserId(null);
		setEditName('');
		setEditEmail('');
		setError('');
		setSuccess('');
	};

	const saveEdit = async () => {
		setError('');
		setSuccess('');
		if (!editName.trim()) { setError('Name is required'); return; }
		try {
			await api.put(`/api/users/${editingUserId}`, { name: editName.trim() });
			setSuccess('User updated successfully!');
			setTimeout(() => setSuccess(''), 3000);
			cancelEdit();
			await loadUsers();
		} catch (err) {
			setError(err.message || 'Failed to update user');
		}
	};

	const handleDelete = async (userId, userName) => {
		if (!confirm(`Are you sure you want to delete ${userName}'s account? This action cannot be undone.`)) return;
		setDeletingUserId(userId);
		setError('');
		setSuccess('');
		try {
			await api.delete(`/api/users/${userId}`);
			setSuccess('User account deleted successfully!');
			setTimeout(() => setSuccess(''), 3000);
			await loadUsers();
		} catch (err) {
			setError(err.message || 'Failed to delete user');
		} finally {
			setDeletingUserId(null);
		}
	};

	const filteredUsers = users.filter(user => filterRole === 'all' || user.role === filterRole);

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading users...</p>
			</div>
		);
	}

	return (
		<div className="-m-6 md:-m-8 lg:-m-10 min-h-screen relative overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white z-0 pointer-events-none"></div>
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
			<div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

			<div className="max-w-5xl mx-auto relative z-10 space-y-8 animate-fadeIn">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent inline-flex items-center gap-2">
							Manage Users <Sparkles className="h-6 w-6 text-yellow-400" />
						</h1>
						<p className="text-muted-foreground mt-2 text-lg">View and manage all user accounts</p>
					</div>
					<div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/50 shadow-sm">
						<span className="text-sm font-medium text-emerald-800">Total Registered: {filteredUsers.length}</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					{['all', 'admin', 'teacher', 'student'].map((r) => (
						<Button
							key={r}
							variant={filterRole === r ? 'default' : 'outline'}
							size="sm"
							onClick={() => setFilterRole(r)}
							className={`capitalize transition-all duration-200 ${filterRole === r
								? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
								: 'bg-white/60 hover:bg-white text-neutral-600 border-white/60 hover:border-white shadow-sm'
								}`}
						>
							{r === 'all' ? <><Users className="h-3 w-3 mr-1" />All Users</> : <>{getRoleIcon(r)}{formatRole(r)}s</>}
						</Button>
					))}
				</div>

				{error && (
					<div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 shadow-sm animate-slideIn">
						<div className="p-1 bg-red-100 rounded-full"><X className="h-4 w-4" /></div>
						<p className="font-medium pt-0.5">{error}</p>
					</div>
				)}

				{success && (
					<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3 text-emerald-600 shadow-sm animate-slideIn">
						<div className="p-1 bg-emerald-100 rounded-full"><Save className="h-4 w-4" /></div>
						<p className="font-medium pt-0.5">{success}</p>
					</div>
				)}

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredUsers.length === 0 ? (
						<div className="col-span-full py-12 text-center bg-white/60 backdrop-blur-sm rounded-2xl border border-white shadow-sm animate-fadeIn">
							<div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Users className="h-8 w-8 text-neutral-400" />
							</div>
							<p className="text-lg font-medium text-neutralDark">No users found</p>
							<p className="text-muted-foreground">Try adjusting your filters or register a new user</p>
						</div>
					) : (
						filteredUsers.map((user) => {
							const uid = user._id?.toString() || user.id;
							const online = isUserOnline(user);
							return (
								<Card key={uid} className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-md group overflow-hidden">
									<CardContent className="p-6">
										{editingUserId === uid ? (
											<div className="space-y-4 animate-fadeIn">
												<div className="space-y-3">
													<div>
														<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Name</label>
														<Input
															value={editName}
															onChange={(e) => setEditName(e.target.value)}
															placeholder="User name"
															className="bg-white/50 border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500"
														/>
													</div>
													<div>
														<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Email</label>
														<Input value={editEmail} disabled className="bg-neutral-50/50 text-neutral-500 border-transparent shadow-none" />
													</div>
													<div className="flex gap-2 pt-2">
														<Button size="sm" onClick={saveEdit} disabled={!editName.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
															<Save className="h-4 w-4 mr-2" />Save
														</Button>
														<Button size="sm" variant="ghost" onClick={cancelEdit} className="flex-1 text-neutral-600 hover:bg-neutral-100">
															<X className="h-4 w-4 mr-2" />Cancel
														</Button>
													</div>
												</div>
											</div>
										) : (
											<div className="flex flex-col h-full">
												<div className="flex items-start justify-between mb-4">
													<div className="relative">
														{user.profilePicture ? (
															<img src={user.profilePicture} alt={user.name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm ring-1 ring-neutral-100" />
														) : (
															<div className="w-16 h-16 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center border-4 border-white shadow-sm ring-1 ring-neutral-100">
																<User className="h-6 w-6 text-neutral-400" />
															</div>
														)}
														<div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-neutral-400'}`} title={online ? 'Online' : 'Offline'}></div>
													</div>
													<div className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border flex items-center ${
														user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200'
														: user.role === 'teacher' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
														: 'bg-blue-100 text-blue-700 border-blue-200'
													}`}>
														{getRoleIcon(user.role)}{formatRole(user.role)}
													</div>
												</div>

												<div className="flex-1">
													<h3 className="text-lg font-bold text-neutralDark mb-1 line-clamp-1 group-hover:text-emerald-700 transition-colors">{user.name}</h3>
													<p className="text-sm text-neutral-500 mb-4 line-clamp-1">{user.email}</p>
													<div className="text-xs text-muted-foreground flex items-center gap-1.5">
														<div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`}></div>
														{online ? (
															<span className="text-green-600 font-medium">Active now</span>
														) : (
															<span>Last seen: {user.lastSeen ? new Date(user.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
														)}
													</div>
												</div>

												<div className="flex items-center gap-2 pt-4 border-t border-neutral-100 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
													<Button variant="secondary" size="sm" onClick={() => startEdit(user)} className="flex-1 bg-neutral-100 hover:bg-white hover:shadow-md text-neutral-700 transition-all font-medium">
														<Edit2 className="h-4 w-4 mr-2" /> Edit
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDelete(uid, user.name)}
														disabled={deletingUserId === uid}
														className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
