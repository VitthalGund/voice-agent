import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversationLog extends Document {
  userId: mongoose.Types.ObjectId;
  messageContent: string;
  speaker: 'USER' | 'BOT';
  timestamp: Date;
}

const ConversationLogSchema: Schema<IConversationLog> = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  messageContent: {
    type: String,
    required: true,
  },
  speaker: {
    type: String,
    enum: ['USER', 'BOT'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for retrieving conversation history quickly
ConversationLogSchema.index({ userId: 1, timestamp: 1 });

const ConversationLog: Model<IConversationLog> =
  mongoose.models.ConversationLog ||
  mongoose.model<IConversationLog>('ConversationLog', ConversationLogSchema);

export default ConversationLog;
