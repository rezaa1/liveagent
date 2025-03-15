import { OpenAI } from 'openai';
import defaultPrompt from '../prompts/default.json' assert { type: 'json' };

export class PromptAgent {
  constructor(config = {}) {
    this.config = {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 150,
      ...config
    };

    this.context = [];
    this.systemPrompt = defaultPrompt.systemPrompt;
    this.examples = defaultPrompt.examples;
    this.constraints = defaultPrompt.constraints;
  }

  async processMessage(message, metrics = null) {
    try {
      // Add relevant metrics to the context
      const contextWithMetrics = metrics ? 
        `Current call metrics - Quality: ${metrics.quality}, Latency: ${metrics.latency}ms, Packet Loss: ${metrics.packetLoss}%. ` : 
        '';

      // Prepare messages for the API
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.examples.map(ex => ([
          { role: 'user', content: ex.user },
          { role: 'assistant', content: ex.assistant }
        ])).flat(),
        ...this.context,
        { 
          role: 'user', 
          content: `${contextWithMetrics}${message}`
        }
      ];

      // Keep context window manageable
      if (this.context.length > 10) {
        this.context = this.context.slice(-10);
      }

      // Process response
      const response = await this.generateResponse(messages);
      
      // Update conversation context
      this.context.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      return "I apologize, but I'm having trouble processing your message right now. Could you please try again?";
    }
  }

  async generateResponse(messages) {
    // Simulate AI response for now since we don't have API key
    const responses = [
      "I'm receiving your audio and video clearly. The connection seems stable.",
      "The video quality looks good from my end. How's the reception on your side?",
      "I notice a slight delay in the connection. Let me run a quick diagnostic.",
      "Everything's working well. The current latency is within acceptable ranges.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  reset() {
    this.context = [];
  }
}