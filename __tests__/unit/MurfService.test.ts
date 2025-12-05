import { MurfService } from '../../src/lib/murf';
import axios from 'axios';
import redis from '../../src/lib/redis';

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/lib/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

describe('MurfService', () => {
  let service: MurfService;

  beforeEach(() => {
    service = new MurfService();
    jest.clearAllMocks();
    process.env.MURF_API_KEY = 'test-key';
  });

  it('should return cached URL if available in Redis', async () => {
    (redis.get as jest.Mock).mockResolvedValue('https://cached-audio.url');

    const url = await service.generateSpeech('Hello', 'voice-1');

    expect(redis.get).toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(url).toBe('https://cached-audio.url');
  });

  it('should call Murf API if cache miss', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (axios.post as jest.Mock).mockResolvedValue({
      data: { audio_file: 'https://new-audio.url' },
    });

    const url = await service.generateSpeech('Hello', 'voice-1');

    expect(redis.get).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.murf.ai/v1/tts',
      expect.objectContaining({
        input: 'Hello',
        model_id: 'falcon-v1',
      }),
      expect.any(Object)
    );
    expect(redis.set).toHaveBeenCalledWith(expect.any(String), 'https://new-audio.url', { ex: 3600 });
    expect(url).toBe('https://new-audio.url');
  });

  it('should handle API errors gracefully', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (axios.post as jest.Mock).mockRejectedValue(new Error('API Error'));

    await expect(service.generateSpeech('Fail', 'voice-1')).rejects.toThrow('TTS Generation Failed');
  });
});
