'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DebugPage() {
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        async function fetchData() {
            const [cData, uData] = await Promise.allSettled([
                api.get('/api/courses'),
                api.get('/api/users'),
            ]);
            if (cData.status === 'fulfilled') setCourses(cData.value.courses || []);
            if (uData.status === 'fulfilled') setUsers(uData.value.users || []);
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
