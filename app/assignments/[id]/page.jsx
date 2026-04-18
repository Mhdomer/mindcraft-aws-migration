'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Edit2, AlertCircle, CheckCircle, XCircle, Save } from 'lucide-react';
import Link from 'next/link';

export default function AssignmentDetailPage({ params }) {
    const { userData } = useAuth();
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { id } = params;

    const userRole = userData?.role;
    const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

    useEffect(() => {
        if (id) loadAssignment();
    }, [id]);

    async function loadAssignment() {
        setLoading(true);
        try {
            const { assignment: data } = await api.get(`/api/assignments/${id}`);
            setAssignment({ ...data, id: data._id });
        } catch (err) {
            setError(err.message || 'Failed to load assignment details');
        } finally {
            setLoading(false);
        }
    }

    function formatDate(ts) {
        if (!ts) return 'No date set';
        return new Date(ts).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    if (loading) {
        return (
            <div className="space-y-8">
                <Button variant="ghost" disabled><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <div className="h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading assignment details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-8">
                <Link href="/assignments"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments</Button></Link>
                <Card className="border-destructive/50">
                    <CardContent className="pt-6 text-center text-destructive">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-medium">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!assignment) return null;

    if (!isTeacherOrAdmin && assignment.status !== 'published') {
        return (
            <div className="space-y-8">
                <Link href="/assignments"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments</Button></Link>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">This assignment is not available.</p>
                </div>
            </div>
        );
    }

    const deadlinePassed = assignment.deadline ? new Date(assignment.deadline) < new Date() : false;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Link href="/assignments">
                    <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Assignments</Button>
                </Link>
                {isTeacherOrAdmin && (
                    <Link href={`/assignments/${id}/edit`}>
                        <Button><Edit2 className="h-4 w-4 mr-2" /> Edit Assignment</Button>
                    </Link>
                )}
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                    <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                {assignment.courseTitle && (
                                    <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                        {assignment.courseTitle}
                                    </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                    assignment.status === 'published'
                                        ? 'bg-success/10 text-success border-success/20'
                                        : 'bg-warning/10 text-warning border-warning/20'
                                }`}>
                                    {assignment.status === 'published' ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            <CardTitle className="text-3xl text-neutralDark">{assignment.title}</CardTitle>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    <div className="flex flex-wrap gap-6 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <Calendar className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-primary'}`} />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Deadline</p>
                                <p className={`text-sm font-semibold ${deadlinePassed ? 'text-destructive' : 'text-foreground'}`}>
                                    {formatDate(assignment.deadline)}
                                </p>
                            </div>
                        </div>
                        {assignment.allowLateSubmissions && (
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-warning" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Late Policy</p>
                                    <p className="text-sm font-semibold">Late submissions allowed</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-neutralDark">Instructions</h3>
                        <div className="prose max-w-none text-body text-neutralDark/80" dangerouslySetInnerHTML={{ __html: assignment.description }} />
                    </div>

                    {!isTeacherOrAdmin && (
                        <div className="pt-8 border-t flex justify-center">
                            {!deadlinePassed || assignment.allowLateSubmissions ? (
                                <Link href={`/assignments/${id}/submit`}>
                                    <Button size="lg" className="px-12 h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                        <Save className="h-5 w-5 mr-2" /> Submit Your Assignment
                                    </Button>
                                </Link>
                            ) : (
                                <div className="p-4 bg-muted rounded-lg text-center w-full max-w-md border border-border">
                                    <p className="font-semibold text-muted-foreground italic">
                                        Submissions are currently closed for this assignment.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
