export async function generateToken(roomName: string, participantName: string): Promise<string> {
  if (!roomName || !participantName) {
    throw new Error('Room name and participant name are required');
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        room: roomName,
        participant: participantName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Token generation failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('No token received from server');
    }

    return data.token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}