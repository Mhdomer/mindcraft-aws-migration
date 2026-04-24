'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertTriangle, CheckCircle, Info, Clock, BookOpen, Lightbulb, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/lib/api';

export default function NotificationBell() {
	const { language } = useLanguage();
	const { userData } = useAuth();
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [showDropdown, setShowDropdown] = useState(false);

	const fetchNotifications = useCallback(async () => {
		if (!userData) return;
		try {
			const data = await api.get('/api/notifications');
			const list = data.notifications || [];
			setNotifications(list);
			setUnreadCount(list.filter(n => !n.read).length);
		} catch (err) {
			// Silently fail — bell should not break the page
		}
	}, [userData]);

	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30000);
		return () => clearInterval(interval);
	}, [fetchNotifications]);

	async function markAsRead(notificationId) {
		try {
			await api.patch(`/api/notifications/${notificationId}/read`);
			setNotifications(prev =>
				prev.map(n => n._id === notificationId || n.id === notificationId ? { ...n, read: true } : n)
			);
			setUnreadCount(prev => Math.max(0, prev - 1));
		} catch (err) {
			console.error('Error marking notification as read:', err);
		}
	}

	async function markAllAsRead() {
		const unread = notifications.filter(n => !n.read);
		if (unread.length === 0) return;
		try {
			await api.patch('/api/notifications/read-all');
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
			setUnreadCount(0);
		} catch (err) {
			console.error('Error marking all as read:', err);
		}
	}

	function getNotificationIcon(type, riskLevel) {
		const iconClass = "h-5 w-5 flex-shrink-0";
		switch (type) {
			case 'risk_alert':
				if (riskLevel === 'high') {
					return <div className={`${iconClass} rounded-full bg-red-100 p-1.5 flex items-center justify-center`}>
						<AlertTriangle className="h-3.5 w-3.5 text-red-600" />
					</div>;
				}
				return <div className={`${iconClass} rounded-full bg-yellow-100 p-1.5 flex items-center justify-center`}>
					<AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
				</div>;
			case 'message':
				return <div className={`${iconClass} rounded-full bg-purple-100 p-1.5 flex items-center justify-center`}>
					<Mail className="h-3.5 w-3.5 text-purple-600" />
				</div>;
			case 'feedback_released':
				return <div className={`${iconClass} rounded-full bg-green-100 p-1.5 flex items-center justify-center`}>
					<CheckCircle className="h-3.5 w-3.5 text-green-600" />
				</div>;
			default:
				return <div className={`${iconClass} rounded-full bg-blue-100 p-1.5 flex items-center justify-center`}>
					<Info className="h-3.5 w-3.5 text-blue-600" />
				</div>;
		}
	}

	function formatTimeAgo(timestamp) {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		const now = new Date();
		const diffInSeconds = Math.floor((now - date) / 1000);

		if (diffInSeconds < 60) return language === 'bm' ? 'Baru sahaja' : 'Just now';
		if (diffInSeconds < 3600) {
			const mins = Math.floor(diffInSeconds / 60);
			return language === 'bm' ? `${mins} minit lalu` : `${mins}m ago`;
		}
		if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return language === 'bm' ? `${hours} jam lalu` : `${hours}h ago`;
		}
		if (diffInSeconds < 604800) {
			const days = Math.floor(diffInSeconds / 86400);
			return language === 'bm' ? `${days} hari lalu` : `${days}d ago`;
		}
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	if (!userData) return null;

	return (
		<div className="relative">
			<button
				onClick={() => setShowDropdown(!showDropdown)}
				className="relative p-2 rounded-lg hover:bg-neutralLight transition-all duration-200 hover:scale-105"
				aria-label={language === 'bm' ? 'Notifikasi' : 'Notifications'}
			>
				<Bell className="h-5 w-5 text-neutralDark" />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-md">
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				)}
			</button>

			{showDropdown && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
						onClick={() => setShowDropdown(false)}
					/>
					<Card className="absolute right-0 mt-2 w-[420px] max-h-[600px] overflow-hidden z-50 shadow-2xl border-2 border-primary/10 animate-in fade-in slide-in-from-top-2 duration-200">
						<CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
							<div className="flex items-center gap-2">
								<Bell className="h-5 w-5 text-primary" />
								<CardTitle className="text-h4">
									{language === 'bm' ? 'Notifikasi' : 'Notifications'}
								</CardTitle>
								{unreadCount > 0 && (
									<span className="px-2 py-0.5 bg-primary text-white text-xs font-semibold rounded-full animate-pulse">
										{unreadCount} {language === 'bm' ? 'baru' : 'new'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-1">
								{unreadCount > 0 && (
									<Button
										variant="ghost"
										size="sm"
										onClick={markAllAsRead}
										className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
									>
										{language === 'bm' ? 'Tandai semua dibaca' : 'Mark all read'}
									</Button>
								)}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowDropdown(false)}
									className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent className="p-0 overflow-y-auto max-h-[520px]">
							{notifications.length === 0 ? (
								<div className="p-12 text-center">
									<div className="mx-auto w-16 h-16 bg-neutralLight rounded-full flex items-center justify-center mb-4">
										<Bell className="h-8 w-8 text-muted-foreground" />
									</div>
									<p className="text-body text-muted-foreground font-medium">
										{language === 'bm' ? 'Tiada notifikasi' : 'No notifications'}
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{language === 'bm'
											? 'Anda akan menerima notifikasi di sini apabila ada kemas kini'
											: "You'll receive notifications here when there are updates"}
									</p>
								</div>
							) : (
								<div className="divide-y divide-neutralLight">
									{notifications.map((notification) => {
										const id = notification._id || notification.id;
										const isUnread = !notification.read;
										const isHighRisk = notification.riskLevel === 'high';
										const isMediumRisk = notification.riskLevel === 'medium';

										return (
											<div
												key={id}
												className={`group relative p-4 transition-all duration-200 cursor-pointer ${isUnread
													? 'bg-gradient-to-r from-blue-50 via-blue-50/50 to-white border-l-4 border-primary'
													: 'bg-white hover:bg-neutralLight/50'
													}`}
												onClick={() => {
													if (!notification.read) markAsRead(id);
												}}
											>
												{isUnread && (
													<div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
												)}
												<div className="flex items-start gap-3">
													{getNotificationIcon(notification.type, notification.riskLevel)}
													<div className="flex-1 min-w-0">
														<div className="flex items-start justify-between gap-3 mb-1">
															<h4 className={`text-sm font-semibold leading-tight ${isUnread ? 'text-neutralDark' : 'text-neutralDark/80'}`}>
																{notification.title}
															</h4>
															{isUnread && (
																<span className="h-2.5 w-2.5 bg-primary rounded-full flex-shrink-0 mt-1 animate-pulse" />
															)}
														</div>
														<p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
															{notification.message}
														</p>

														{notification.riskReasons && notification.riskReasons.length > 0 && (
															<div className={`mt-3 p-3 rounded-lg border ${isHighRisk
																? 'bg-red-50 border-red-200'
																: isMediumRisk
																	? 'bg-yellow-50 border-yellow-200'
																	: 'bg-neutralLight border-border'
																}`}>
																<div className="flex items-center gap-1.5 mb-2">
																	<AlertTriangle className={`h-3.5 w-3.5 ${isHighRisk ? 'text-red-600' : 'text-yellow-600'}`} />
																	<span className="text-xs font-semibold text-neutralDark">
																		{language === 'bm' ? 'Faktor Risiko' : 'Risk Factors'}
																	</span>
																</div>
																<ul className="space-y-1.5">
																	{notification.riskReasons.map((reason, idx) => (
																		<li key={idx} className="text-xs text-neutralDark flex items-start gap-2">
																			<span className={`mt-0.5 ${isHighRisk ? 'text-red-500' : 'text-yellow-500'}`}>•</span>
																			<span className="flex-1">{reason}</span>
																		</li>
																	))}
																</ul>
															</div>
														)}

														{notification.guidance && (
															<div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
																<div className="flex items-start gap-2">
																	<Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
																	<div className="flex-1">
																		<span className="text-xs font-semibold text-primary">
																			{language === 'bm' ? 'Panduan Guru:' : 'Teacher Guidance:'}
																		</span>
																		<p className="text-xs text-neutralDark mt-1 leading-relaxed">
																			{notification.guidance}
																		</p>
																	</div>
																</div>
															</div>
														)}

														{notification.courseTitle && (
															<div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
																<BookOpen className="h-3 w-3" />
																<span className="truncate">{notification.courseTitle}</span>
															</div>
														)}

														<div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
															<Clock className="h-3 w-3" />
															<span>{formatTimeAgo(notification.createdAt)}</span>
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
