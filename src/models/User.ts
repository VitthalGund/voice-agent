import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  name?: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  createdAt: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  kycStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'FAILED'],
    default: 'PENDING',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
