import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private ai: GoogleGenAI;
  private model: string;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in config');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.logger.log(`AIService initialized with model: ${this.model}`);
  }

  async generateSummaries(text: string): Promise<{
    title: string;
    summary_a1_a2: string;
    summary_b1_b2: string;
    summary_c1_c2: string;
  }> {
    const prompt = `
You are an expert English language teacher and text summarizer. 
Read the following chapter/text extract and generate a title, along with three English summaries tailored for different language proficiency levels:
1. A1-A2 (Elementary/Pre-Intermediate): Use very simple vocabulary, short sentences, and basic grammar.
2. B1-B2 (Intermediate): Use standard vocabulary, natural sentence flow, and intermediate grammar.
3. C1-C2 (Advanced): Use rich vocabulary, advanced sentence structures, and capture the depth and nuance of the original text.

Important: All three summaries must be written in English. Do not include any translation or explanations outside the requested JSON format.

Text to summarize:
"""
${text}
"""
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: {
                type: 'STRING',
                description: 'The title of the chapter/extract.',
              },
              summary_a1_a2: {
                type: 'STRING',
                description:
                  'An English summary suitable for A1-A2 levels (simple English).',
              },
              summary_b1_b2: {
                type: 'STRING',
                description:
                  'An English summary suitable for B1-B2 levels (intermediate English).',
              },
              summary_c1_c2: {
                type: 'STRING',
                description:
                  'An English summary suitable for C1-C2 levels (advanced/nuanced English).',
              },
            },
            required: [
              'title',
              'summary_a1_a2',
              'summary_b1_b2',
              'summary_c1_c2',
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response received from Gemini API');
      }

      const parsed = JSON.parse(responseText) as {
        title?: string;
        summary_a1_a2?: string;
        summary_b1_b2?: string;
        summary_c1_c2?: string;
      };
      return {
        title: parsed.title || 'Untitled Chapter',
        summary_a1_a2: parsed.summary_a1_a2 || '',
        summary_b1_b2: parsed.summary_b1_b2 || '',
        summary_c1_c2: parsed.summary_c1_c2 || '',
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error generating summaries using Gemini: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
