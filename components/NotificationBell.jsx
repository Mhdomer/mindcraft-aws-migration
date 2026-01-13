'use client';

import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, CheckCircle, Info, Clock, BookOpen, Lightbulb, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/contexts/AuthContext';

export default function NotificationBell() {
	const { language } = useLanguage();
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [showDropdown, setShowDropdown] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const { userData } = useAuth(); // for role

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setCurrentUserId(user?.uid || null);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!currentUserId) return;

		// 1. Notification Collection Listener
		const notifQuery = query(
			collection(db, 'notification'),
			where('userId', '==', currentUserId)
		);

		const unsubNotifications = onSnapshot(notifQuery, (snapshot) => {
			const notificationsList = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
				source: 'notification'
			}));
			updateCombinedNotifications(notificationsList, 'notification');
		});

		// 2. Messages Collection Listener
		let messageQuery = null;

		if (userData?.role === 'teacher' || userData?.role === 'admin') {
			messageQuery = query(
				collection(db, 'messages'),
				where('type', '==', 'student_inquiry')
			);
		} else {
			messageQuery = query(
				collection(db, 'messages'),
				where('toUserId', '==', currentUserId)
			);
		}

		let unsubMessages = () => { };
		if (messageQuery) {
			unsubMessages = onSnapshot(messageQuery, (snapshot) => {
				const messagesList = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
					title: doc.data().subject || 'New Message',
					message: doc.data().message,
					type: 'message',
					source: 'messages',
					riskLevel: 'low',
					createdAt: doc.data().createdAt // Ensure timestamp is passed
				}));
				updateCombinedNotifications(messagesList, 'messages');
			});
		}

		// 3. Study Plan Listener & Polling (Local Check)
		let unsubStudyPlans = () => { };
		let checkInterval = null;

		const studyPlansRef = collection(db, 'user', currentUserId, 'study_plans');
		const studyPlansQuery = query(studyPlansRef, where('active', '==', true)); // Get active plans

		// Store plans in a local var to be checked by interval (using a ref would be better but simple var in closure works for effect)
		let currentPlans = [];

		unsubStudyPlans = onSnapshot(studyPlansQuery, (snapshot) => {
			currentPlans = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});

		// Check every 30 seconds
		checkInterval = setInterval(async () => {
			const now = new Date();

			for (const plan of currentPlans) {
				if (plan.notified) continue; // Skip if already notified

				const scheduledTime = new Date(plan.scheduledAt);

				// Check if time is reached (or passed within last 15 mins to avoid huge backlog alerts)
				// Allow a small buffer (e.g. if now is 10:00:15 and schedule was 10:00:00)
				if (scheduledTime <= now) {
					// Time reached!
					try {
						// 1. Mark as notified immediately to prevent double firing locally while async ops finish
						plan.notified = true;

						// 2. Add System Notification
						await addDoc(collection(db, 'notification'), {
							userId: currentUserId,
							title: language === 'bm' ? 'Masa Belajar Telah Tiba!' : 'Study Time Reached!',
							message: language === 'bm'
								? `Sudah tiba masanya untuk sesi belajar ${plan.duration} minit anda.`
								: `It's time for your ${plan.duration} minute study session.`,
							type: 'risk_alert', // Use existing type for icon
							riskLevel: 'medium', // Use yellow icon
							read: false,
							createdAt: serverTimestamp(),
							source: 'study_plan'
						});

						// 3. Update Firestore to persist notified state
						const planRef = doc(db, 'user', currentUserId, 'study_plans', plan.id);
						await updateDoc(planRef, { notified: true });

					} catch (err) {
						console.error("Error triggering study alert:", err);
					}
				}
			}
		}, 30000); // Check every 30s

		return () => {
			unsubNotifications();
			unsubMessages();
			unsubStudyPlans();
			if (checkInterval) clearInterval(checkInterval);
		};
	}, [currentUserId, userData]);

	// Helper to manage merging multiple streams
	const [notificationStreams, setNotificationStreams] = useState({ notification: [], messages: [] });

	const updateCombinedNotifications = (newData, streamKey) => {
		setNotificationStreams(prev => {
			const updated = { ...prev, [streamKey]: newData };
			const combined = [...updated.notification, ...updated.messages].sort((a, b) => {
				const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
				const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
				return timeB - timeA;
			});

			setNotifications(combined);
			setUnreadCount(combined.filter(n => !n.read).length);
			return updated;
		});
	};

	async function markAsRead(notificationId, source) {
		try {
			const collectionName = source === 'messages' ? 'messages' : 'notification';
			const notifRef = doc(db, collectionName, notificationId);
			await updateDoc(notifRef, { read: true });
		} catch (err) {
			console.error('Error marking notification as read:', err);
		}
	}

	async function markAllAsRead() {
		const unreadNotifications = notifications.filter(n => !n.read);
		if (unreadNotifications.length === 0) return;

		try {
			const batch = writeBatch(db);
			unreadNotifications.forEach(notif => {
				const collectionName = notif.source === 'messages' ? 'messages' : 'notification';
				const notifRef = doc(db, collectionName, notif.id);
				batch.update(notifRef, { read: true });
			});
			await batch.commit();
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
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

	if (!currentUserId) return null;

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
											: 'You\'ll receive notifications here when there are updates'}
									</p>
								</div>
							) : (
								<div className="divide-y divide-neutralLight">
									{notifications.map((notification) => {
										const isUnread = !notification.read;
										const isHighRisk = notification.riskLevel === 'high';
										const isMediumRisk = notification.riskLevel === 'medium';

										return (
											<div
												key={notification.id}
												className={`group relative p-4 transition-all duration-200 cursor-pointer ${isUnread
													? 'bg-gradient-to-r from-blue-50 via-blue-50/50 to-white border-l-4 border-primary'
													: 'bg-white hover:bg-neutralLight/50'
													}`}
												onClick={() => {
													if (!notification.read) {
														markAsRead(notification.id, notification.source);
													}
												}}
											>
												{isUnread && (
													<div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
												)}
												<div className="flex items-start gap-3">
													{getNotificationIcon(notification.type, notification.riskLevel)}
													<div className="flex-1 min-w-0">
														<div className="flex items-start justify-between gap-3 mb-1">
															<h4 className={`text-sm font-semibold leading-tight ${isUnread ? 'text-neutralDark' : 'text-neutralDark/80'
																}`}>
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
																	<AlertTriangle className={`h-3.5 w-3.5 ${isHighRisk ? 'text-red-600' : 'text-yellow-600'
																		}`} />
																	<span className="text-xs font-semibold text-neutralDark">
																		{language === 'bm' ? 'Faktor Risiko' : 'Risk Factors'}
																	</span>
																</div>
																<ul className="space-y-1.5">
																	{notification.riskReasons.map((reason, idx) => (
																		<li key={idx} className="text-xs text-neutralDark flex items-start gap-2">
																			<span className={`mt-0.5 ${isHighRisk ? 'text-red-500' : 'text-yellow-500'
																				}`}>•</span>
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
																<span className="truncate">
																	{notification.courseTitle}
																</span>
															</div>
														)}

														<div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
															<Clock className="h-3 w-3" />
															<span>
																{formatTimeAgo(notification.createdAt)}
															</span>
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
