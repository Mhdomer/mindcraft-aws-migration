'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import FloatingAIAssistant from './FloatingAIAssistant';

export default function FloatingAIAssistantWrapper() {
	const { userData } = useAuth();

	if (!userData) return null;

	return <FloatingAIAssistant userRole={userData.role} userId={userData._id?.toString()} />;
}
