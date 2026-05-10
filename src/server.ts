#!/usr/bin/env node
/**
 * regex MCP server. One tool: `regex`.
 *
 * Test a regex pattern against text. Returns each match with its position,
 * full text, and named/numbered capture groups.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const VERSION = '0.1.0';

export interface MatchResult {
  match: string;
  start: number;
  end: number;
  groups: (string | null)[];
  named_groups: Record<string, string | null>;
}

export interface RegexResult {
  pattern: string;
  flags: string;
  match_count: number;
  matches: MatchResult[];
}

const ALLOWED_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y']);

/**
 * Run `pattern` against `text`. `flags` is a JS-style flag string
 * (subset of g/i/m/s/u/y). 'g' is forced on so we get all matches.
 * Limits to `maxMatches` to avoid runaway output (default 1000).
 */
export function findMatches(
  pattern: string,
  text: string,
  flags = '',
  maxMatches = 1000,
): RegexResult {
  // Validate flags upfront so we can give a clear error.
  for (const f of flags) {
    if (!ALLOWED_FLAGS.has(f)) {
      throw new Error(`unknown regex flag: ${f}`);
    }
  }
  const effective = flags.includes('g') ? flags : flags + 'g';
  const re = new RegExp(pattern, effective);

  const matches: MatchResult[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (matches.length >= maxMatches) break;
    matches.push({
      match: m[0],
      start: m.index,
      end: m.index + m[0].length,
      groups: m.slice(1).map((g) => (g === undefined ? null : g)),
      named_groups: m.groups
        ? Object.fromEntries(
            Object.entries(m.groups).map(([k, v]) => [k, v === undefined ? null : v]),
          )
        : {},
    });
    // Guard against zero-width matches in 'g' mode (would loop forever).
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return {
    pattern,
    flags: effective,
    match_count: matches.length,
    matches,
  };
}

const server = new Server(
  { name: 'regex', version: VERSION },
  { capabilities: { tools: {} } },
);

const TOOLS = [
  {
    name: 'regex',
    description:
      'Test a JavaScript regex pattern against text. Returns each match with position, full text, and capture groups (numbered + named).',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern (JS syntax).' },
        text: { type: 'string', description: 'Text to search.' },
        flags: {
          type: 'string',
          default: '',
          description: "Flag string. Allowed: g/i/m/s/u/y. 'g' is implied.",
        },
        max_matches: {
          type: 'integer',
          default: 1000,
          description: 'Cap on match count (default 1000).',
        },
      },
      required: ['pattern', 'text'],
    },
  },
] as const;

interface RegexArgs {
  pattern: string;
  text: string;
  flags?: string;
  max_matches?: number;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name !== 'regex') return errorResult('unknown tool: ' + name);
    const a = args as unknown as RegexArgs;
    return jsonResult(findMatches(a.pattern, a.text, a.flags ?? '', a.max_matches ?? 1000));
  } catch (err) {
    return errorResult('regex failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

// Only start the stdio server when run as a script — not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`regex MCP server v${VERSION} ready on stdio\n`);
}
