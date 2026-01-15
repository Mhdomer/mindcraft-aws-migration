'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, HelpCircle, MessageCircle, ChevronDown, ChevronUp, Send, Star } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

const faqs = {
	en: [
		{
			id: 1,
			question: 'How do I enroll in a course?',
			answer: 'To enroll in a course, navigate to the Courses section from the sidebar, browse available courses, and click "Enroll" on any course you\'re interested in. Once enrolled, you\'ll see it in your "My Courses" section.',
		},
		{
			id: 2,
			question: 'How do I take an assessment?',
			answer: 'Assessments are available under the Activities section. Click on "Assessments" to see all available assessments. Click "Start Assessment" to begin. Make sure you\'ve completed the related lessons before attempting assessments.',
		},
		{
			id: 3,
			question: 'What is the AI Assistant and how do I use it?',
			answer: 'The AI Assistant is a floating button (brain icon) in the bottom-right corner of your screen. Click it to ask questions about concepts, get coding help, or receive guidance on your current page. It can help explain database concepts, provide hints for assessments, and answer general questions.',
		},
		{
			id: 4,
			question: 'How do I track my progress?',
			answer: 'Your progress is automatically tracked as you complete lessons and assessments. Visit the "Progress" section from the sidebar to see your overall progress, completed courses, and performance metrics.',
		},
		{
			id: 5,
			question: 'Can I retake assessments?',
			answer: 'Yes, you can retake most assessments. However, some assessments may have restrictions. Check the assessment details before starting. Your best score is usually recorded.',
		},
		{
			id: 6,
			question: 'How do I submit assignments?',
			answer: 'Navigate to Activities → Assignments to see all available assignments. Click on an assignment to view details, then click "Submit Assignment" to upload your work. Make sure to follow the submission guidelines.',
		},
		{
			id: 7,
			question: 'What are Game Levels?',
			answer: 'Game Levels are interactive learning activities that make learning fun. Access them through Activities → Game Levels. Each level teaches database concepts through puzzles, drag-and-drop exercises, and code challenges.',
		},
		{
			id: 8,
			question: 'How do I change my language preference?',
			answer: 'Go to Account → Settings to change your language preference between English and Bahasa Malaysia. Your preference will be saved and applied across the platform.',
		},
	],
	bm: [
		{
			id: 1,
			question: 'Bagaimana saya boleh mendaftar dalam kursus?',
			answer: 'Untuk mendaftar dalam kursus, pergi ke bahagian Kursus dari bar sisi, layari kursus yang tersedia, dan klik "Daftar" pada mana-mana kursus yang anda minati. Setelah mendaftar, anda akan melihatnya dalam bahagian "Kursus Saya".',
		},
		{
			id: 2,
			question: 'Bagaimana saya boleh mengambil penilaian?',
			answer: 'Penilaian tersedia di bawah bahagian Aktiviti. Klik pada "Penilaian" untuk melihat semua penilaian yang tersedia. Klik "Mula Penilaian" untuk bermula. Pastikan anda telah menyelesaikan pelajaran yang berkaitan sebelum cuba penilaian.',
		},
		{
			id: 3,
			question: 'Apakah Pembantu AI dan bagaimana saya menggunakannya?',
			answer: 'Pembantu AI adalah butang terapung (ikon otak) di sudut kanan bawah skrin anda. Klik untuk bertanya tentang konsep, mendapatkan bantuan pengaturcaraan, atau menerima panduan tentang halaman semasa anda. Ia boleh membantu menerangkan konsep pangkalan data, memberikan petunjuk untuk penilaian, dan menjawab soalan umum.',
		},
		{
			id: 4,
			question: 'Bagaimana saya boleh menjejaki kemajuan saya?',
			answer: 'Kemajuan anda secara automatik dikesan semasa anda menyelesaikan pelajaran dan penilaian. Lawati bahagian "Kemajuan" dari bar sisi untuk melihat kemajuan keseluruhan, kursus yang diselesaikan, dan metrik prestasi.',
		},
		{
			id: 5,
			question: 'Bolehkah saya mengambil semula penilaian?',
			answer: 'Ya, anda boleh mengambil semula kebanyakan penilaian. Walau bagaimanapun, beberapa penilaian mungkin mempunyai sekatan. Semak butiran penilaian sebelum bermula. Skor terbaik anda biasanya direkodkan.',
		},
		{
			id: 6,
			question: 'Bagaimana saya boleh menghantar tugasan?',
			answer: 'Pergi ke Aktiviti → Tugasan untuk melihat semua tugasan yang tersedia. Klik pada tugasan untuk melihat butiran, kemudian klik "Hantar Tugasan" untuk memuat naik kerja anda. Pastikan untuk mengikuti garis panduan penghantaran.',
		},
		{
			id: 7,
			question: 'Apakah Tahap Permainan?',
			answer: 'Tahap Permainan adalah aktiviti pembelajaran interaktif yang menjadikan pembelajaran menyeronokkan. Akses mereka melalui Aktiviti → Tahap Permainan. Setiap tahap mengajar konsep pangkalan data melalui teka-teki, latihan seret-dan-lepas, dan cabaran kod.',
		},
		{
			id: 8,
			question: 'Bagaimana saya boleh menukar pilihan bahasa saya?',
			answer: 'Pergi ke Akaun → Tetapan untuk menukar pilihan bahasa anda antara Bahasa Inggeris dan Bahasa Malaysia. Pilihan anda akan disimpan dan digunakan di seluruh platform.',
		},
	],
};

export default function SupportPage() {
	const { language } = useLanguage();
	const router = useRouter();
	const [expandedFaq, setExpandedFaq] = useState(null);
	const [feedbackRating, setFeedbackRating] = useState(0);
	const [feedbackText, setFeedbackText] = useState('');
	const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

	const t = {
		en: {
			title: 'Help & Support',
			subtitle: 'Find answers to common questions and get help',
			faqTitle: 'Frequently Asked Questions',
			feedbackTitle: 'Send Feedback',
			feedbackSubtitle: 'We\'d love to hear from you!',
			ratingLabel: 'How would you rate your experience?',
			feedbackPlaceholder: 'Tell us what you think...',
			submit: 'Submit Feedback',
			submitted: 'Thank you for your feedback!',
			backToDashboard: 'Back to Dashboard',
		},
		bm: {
			title: 'Bantuan & Sokongan',
			subtitle: 'Cari jawapan kepada soalan biasa dan dapatkan bantuan',
			faqTitle: 'Soalan Lazim',
			feedbackTitle: 'Hantar Maklum Balas',
			feedbackSubtitle: 'Kami ingin mendengar daripada anda!',
			ratingLabel: 'Bagaimana anda menilai pengalaman anda?',
			feedbackPlaceholder: 'Beritahu kami pendapat anda...',
			submit: 'Hantar Maklum Balas',
			submitted: 'Terima kasih atas maklum balas anda!',
			backToDashboard: 'Kembali ke Papan Pemuka',
		},
	}[language] || t.en;

	const currentFaqs = faqs[language] || faqs.en;

	const handleFeedbackSubmit = async () => {
		if (!feedbackText.trim()) return;

		try {
			// In a real app, you'd send this to your backend
			// For now, we'll just log it and show success message
			console.log('Feedback submitted:', { rating: feedbackRating, text: feedbackText });
			
			// You could also save to Firestore:
			// await addDoc(collection(db, 'feedback'), {
			//   rating: feedbackRating,
			//   text: feedbackText,
			//   userId: user?.uid,
			//   timestamp: serverTimestamp(),
			// });

			setFeedbackSubmitted(true);
			setTimeout(() => {
				setFeedbackSubmitted(false);
				setFeedbackText('');
				setFeedbackRating(0);
			}, 3000);
		} catch (error) {
			console.error('Error submitting feedback:', error);
		}
	};

	return (
		<div className="min-h-screen bg-neutralLight p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4 mb-6">
					<Link href="/dashboard/student">
						<Button variant="ghost" size="icon" className="hover:bg-neutralLight/80">
							<ArrowLeft className="h-6 w-6" />
						</Button>
					</Link>
					<div>
						<h1 className="text-3xl font-bold text-neutralDark flex items-center gap-2">
							<HelpCircle className="h-10 w-10 text-primary" />
							{t.title}
						</h1>
						<p className="text-muted-foreground mt-1">{t.subtitle}</p>
					</div>
				</div>

				{/* FAQ Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MessageCircle className="h-5 w-5 text-primary" />
							{t.faqTitle}
						</CardTitle>
						<CardDescription>
							{language === 'en' 
								? 'Click on any question to see the answer'
								: 'Klik pada mana-mana soalan untuk melihat jawapan'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{currentFaqs.map((faq) => (
							<div
								key={faq.id}
								className="border rounded-lg overflow-hidden transition-all"
							>
								<button
									onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
									className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutralLight/50 transition-colors text-left"
								>
									<span className="font-medium text-neutralDark">{faq.question}</span>
									{expandedFaq === faq.id ? (
										<ChevronUp className="h-5 w-5 text-muted-foreground" />
									) : (
										<ChevronDown className="h-5 w-5 text-muted-foreground" />
									)}
								</button>
								{expandedFaq === faq.id && (
									<div className="px-4 pb-3 pt-0 text-muted-foreground">
										{faq.answer}
									</div>
								)}
							</div>
						))}
					</CardContent>
				</Card>

				{/* Feedback Section */}
				<Card>
					<CardHeader>
						<CardTitle>{t.feedbackTitle}</CardTitle>
						<CardDescription>{t.feedbackSubtitle}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{feedbackSubmitted ? (
							<div className="text-center py-8">
								<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
									<Send className="h-8 w-8 text-success" />
								</div>
								<p className="text-lg font-medium text-neutralDark">{t.submitted}</p>
							</div>
						) : (
							<>
								<div>
									<label className="text-sm font-medium text-neutralDark mb-2 block">
										{t.ratingLabel}
									</label>
									<div className="flex gap-2">
										{[1, 2, 3, 4, 5].map((rating) => (
											<button
												key={rating}
												onClick={() => setFeedbackRating(rating)}
												className={`p-2 rounded-lg transition-all ${
													feedbackRating >= rating
														? 'bg-warning text-white'
														: 'bg-neutralLight hover:bg-neutralLight/80'
												}`}
											>
												<Star
													className={`h-5 w-5 ${
														feedbackRating >= rating ? 'fill-current' : ''
													}`}
												/>
											</button>
										))}
									</div>
								</div>
								<div>
									<Textarea
										value={feedbackText}
										onChange={(e) => setFeedbackText(e.target.value)}
										placeholder={t.feedbackPlaceholder}
										className="min-h-[120px]"
									/>
								</div>
								<Button
									onClick={handleFeedbackSubmit}
									disabled={!feedbackText.trim()}
									className="w-full"
								>
									<Send className="h-5 w-5 mr-2" />
									{t.submit}
								</Button>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
