'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function ResultDetailsModal({ isOpen, onClose, submission }) {
    const { language } = useLanguage();
    if (!isOpen || !submission) return null;

    const { answers, score, totalPoints } = submission;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-200">
                <CardHeader className="border-b sticky top-0 bg-white z-10 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">
                            {language === 'bm' ? 'Keputusan Penilaian' : 'Assessment Results'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {language === 'bm' ? 'Markah' : 'Score'}: {score} / {totalPoints} ({((score / totalPoints) * 100).toFixed(1)}%)
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {Object.entries(answers).map(([key, result], index) => (
                        <div key={key} className={`p-4 rounded-lg border-2 ${result.isCorrect ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <h4 className="font-semibold text-neutralDark">
                                    {language === 'bm' ? 'Soalan' : 'Question'} {index + 1}: {result.question}
                                </h4>
                                {result.isCorrect ? (
                                    <span className="flex items-center gap-1.5 text-success font-medium text-sm whitespace-nowrap">
                                        <CheckCircle className="h-4 w-4" />
                                        {language === 'bm' ? 'Betul' : 'Correct'}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-destructive font-medium text-sm whitespace-nowrap">
                                        <XCircle className="h-4 w-4" />
                                        {language === 'bm' ? 'Salah' : 'Incorrect'}
                                    </span>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {language === 'bm' ? 'Jawapan Anda' : 'Your Answer'}
                                    </p>
                                    <p className={`text-sm p-2 rounded ${result.isCorrect ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                        {result.type === 'mcq'
                                            ? (result.options && result.options[result.studentAnswer] !== undefined ? result.options[result.studentAnswer] : (language === 'bm' ? 'Tiada jawapan' : 'No answer'))
                                            : (result.studentAnswer || (language === 'bm' ? 'Tiada jawapan' : 'No answer'))}
                                    </p>
                                </div>
                                {!result.isCorrect && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            {language === 'bm' ? 'Jawapan Betul' : 'Correct Answer'}
                                        </p>
                                        <p className="text-sm p-2 rounded bg-neutralLight text-neutralDark">
                                            {result.type === 'mcq'
                                                ? (result.options && result.options[result.correctAnswer] !== undefined ? result.options[result.correctAnswer] : 'N/A')
                                                : (result.correctAnswer || 'N/A')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex justify-end">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {language === 'bm' ? 'Mata' : 'Points'}: {result.earned} / {result.points}
                                </span>
                            </div>
                        </div>
                    ))}
                </CardContent>
                <div className="border-t p-4 flex justify-end sticky bottom-0 bg-white z-10">
                    <Button onClick={onClose} className="px-8">{language === 'bm' ? 'Tutup' : 'Close'}</Button>
                </div>
            </Card>
        </div>
    );
}
