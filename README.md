# regex-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/regex-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/regex-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

MCP server: test a JavaScript regex pattern against text and get back
structured matches with positions, numbered groups, and named groups. The
`g` flag is forced on so you always get every match.

## Tool

### `regex`

```json
{ "pattern": "(?<key>\\w+)=(?<val>\\d+)", "text": "x=1 y=22" }
```

→

```json
{
  "pattern": "(?<key>\\w+)=(?<val>\\d+)",
  "flags": "g",
  "match_count": 2,
  "matches": [
    { "match": "x=1",  "start": 0, "end": 3, "groups": ["x","1"],  "named_groups": { "key": "x", "val": "1" } },
    { "match": "y=22", "start": 4, "end": 8, "groups": ["y","22"], "named_groups": { "key": "y", "val": "22" } }
  ]
}
```

Allowed flags: `g/i/m/s/u/y`. `max_matches` caps output at 1000 by default.
Zero-width matches advance safely (no infinite loop).

## Configure

```json
{ "mcpServers": { "regex": { "command": "npx", "args": ["-y", "@mukundakatta/regex-mcp"] } } }
```

## License

MIT.
