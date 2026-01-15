import { NextResponse } from 'next/server';

// POST /api/ai/transcribe - Transcribe audio to text using Google Speech-to-Text API
// Note: This feature requires @google-cloud/speech package which is not currently installed
// Disabled for deployment to avoid build errors
export async function POST(request) {
	try {
		const formData = await request.formData();
		const audioFile = formData.get('audio');

		if (!audioFile) {
			return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
		}

		// Return service unavailable - feature not enabled
		return NextResponse.json({
			error: 'Speech-to-Text service not available',
			message: 'This feature is not currently enabled. Install @google-cloud/speech package to enable.',
		}, { status: 503 });

		/* Commented out until @google-cloud/speech is added to package.json dependencies
		
		const speechKey = process.env.GOOGLE_CLOUD_SPEECH_KEY;
		const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

		if (!speechKey && !credentialsPath) {
			return NextResponse.json({
				error: 'Speech-to-Text service not configured',
				message: 'Please configure GOOGLE_CLOUD_SPEECH_KEY or GOOGLE_APPLICATION_CREDENTIALS',
			}, { status: 503 });
		}

		const arrayBuffer = await audioFile.arrayBuffer();
		const audioBuffer = Buffer.from(arrayBuffer);

		const speech = await import('@google-cloud/speech');
		
		let speechClient;
		if (speechKey) {
			const credentials = JSON.parse(Buffer.from(speechKey, 'base64').toString());
			speechClient = new speech.SpeechClient({ credentials });
		} else {
			speechClient = new speech.SpeechClient();
		}

		const config = {
			encoding: 'WEBM_OPUS',
			sampleRateHertz: 48000,
			languageCode: 'en-US',
			alternativeLanguageCodes: ['ms-MY'],
		};

		const audio = {
			content: audioBuffer.toString('base64'),
		};

		const [response] = await speechClient.recognize({ config, audio });
		
		if (!response.results || response.results.length === 0) {
			return NextResponse.json({
				transcript: '',
				message: 'No speech detected in audio',
			});
		}

		const transcript = response.results
			.map(result => result.alternatives[0].transcript)
			.join(' ');

		return NextResponse.json({
			transcript: transcript.trim(),
			confidence: response.results[0].alternatives[0].confidence || 0,
		});
		*/
	} catch (err) {
		console.error('Error transcribing audio:', err);
		return NextResponse.json({
			error: 'Failed to transcribe audio',
			details: err.message,
		}, { status: 500 });
	}
}
