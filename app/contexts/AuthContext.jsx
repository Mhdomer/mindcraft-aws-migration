'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

const AuthContext = createContext({
    user: null,
    userData: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeFirestore = null;
        let heartbeatInterval = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Initial fetch
                try {
                    setLoading(true);
                    const userDocRef = doc(db, 'user', currentUser.uid);

                    // 1. Set online status immediately
                    await updateDoc(userDocRef, {
                        isOnline: true,
                        lastSeen: serverTimestamp()
                    });

                    // 2. Heartbeat: Update every 60 seconds
                    heartbeatInterval = setInterval(async () => {
                        await updateDoc(userDocRef, {
                            isOnline: true,
                            lastSeen: serverTimestamp()
                        });
                    }, 60000);

                    // 3. Subscribe to real-time changes for the user profile
                    unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setUserData(docSnap.data());
                        } else {
                            setUserData(null);
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error("Error fetching user profile:", error);
                        setLoading(false);
                    });
                } catch (error) {
                    console.error("Error setting up user listener:", error);
                    setLoading(false);
                }
            } else {
                setUserData(null);
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                    heartbeatInterval = null;
                }
                setLoading(false);
            }
        });

        // Cleanup on unmount (e.g. tab close/refresh)
        // Note: This isn't guaranteed to fire on all close events, but helps.
        // True "presence" usually requires Realtime Database 'onDisconnect', 
        // but this heartbeat + active timestamp check is sufficient for this requirement.
        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        };
    }, []);

    // Session Timeout Logic (1 Hour)
    useEffect(() => {
        if (!user) return;

        let timeoutId;
        const TIMEOUT_DURATION = 3600000; // 1 hour in milliseconds

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('Session expired due to inactivity.');
                auth.signOut();
            }, TIMEOUT_DURATION);
        };

        // Events to listen for
        const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'];

        // Add listeners
        events.forEach(event => document.addEventListener(event, resetTimer));

        // Start timer initially
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
