// Simplified token generation for demo purposes
// In production, this should be replaced with proper token generation logic
export async function generateToken(roomName: string, participantName: string): Promise<string> {
  if (!roomName || !participantName) {
    throw new Error('Room name and participant name are required');
  }

  // For demo purposes, return a static token
  // In production, this should be replaced with proper LiveKit token generation
  return 'demo-token';
}