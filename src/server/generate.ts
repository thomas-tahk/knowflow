import Anthropic from '@anthropic-ai/sdk';
import type { KnowflowDoc, Preset } from '../core/types';
import { getPreset } from '../core/presets/index.js';
import { systemClock, type Clock } from '../core/ids.js';
import { buildDoc, type DraftDiagram } from './buildDoc.js';
import { diagramTool, TOOL_NAME } from './diagramTool.js';
import { presetGuidance } from './prompts.js';

const MODEL = 'claude-sonnet-5';

export interface GenerateInput {
  text: string;
  preset: Preset;
  title?: string;
  image?: { mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; dataBase64: string };
  apiKey?: string;
  clock?: Clock;
}

export async function generateDiagram(input: GenerateInput): Promise<KnowflowDoc> {
  if (!input.apiKey) throw new Error('Missing ANTHROPIC_API_KEY on the server — add it to .env.local.');
  if (!input.text?.trim() && !input.image) throw new Error('Provide some text or an image to generate from.');

  const client = new Anthropic({ apiKey: input.apiKey });
  const clock = input.clock ?? systemClock;
  const title = input.title?.trim() || 'Untitled';
  const tool = diagramTool(input.preset);

  const baseContent: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    baseContent.push({ type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.dataBase64 } });
  }
  baseContent.push({ type: 'text', text: `Source material:\n\n${input.text?.trim() || '(see the attached image)'}` });

  const system = presetGuidance(input.preset);
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const content: Anthropic.ContentBlockParam[] = attempt === 0
      ? baseContent
      : [...baseContent, { type: 'text', text: `Your previous attempt was invalid: ${lastErrors.join('; ')}. Call ${TOOL_NAME} again with those problems fixed.` }];

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      // Sonnet 5 turns adaptive thinking on when `thinking` is omitted; keep it off
      // so it doesn't eat into max_tokens and stays compatible with a forced tool_choice.
      thinking: { type: 'disabled' },
      system,
      tools: [tool as Anthropic.Tool],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content }],
    });

    const toolUse = msg.content.find(b => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') { lastErrors = ['the model returned no diagram']; continue; }

    const doc = buildDoc(toolUse.input as DraftDiagram, input.preset, title, clock);
    const errors = getPreset(input.preset).validate(doc);
    if (errors.length === 0) return doc;
    lastErrors = errors.map(e => e.message);
  }

  throw new Error(`Could not generate a valid diagram: ${lastErrors.join('; ')}`);
}
