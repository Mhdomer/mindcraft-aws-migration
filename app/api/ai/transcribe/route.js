import { NextResponse } from 'next/server';

// POST /api/ai/transcribe - Transcribe audio to text using Google Speech-to-Text API
export async function POST(request) {
	try {
		const formData = await request.formData();
		const audioFile = formData.get('audio');

		if (!audioFile) {
			return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
		}

		// Check if Google Cloud Speech-to-Text is configured
		const speechKey = process.env.GOOGLE_CLOUD_SPEECH_KEY;
		const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

		if (!speechKey && !credentialsPath) {
			console.warn('⚠️ Google Cloud Speech-to-Text not configured');
			return NextResponse.json({
				error: 'Speech-to-Text service not configured',
				message: 'Please configure GOOGLE_CLOUD_SPEECH_KEY or GOOGLE_APPLICATION_CREDENTIALS',
			}, { status: 503 });
		}

		// Convert audio file to buffer
		const arrayBuffer = await audioFile.arrayBuffer();
		const audioBuffer = Buffer.from(arrayBuffer);

		// Initialize Google Cloud Speech client
		let speechClient;
		try {
			const speech = await import('@google-cloud/speech');
			
			if (speechKey) {
				// Use service account key from environment variable
				const credentials = JSON.parse(Buffer.from(speechKey, 'base64').toString());
				speechClient = new speech.SpeechClient({ credentials });
			} else {
				// Use GOOGLE_APPLICATION_CREDENTIALS path
				speechClient = new speech.SpeechClient();
			}
		} catch (err) {
			console.error('Error initializing Speech client:', err);
			return NextResponse.json({
				error: 'Failed to initialize Speech-to-Text service',
				details: err.message,
			}, { status: 500 });
		}

		// Configure recognition request
		const config = {
			encoding: 'WEBM_OPUS', // Common web audio format
			sampleRateHertz: 48000, // Common sample rate
			languageCode: 'en-US', // Can be made dynamic based on user preference
			alternativeLanguageCodes: ['ms-MY'], // Bahasa Malaysia support
		};

		const audio = {
			content: audioBuffer.toString('base64'),
		};

		const request_config = {
			config,
			audio,
		};

		// Perform speech recognition
		const [response] = await speechClient.recognize(request_config);
		
		if (!response.results || response.results.length === 0) {
			return NextResponse.json({
				transcript: '',
				message: 'No speech detected in audio',
			});
		}

		// Extract transcript
		const transcript = response.results
			.map(result => result.alternatives[0].transcript)
			.join(' ');

		return NextResponse.json({
			transcript: transcript.trim(),
			confidence: response.results[0].alternatives[0].confidence || 0,
		});
	} catch (err) {
		console.error('Error transcribing audio:', err);
		return NextResponse.json({
			error: 'Failed to transcribe audio',
			details: err.message,
		}, { status: 500 });
	}
}
