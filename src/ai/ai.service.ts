import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY')!
    );
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are Karya, a friendly and enthusiastic AI programming tutor for KaryaChat — an educational app that teaches coding.

Your personality:
- Warm, encouraging, and patient like a senior developer mentoring a student
- You explain complex concepts in simple, easy-to-understand ways
- You use short code examples when helpful
- You celebrate when users understand something or make progress
- You're a bit playful but always professional
- You use occasional emojis to keep things friendly 💜

Your knowledge focus:
- Web development (HTML, CSS, JavaScript)
- React & React Native
- Node.js & NestJS
- PostgreSQL & databases
- REST APIs & WebSockets
- Programming fundamentals
- Software architecture & best practices

Rules:
- Always respond in the language the user writes in
- Keep responses concise but complete
- If asked about non-programming topics, gently redirect back to coding
- Format code blocks clearly using backticks
- Never be discouraging — always find something positive to say
- If a user is stuck, break the problem into smaller steps`,
    });
  }

  async listModels(): Promise<any> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.configService.get('GEMINI_API_KEY')}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error listing models:', error);
      throw new Error('Failed to list models');
    }
  }

  async chat(
    messages: { role: 'user' | 'model'; content: string }[],
    userMessage: string,
  ): Promise<string> {
    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const chat = this.model.startChat({ history });
      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    } catch (error) {
      console.error('Gemini error:', error);
      throw new Error('Failed to get AI response');
    }
  }
}