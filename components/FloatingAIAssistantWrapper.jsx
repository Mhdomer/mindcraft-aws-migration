'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import FloatingAIAssistant from './FloatingAIAssistant';

export default function FloatingAIAssistantWrapper() {
	const [userRole, setUserRole] = useState(null);
	const [userId, setUserId] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				try {
					const userDoc = await getDoc(doc(db, 'user', user.uid));
					if (userDoc.exists()) {
						const role = userDoc.data().role;
						setUserRole(role);
					} else {
						setUserRole(null);
					}
				} catch (err) {
					console.error('Error fetching user role:', err);
					setUserRole(null);
				}
			} else {
				setUserId(null);
				setUserRole(null);
			}
		});

		return () => unsubscribe();
	}, []);

	if (!userId || !userRole) {
		return null; // Don't show for guests
	}

	return <FloatingAIAssistant userRole={userRole} userId={userId} />;
}
