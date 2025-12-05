import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import User from '../models/User';
import LoanApplication from '../models/LoanApplication';
import dbConnect from '../lib/db';

export const kycTool = new DynamicStructuredTool({
  name: 'kyc_verification',
  description: 'Verifies KYC details like Name and Aadhaar. Updates user status.',
  schema: z.object({
    phoneNumber: z.string(),
    name: z.string(),
    aadhaar: z.string(),
  }),
  func: async ({ phoneNumber, name, aadhaar }) => {
    await dbConnect();
    // Mock KYC Verification Logic
    const isValid = aadhaar.length === 12; // Simple mock check
    const status = isValid ? 'VERIFIED' : 'FAILED';

    await User.findOneAndUpdate(
      { phoneNumber },
      { name, kycStatus: status },
      { upsert: true, new: true }
    );

    return JSON.stringify({ status, message: isValid ? 'KYC Verified' : 'Invalid Aadhaar' });
  },
});

export const agriStackTool = new DynamicStructuredTool({
  name: 'agri_stack_lookup',
  description: 'Fetches land records from AgriStack based on Plot Number.',
  schema: z.object({
    plotNumber: z.string(),
    state: z.string(),
  }),
  func: async ({ plotNumber, state }) => {
    // Mock AgriStack API with artificial delay
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // Return dummy data based on plot number
    if (plotNumber === '000') return JSON.stringify({ error: 'Plot not found' });
    
    return JSON.stringify({
      acres: 2.5,
      yield: 'high',
      crop: 'Wheat',
      state: state || 'MH',
      ownerValidated: true
    });
  },
});

export const scoringTool = new DynamicStructuredTool({
  name: 'credit_scoring',
  description: 'Calculates risk score based on land data and KYC.',
  schema: z.object({
    acres: z.number(),
    yieldStatus: z.string(),
    kycStatus: z.string(),
  }),
  func: async ({ acres, yieldStatus, kycStatus }) => {
    let score = 0;
    
    if (kycStatus === 'VERIFIED') score += 50;
    score += acres * 10; // 2.5 acres * 10 = 25
    if (yieldStatus === 'high') score += 20;
    
    // Cap at 100
    score = Math.min(score, 100);

    return JSON.stringify({ score });
  },
});

export const underwritingTool = new DynamicStructuredTool({
  name: 'underwriting_decision',
  description: 'Makes final loan decision based on score.',
  schema: z.object({
    score: z.number(),
    userId: z.string(),
    agriData: z.any(),
  }),
  func: async ({ score, userId, agriData }) => {
    await dbConnect();
    const isApproved = score > 60;
    const status = isApproved ? 'APPROVED' : 'REJECTED';
    const interestRate = isApproved ? 8.5 : null;

    // Save Application
    await LoanApplication.create({
      userId,
      status,
      riskScore: score,
      interestRate,
      agriStackData: agriData,
      amountRequested: 50000 // Default for MVP
    });

    if (isApproved) {
        return `Loan Approved! Interest Rate: ${interestRate}%. Funds will be disbursed shortly.`
    } else {
        return "Loan Rejected. Sorry, your credit score or land holding is insufficient at this time.";
    }
  },
});
