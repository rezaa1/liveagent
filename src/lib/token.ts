// Mock token generation for development
// In production, this should be handled by a secure backend service
export async function generateToken(roomName: string, participantName: string): Promise<string> {
  // This is a mock implementation that creates a dummy token
  // DO NOT use this in production!
  const mockToken = btoa(JSON.stringify({
    room: roomName,
    participant: participantName,
    timestamp: Date.now()
  }));

  return Promise.resolve(mockToken);
}