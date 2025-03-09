import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@1.2.7';

const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

interface TokenRequest {
  room: string;
  participant: string;
}

serve(async (req) => {
  console.log('Received request:', req);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify API key and secret are set
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('LiveKit API key or secret not configured');
      throw new Error('LiveKit API key or secret not configured');
    }

    // Get request body
    const { room, participant }: TokenRequest = await req.json();
    console.log('Parsed request body:', { room, participant });

    // Validate required fields
    if (!room || !participant) {
      console.error('Room and participant names are required');
      throw new Error('Room and participant names are required');
    }

    // Create token with appropriate grants
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participant,
      ttl: '10m',
    });
    
    at.addGrant({
      roomJoin: true,
      room,
    });

    // Generate token
    const token = at.toJwt();
    console.log('Generated token:', token);

    return new Response(JSON.stringify({ token }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error occurred:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});