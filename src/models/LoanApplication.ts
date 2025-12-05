import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoanApplication extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  amountRequested?: number;
  riskScore?: number;
  interestRate?: number;
  agriStackData?: any; // Flexible for varying land records
  createdAt: Date;
  updatedAt: Date;
}

const LoanApplicationSchema: Schema<ILoanApplication> = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'DRAFT',
  },
  amountRequested: Number,
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  interestRate: Number,
  agriStackData: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

const LoanApplication: Model<ILoanApplication> =
  mongoose.models.LoanApplication ||
  mongoose.model<ILoanApplication>('LoanApplication', LoanApplicationSchema);

export default LoanApplication;
