/**
 * @jest-environment node
 */
import { POST } from '../../src/app/api/chat/route';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LoanApplication from '../../src/models/LoanApplication';
import ConversationLog from '../../src/models/ConversationLog';
import dbConnect from '../../src/lib/db';

// Mock External Services
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: jest.fn().mockResolvedValue([{
      results: [{ alternatives: [{ transcript: 'I want to apply for a loan for my 3 acre farm in Maharashtra' }] }]
    }])
  }))
}));

jest.mock('../../src/lib/murf', () => ({
  murfService: {
    generateSpeech: jest.fn().mockResolvedValue('https://murf.ai/audio.mp3')
  }
}));

jest.mock('../../src/lib/redis', () => ({
  get: jest.fn().mockResolvedValue(''),
  set: jest.fn(),
}));

jest.mock('../../src/lib/ably', () => ({
  publishUpdate: jest.fn()
}));

// Mock LangChain 
// Detailed mocking of the agent is complex, so we will expect the Agent logic to run 
// and potentially fail if it can't connect to OpenAI. 
// For this integration test, we can mock `runAgent` to return a canned response 
// if we want to isolate the API logic, OR we let it run if we have keys.
// Given we don't have keys in this environment, we MUST mock `runAgent`.
jest.mock('../../src/agents/master', () => ({
  runAgent: jest.fn().mockResolvedValue({
    rawResult: { output: 'Loan Approved' },
    finalSpeech: 'Your loan is approved.'
  })
}));

describe('Integration: /api/chat Happy Path', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should process a valid audio loan request', async () => {
    // 1. Create FormData
    const formData = new FormData();
    const blob = new Blob(['fake-audio-content'], { type: 'audio/webm' });
    formData.append('audio', blob as any); // cast for Jest
    formData.append('userId', 'user-123');

    // 2. Create Request
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: formData,
    });

    // 3. Call API
    const res = await POST(req);
    const json = await res.json();

    // 4. Assertions
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.transcription).toContain('loan');
    expect(json.audioUrl).toBe('https://murf.ai/audio.mp3');

    // 5. Verify DB Side Effects (Conversation Logged)
    const logs = await ConversationLog.find({ userId: 'user-123' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].speaker).toBe('USER');
  });
});
