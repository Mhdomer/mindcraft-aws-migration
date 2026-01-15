
'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export default function DebugPage() {
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        async function fetchData() {
            const cSnap = await getDocs(collection(db, 'course'));
            setCourses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const uSnap = await getDocs(collection(db, 'user'));
            setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        fetchData();
    }, []);

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Debug Data</h1>

            <h2 className="text-xl font-bold mt-8">Users</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto h-48">
                {JSON.stringify(users, null, 2)}
            </pre>

            <h2 className="text-xl font-bold mt-8">Courses</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto h-96">
                {JSON.stringify(courses, null, 2)}
            </pre>
        </div>
    );
}
