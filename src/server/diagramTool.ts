import type { Preset } from '../core/types';
import { getPreset } from '../core/presets/index.js';

export const TOOL_NAME = 'emit_diagram';

/** The tool the model must call, with block types constrained to the chosen preset. */
export function diagramTool(preset: Preset) {
  const allowed = getPreset(preset).blockTypes;
  return {
    name: TOOL_NAME,
    description: 'Emit the finished diagram as structured blocks (and, for graph presets, connections).',
    input_schema: {
      type: 'object' as const,
      properties: {
        blocks: {
          type: 'array',
          description: 'The diagram blocks.',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'A unique local id you assign; referenced by connections and by causes via "category".' },
              type: { type: 'string', enum: allowed },
              text: { type: 'string', description: 'Short, action-oriented label.' },
              category: { type: 'string', description: 'Fishbone causes only: the key of the category this cause belongs to.' },
            },
            required: ['key', 'type', 'text'],
          },
        },
        connections: {
          type: 'array',
          description: 'Directed links between blocks (flowchart/decision-tree only). Omit for step lists and fishbones.',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Source block key.' },
              to: { type: 'string', description: 'Target block key.' },
              label: { type: 'string', description: 'Edge label, e.g. the answer leading down this branch ("Yes"/"No").' },
            },
            required: ['from', 'to'],
          },
        },
      },
      required: ['blocks'],
    },
  };
}
