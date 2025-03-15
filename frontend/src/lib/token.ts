import { supabase } from './supabase';

export async function generateToken(roomName: string, participantName: string): Promise<string> {
  if (!roomName || !participantName) {
    throw new Error('Room name and participant name are required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        room: roomName,
        participant: participantName,
      },
    });

    if (error) {
      console.error('Token generation failed:', error);
      throw new Error(`Token generation failed: ${error.message}`);
    }

    if (!data || !data.token) {
      console.error('Invalid token response:', data);
      throw new Error('Invalid token response from server');
    }

    return data.token;
  } catch (error) {
    console.error('Token generation error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw new Error(
      `Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}