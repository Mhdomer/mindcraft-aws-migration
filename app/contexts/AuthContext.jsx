'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Initial fetch
                try {
                    setLoading(true);
                    const userDocRef = doc(db, 'user', currentUser.uid);

                    // Subscribe to real-time changes for the user profile
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
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
