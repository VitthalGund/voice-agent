import Ably from 'ably';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const client = new Ably.Rest(process.env.ABLY_API_KEY!);
  
  // In a real app, you'd verify the user session here
  // const session = await auth();
  // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = 'user-' + Math.random().toString(36).substring(7); // Mock ID

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: clientId,
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error creating token request:', error);
    return NextResponse.json(
      { error: 'Error creating token request' },
      { status: 500 }
    );
  }
}
