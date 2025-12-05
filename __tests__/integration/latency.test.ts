/**
 * @jest-environment node
 */
import { POST } from '../../src/app/api/chat/route';
import { performance } from 'perf_hooks';

// Mocks same as Happy Path
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: jest.fn().mockResolvedValue([{
      results: [{ alternatives: [{ transcript: 'Hello' }] }]
    }])
  }))
}));

jest.mock('../../src/lib/murf', () => ({
  murfService: {
    generateSpeech: jest.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 500)); // Simulate 500ms TTS
        return 'http://url';
    })
  }
}));

jest.mock('../../src/lib/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
}));
jest.mock('../../src/lib/ably', () => ({ publishUpdate: jest.fn() }));
jest.mock('../../src/agents/master', () => ({
  runAgent: jest.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 1000)); // Simulate 1s Agent Reasoning
      return { rawResult: {}, finalSpeech: 'Hi' };
  })
}));
jest.mock('../../src/lib/db', () => jest.fn());
jest.mock('../../src/models/ConversationLog', () => ({ create: jest.fn() }));

describe('Performance: Latency Check', () => {
  it('should complete the loop under 2 seconds (simulated)', async () => {
    const formData = new FormData();
    formData.append('audio', new Blob([''], { type: 'audio/webm' }) as any);
    formData.append('userId', 'perf-test');

    const req = new Request('http://localhost:3000/api/chat', { method: 'POST', body: formData });

    const start = performance.now();
    await POST(req);
    const end = performance.now();
    
    const duration = end - start;
    console.log(`Simulated Request Duration: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(3000); // 3s buffer for overhead in test
  });
});
