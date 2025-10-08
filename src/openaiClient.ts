import OpenAI from 'openai';
import { SYSTEM_FIRST_PROMPT, SYSTEM_SECOND_PROMPT, SYSTEM_THIRD_PROMPT } from './prompts';

export class OpenAIClient {
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async generateExplanation(fileTree: string, readme: string): Promise<string> {
        console.log('[OpenAI] Starting Step 1: Generate Explanation');
        const userMessage = `<file_tree>\n${fileTree}\n</file_tree>\n\n<readme>\n${readme}\n</readme>`;

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_FIRST_PROMPT },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const result = response.choices[0]?.message?.content || '';
        console.log('[OpenAI] Step 1 complete. Explanation length:', result.length);
        return result;
    }

    async generateComponentMapping(explanation: string, fileTree: string): Promise<string> {
        console.log('[OpenAI] Starting Step 2: Generate Component Mapping');
        const userMessage = `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>`;

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_SECOND_PROMPT },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.5,
            max_tokens: 1500
        });

        const result = response.choices[0]?.message?.content || '';
        console.log('[OpenAI] Step 2 complete. Mapping length:', result.length);
        return result;
    }

    async generateMermaidDiagram(explanation: string, componentMapping: string): Promise<string> {
        console.log('[OpenAI] Starting Step 3: Generate Mermaid Diagram');
        const userMessage = `<explanation>\n${explanation}\n</explanation>\n\n<component_mapping>\n${componentMapping}\n</component_mapping>`;

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_THIRD_PROMPT },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3,
            max_tokens: 3000
        });

        const result = response.choices[0]?.message?.content || '';
        console.log('[OpenAI] Step 3 complete. Diagram length:', result.length);
        console.log('[OpenAI] Generated Mermaid code:\n', result);
        return result;
    }
}
