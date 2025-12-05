import { NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';
import { runAgent } from '@/agents/master';
import { murfService } from '@/lib/murf';
import { publishUpdate } from '@/lib/ably';
import dbConnect from '@/lib/db';
import ConversationLog from '@/models/ConversationLog';
import redis from '@/lib/redis';

// Initialize Google Speech Client
// Depends on GOOGLE_APPLICATION_CREDENTIALS env var
const speechClient = new SpeechClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;
    const userId = formData.get('userId') as string;

    if (!audioFile || !userId) {
      return NextResponse.json({ error: 'Missing audio or userId' }, { status: 400 });
    }

    // 1. Convert Audio to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const audioBytes = audioBuffer.toString('base64');

    // 2. Google Speech-to-Text
    // Config: user must send audio encoding details or we assume standard
    const audio = { content: audioBytes };
    const config = {
      encoding: 'WEBM_OPUS' as const, // Standard for browser MediaRecorder
      sampleRateHertz: 48000,
      languageCode: 'en-IN', // or 'hi-IN'
      alternativeLanguageCodes: ['hi-IN'],
    };

    const requestSTT = {
      audio: audio,
      config: config,
    };

    let transcription = '';
    
    // Safety check for mock environments w/o credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'production') {
        console.warn("Using Mock STT (No Google Creds found)");
        transcription = "My name is Raju and I want a loan of 50000"; // Dummy fall back
    } else {
        const [response] = await speechClient.recognize(requestSTT);
        transcription = response.results
        ?.map((result) => result.alternatives?.[0].transcript)
        .join('\n') || '';
    }

    if (!transcription) {
       return NextResponse.json({ error: 'No speech detected' }, { status: 400 });
    }

    // Log User Input
    await dbConnect();
    await ConversationLog.create({
        userId,
        messageContent: transcription,
        speaker: 'USER'
    });

    // 3. Retrieve History
    const historyKey = `conv:${userId}`;
    const history = (await redis.get<string>(historyKey)) || '';

    // 4. Run Agent (Core Logic)
    // We run this synchronously for now to keep the loop tight, 
    // but in a real massive scaler we might decouple if Agent takes > 5s.
    const { rawResult, finalSpeech } = await runAgent(transcription, history);

    // 5. Generate TTS (Murf)
    const audioUrl = await murfService.generateSpeech(finalSpeech, 'en-IN-NeerjaNeural');

    // 6. Update State & History
    const newHistory = `${history}\nUser: ${transcription}\nAgent: ${finalSpeech}`;
    await redis.set(historyKey, newHistory, { ex: 86400 }); // 24h TTL
    
    await ConversationLog.create({
        userId,
        messageContent: finalSpeech,
        speaker: 'BOT'
    });

    // 7. Push Result via Ably (for real-time feedback)
    await publishUpdate(userId, {
        type: 'response',
        transcription,
        text: finalSpeech,
        audioUrl,
        raw: rawResult
    });

    return NextResponse.json({
        success: true,
        transcription,
        response: finalSpeech,
        audioUrl
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
