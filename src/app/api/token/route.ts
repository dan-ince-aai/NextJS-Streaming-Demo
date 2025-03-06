import { NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';

export async function GET(req: Request) {
  try {
    // Get the API key from the query parameter
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    // Initialize the client with the API key
    const client = new AssemblyAI({ apiKey });
    
    // Create a temporary token using the API key
    // This token will be valid for 60 seconds
    const tempToken = await client.realtime.createTemporaryToken({ 
      expires_in: 600
    });
    
    // Return the temporary token
    return NextResponse.json({ token: tempToken });
  } catch (error) {
    console.error('Error generating temporary token:', error);
    return NextResponse.json(
      { error: 'Failed to generate temporary token' },
      { status: 500 }
    );
  }
}
