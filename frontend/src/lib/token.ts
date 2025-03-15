export async function generateToken(roomName: string, participantName: string): Promise<string> {
  if (!roomName || !participantName) {
    throw new Error('Room name and participant name are required');
  }

  try {
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room: roomName,
        participant: participantName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate token');
    }

    const data = await response.json();
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