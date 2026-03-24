# github-issue-tracker

[![MCPize](https://mcpize.com/badge/@mcpize/mcpize?type=hosted)](https://mcpize.com)

An MCP (Model Context Protocol) server that talks to the [GitHub REST API](https://docs.github.com/en/rest) so assistants can list, triage, create, comment on, and close issues, and pull a weekly-style activity digest for a repository. Built with [MCPize](https://mcpize.com), Express, and [`@octokit/rest`](https://github.com/octokit/octokit.js).

## Configuration

Create a `.env` file (see `.env.example` for `PORT` / `NODE_ENV`). **Required for GitHub API calls:**

- **`GITHUB_TOKEN`** — A [GitHub personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) with scopes appropriate for the repos you use (for example `repo` for private repositories, or `public_repo` for public-only usage).

The server reads `GITHUB_TOKEN` at startup via `dotenv`.

## Quick Start

```bash
npm install
# Set GITHUB_TOKEN in .env, then:
npm run dev     # Start with hot reload
```

- **MCP (Streamable HTTP):** `POST http://localhost:8080/mcp` (default port from `PORT`, usually `8080`)
- **Health:** `GET http://localhost:8080/health` — JSON `{ "status": "healthy" }` (useful for platforms like Cloud Run)

## Development

```bash
npm run dev     # Development mode with hot reload
npm run build   # Compile TypeScript
npm test        # Run tests
npm start       # Run compiled server
```

## Project Structure

```
├── src/
│   ├── index.ts        # MCP server entry point (tool registration + HTTP)
│   └── tools.ts        # Pure GitHub tool functions (testable)
├── tests/
│   └── tools.test.ts   # Tool unit tests
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── mcpize.yaml         # MCPize deployment manifest
├── Dockerfile          # Container build
└── .env.example        # Environment variables template
```

## Tools

All tools take a repository as **`owner`** / **`repo`** (GitHub `owner/name`).

| Tool | Purpose |
|------|--------|
| **`list_issues`** | Lists up to 10 **issues** (pull requests excluded) with optional `state`: `open`, `closed`, or `all`. |
| **`triage_issue`** | Fetches an issue and adds a single label: `bug` if “bug” appears in the title or body (case-insensitive), otherwise `enhancement`. |
| **`weekly_digest`** | Summarizes the last 7 days: issues updated, PRs updated, and commits (text summary plus structured counts and lists). |
| **`add_comment`** | Posts a comment on an issue or PR (`issue_Number`, `body`). |
| **`create_issue`** | Opens a new issue with optional `body`, `labels`, `assignees`, and `milestone`. |
| **`close_issue`** | Closes an issue; optional `state_reason`: `completed` or `not_planned`. |

Handlers return both human-readable `content` and `structuredContent` for clients that support structured tool results.

## Testing

```bash
npm test                                  # Run unit tests
npx @anthropic-ai/mcp-inspector          # Interactive MCP testing
```

For the inspector, connect to `http://localhost:8080/mcp` (or your deployed URL).

## Deployment

```bash
mcpize deploy
```

Configure **`GITHUB_TOKEN`** (and any other secrets) in your MCPize dashboard or host environment so the server can authenticate to GitHub.


