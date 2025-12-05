import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dbConnect from '../../src/lib/db';
import User from '../../src/models/User';

describe('MongoDB Connector & User Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up data after each test
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
    }
  });

  it('should connect to the in-memory database successfully', async () => {
    const conn = await dbConnect();
    expect(conn.readyState).toBe(1); // 1 = connected
  });

  it('should allow saving valid users', async () => {
    await dbConnect();
    const validUser = new User({
      phoneNumber: '1234567890',
      name: 'Raju',
      kycStatus: 'PENDING',
    });
    const savedUser = await validUser.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.phoneNumber).toBe('1234567890');
    expect(savedUser.kycStatus).toBe('PENDING');
  });

  it('should fail validation when required fields are missing', async () => {
    await dbConnect();
    const invalidUser = new User({
      name: 'NoPhone User',
    });

    let err: any;
    try {
      await invalidUser.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.phoneNumber).toBeDefined();
  });

  it('should prevent duplicate phone numbers', async () => {
    await dbConnect();
    const user1 = new User({ phoneNumber: '9876543210' });
    await user1.save();

    const user2 = new User({ phoneNumber: '9876543210' }); // Duplicate
    let err: any;
    try {
      await user2.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });
});
