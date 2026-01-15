// Minimal Learning Recommendations API (US012-03)
// POST /api/ai/recommendations
// No Firestore or Admin SDK – just uses Gemini and optional performance data from client.

import { NextResponse } from 'next/server';

async function generateRecommendations(performanceData, language = 'en') {
	try {
		const { generateText } = await import('@/lib/firebase-ai');

		const prompt = `You are an educational AI assistant for database systems courses designed for secondary school students (age 16-17).

Analyze the following student performance data and generate personalized learning recommendations in ${
			language === 'bm' ? 'Bahasa Malaysia' : 'English'
		}.

Performance Data:
- Enrolled Courses: ${performanceData.enrolledCourses?.length || 0}
- Completed Lessons: ${performanceData.completedLessons?.length || 0}
- Assessment Scores: ${JSON.stringify(performanceData.assessmentScores || [])}
- Assignment Grades: ${JSON.stringify(performanceData.assignmentGrades || [])}
- Overall Progress: ${JSON.stringify(performanceData.overallProgress || {})}
- Weak Areas: ${JSON.stringify(performanceData.weakAreas || [])}
- Strong Areas: ${JSON.stringify(performanceData.strongAreas || [])}

Generate 3-5 personalized recommendations as a JSON array with this structure:
[
  {
    "type": "continue_lesson" | "review_weak_area" | "practice_assessment" | "explore_courses" | "complete_module" | "ai_help",
    "priority": "high" | "medium" | "low",
    "title": "Recommendation title",
    "description": "Detailed description explaining why this recommendation is helpful",
    "action": {
      "type": "navigate",
      "path": "/path/to/resource",
      "label": "Action button label"
    },
    "reason": "Brief reason for this recommendation"
  }
]

Guidelines:
- Prioritize recommendations based on student's current performance
- Focus on database systems learning (SQL, normalization, indexing, transactions, etc.)
- Use encouraging, age-appropriate language
- Provide actionable, specific recommendations
- Consider weak areas and suggest targeted improvement
- Acknowledge strong areas and suggest next steps

Return ONLY valid JSON array, no additional text.`;

		const response = await generateText(prompt, {
			temperature: 0.7,
			maxTokens: 2000,
		});

		const jsonMatch = response.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			const arr = JSON.parse(jsonMatch[0]);
			return arr
				.map((rec) => ({
					type: rec.type || 'continue_lesson',
					priority: rec.priority || 'medium',
					title: rec.title || 'Learning Recommendation',
					description: rec.description || '',
					action: rec.action || { type: 'navigate', path: '/courses', label: 'View Courses' },
					reason: rec.reason || '',
				}))
				.slice(0, 5);
		}

		return [];
	} catch (err) {
		console.error('Error generating AI recommendations:', err);
		return [];
	}
}

export async function POST(request) {
	try {
		let body;
		try {
			body = await request.json();
		} catch {
			body = {};
		}

		const { language = 'en', performanceData: clientPerformanceData = {} } = body;

		const performanceData = {
			enrolledCourses: clientPerformanceData.enrolledCourses || [],
			completedLessons: clientPerformanceData.completedLessons || [],
			assessmentScores: clientPerformanceData.assessmentScores || [],
			assignmentGrades: clientPerformanceData.assignmentGrades || [],
			overallProgress: clientPerformanceData.overallProgress || {},
			weakAreas: clientPerformanceData.weakAreas || [],
			strongAreas: clientPerformanceData.strongAreas || [],
		};

		const recommendations = await generateRecommendations(performanceData, language);

		return NextResponse.json({
			recommendations,
			weakAreas: performanceData.weakAreas,
			strongAreas: performanceData.strongAreas,
			cached: false,
			performanceSummary: {
				enrolledCoursesCount: performanceData.enrolledCourses.length,
				completedLessonsCount: performanceData.completedLessons.length,
				averageAssessmentScore: null,
				averageAssignmentGrade: null,
			},
		});
	} catch (err) {
		console.error('Error in /api/ai/recommendations:', err);
		return NextResponse.json(
			{ error: 'Failed to generate recommendations', details: String(err) },
			{ status: 500 }
		);
	}
}

