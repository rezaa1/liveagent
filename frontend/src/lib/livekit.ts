// Add to livekit.ts
private setupConnectionMonitoring() {
  // Create a periodic check for connection state consistency
  const connectionCheckInterval = setInterval(() => {
    if (!this.room) return;
    
    // Check if the room's connection state matches the engine's state
    const roomState = this.room.state;
    const engineConnected = this.room.engine?.connected ?? false;
    const transportConnected = this.room.engine?.transportsConnected ?? false;
    
    // Log connection state for debugging
    console.log('Connection state check:', {
      roomState,
      engineConnected,
      transportConnected,
      roomName: this.roomName,
      participantCount: this.room.participants.size,
    });
    
    // Detect mismatch between room state and transport state
    if (roomState === ConnectionState.Connected && !transportConnected) {
      console.warn('Detected connection state mismatch - room connected but transport disconnected');
      this.handleConnectionStateMismatch();
    }
    
    // Detect mismatch between engine and room state
    if ((roomState === ConnectionState.Connected) !== engineConnected) {
      console.warn('Detected connection state mismatch - room and engine state differ');
      this.handleConnectionStateMismatch();
    }
  }, 5000); // Check every 5 seconds
  
  // Store interval for cleanup
  this.connectionMonitorInterval = connectionCheckInterval;
}

private handleConnectionStateMismatch() {
  // Don't attempt reconciliation if we're already reconnecting
  if (this.room.state === ConnectionState.Reconnecting) {
    return;
  }
  
  console.log('Attempting to reconcile connection state mismatch');
  
  // Option 1: Force reconnection
  if (this.room.state === ConnectionState.Connected) {
    // Only try to reconnect if we think we're connected but actually aren't
    this.reconnect();
  }
}

// Add to cleanup method
public cleanup() {
  if (this.metricsInterval) {
    clearInterval(this.metricsInterval);
  }
  if (this.connectionMonitorInterval) {
    clearInterval(this.connectionMonitorInterval);
  }
  this.room.removeAllListeners();
  this.disconnect();
}
