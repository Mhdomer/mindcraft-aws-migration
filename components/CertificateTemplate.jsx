import React, { forwardRef } from 'react';
import { Award, GraduationCap } from 'lucide-react';

const CertificateTemplate = forwardRef(({ studentName, courseName, completionDate, instructorName, language = 'en' }, ref) => {
    return (
        <div ref={ref} className="w-[800px] h-[600px] bg-white p-8 relative overflow-hidden text-neutral-900 font-serif" style={{ minWidth: '800px', minHeight: '600px' }}>
            {/* Decorative Border */}
            <div className="absolute inset-4 border-4 border-double border-amber-500/30 rounded-lg pointer-events-none"></div>
            <div className="absolute inset-6 border border-amber-500/20 rounded-sm pointer-events-none"></div>

            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <GraduationCap size={400} />
            </div>

            <div className="h-full flex flex-col items-center justify-center text-center relative z-10 px-12">
                {/* Header */}
                <div className="mb-8">
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-white">
                        <Award size={32} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-widest uppercase text-amber-600 mb-2 font-serif">
                        {language === 'bm' ? 'Sijil Tamat Kursus' : 'Certificate of Completion'}
                    </h1>
                    <p className="text-sm text-neutral-500 uppercase tracking-[0.2em] font-sans">
                        {language === 'bm' ? 'Ini memperakui bahawa' : 'This certifies that'}
                    </p>
                </div>

                {/* Main Content */}
                <div className="mb-8 space-y-6 flex-grow flex flex-col justify-center w-full">
                    {/* Student Name Section */}
                    <div className="w-full border-b border-neutral-200/60 pb-6 mb-2">
                        <h2 className="text-5xl font-bold text-neutral-800 italic font-serif leading-tight">
                            {studentName}
                        </h2>
                    </div>

                    {/* Completion Text */}
                    <p className="text-neutral-600 font-sans text-lg tracking-wide">
                        {language === 'bm' ? 'telah berjaya menamatkan kursus' : 'has successfully completed the course'}
                    </p>

                    {/* Course Title */}
                    <h3 className="text-4xl font-bold text-neutral-900 border-b-2 border-amber-500/20 inline-block pb-4 px-8 mx-auto max-w-3xl leading-tight">
                        {courseName}
                    </h3>

                    {/* Description */}
                    <p className="text-neutral-500 text-sm max-w-lg mx-auto leading-relaxed mt-2 font-sans">
                        {language === 'bm'
                            ? 'Mempamerkan dedikasi dan penguasaan kurikulum yang luar biasa, termasuk semua modul, penilaian, dan tugasan praktikal yang diperlukan.'
                            : 'Demonstrating exceptional dedication and mastery of the curriculum, including all required modules, assessments, and practical assignments.'}
                    </p>
                </div>

                {/* Footer / Signatures */}
                <div className="w-full flex justify-between items-end px-12 pb-8">
                    <div className="text-center flex flex-col items-center">
                        <span className="font-sans text-xl text-neutral-800 mb-1 font-semibold">{completionDate}</span>
                        <div className="w-48 border-b border-neutral-300 mb-2"></div>
                        <p className="text-xs uppercase tracking-wider text-neutral-400 font-sans">
                            {language === 'bm' ? 'Tarikh Tamat' : 'Date Completed'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-12 h-12 bg-amber-100/50 rounded-full flex items-center justify-center text-amber-600">
                            <GraduationCap size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">MindCraft</p>
                            <p className="text-xs text-neutral-400 uppercase">
                                {language === 'bm' ? 'Akademi' : 'Academy'}
                            </p>
                        </div>
                    </div>

                    <div className="text-center flex flex-col items-center">
                        <span className="font-serif italic text-2xl text-neutral-800 mb-1 px-2">
                            {instructorName || 'MindCraft Instructor'}
                        </span>
                        <div className="w-48 border-b border-neutral-300 mb-2"></div>
                        <p className="text-xs uppercase tracking-wider text-neutral-400 font-sans">
                            {language === 'bm' ? 'Tandatangan Pengajar' : 'Instructor Signature'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});

CertificateTemplate.displayName = 'CertificateTemplate';

export default CertificateTemplate;
