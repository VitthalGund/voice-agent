import axios from 'axios';
import redis from './redis';
import crypto from 'crypto';

interface MurfPayload {
  input: string;
  voice_id: string;
  model_id: string;
  format: string;
  speed: number;
}

const MURF_API_URL = 'https://api.murf.ai/v1/tts';
const DEFAULT_VOICE_ID = 'en-IN-NeerjaNeural'; // Fallback / default
// Note: Actual Falcon voice IDs need to be confirmed from Murf dashboard.
// Assuming 'falcon-v1' is the model ID as per prompt.

export class MurfService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MURF_API_KEY || '';
    if (!this.apiKey) {
      console.warn('MURF_API_KEY is not defined');
    }
  }

  /**
   * Generates a cache key for the TTS request.
   */
  private generateCacheKey(text: string, voiceId: string): string {
    const hash = crypto.createHash('sha256').update(text + voiceId).digest('hex');
    return `tts:${hash}`;
  }

  /**
   * Generates speech from text using Murf.ai Falcon model.
   * Checks Redis cache first.
   */
  async generateSpeech(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<string> {
    const cacheKey = this.generateCacheKey(text, voiceId);

    // 1. Check Cache
    try {
      const cachedUrl = await redis.get<string>(cacheKey);
      if (cachedUrl) {
        console.log('Using cached TTS for:', text.substring(0, 20) + '...');
        return cachedUrl;
      }
    } catch (error) {
      console.error('Redis cache error:', error);
      // Create fallback if redis fails? No, just proceed to API.
    }

    // 2. Call Murf API
    const payload: MurfPayload = {
      input: text,
      voice_id: voiceId,
      model_id: 'falcon-v1', // Using Falcon as strict requirement
      format: 'mp3',
      speed: 1.0,
    };

    try {
      const response = await axios.post(MURF_API_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
      });

      // Murf API response structure usually contains `audio_url` or similar.
      // Adjust based on actual API response. Assuming { audio_file: "url" } or similar.
      // If the response gives a direct URL to the generated file:
      const audioUrl = response.data.audio_file || response.data.url;

      if (!audioUrl) {
        throw new Error('No audio URL in Murf response');
      }

      // 3. Cache the result (TTL 1 hour = 3600 seconds)
      try {
        await redis.set(cacheKey, audioUrl, { ex: 3600 });
      } catch (redisError) {
        console.error('Failed to cache TTS result:', redisError);
      }

      return audioUrl;
    } catch (error: any) {
      // 4. Error Handling & Retry Logic (Basic)
      if (error.response && error.response.status === 429) {
        // Rate limit hit. For now, throw, but in a real queue we would retry.
        console.error('Murf Rate Limit Hit');
        throw new Error('TTS Service Busy (Rate Limit)');
      }
      console.error('Murf API Error:', error.response?.data || error.message);
      throw new Error(`TTS Generation Failed: ${error.message}`);
    }
  }
}

export const murfService = new MurfService();
