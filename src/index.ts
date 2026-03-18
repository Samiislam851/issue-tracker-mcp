import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { addLabels, getWeeklyDigest, listIssuesFromRepo } from "./tools.js";
dotenv.config();


// ============================================================================
// Dev Logging Utilities
// ============================================================================

const isDev = process.env.NODE_ENV !== "production";


// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: "github-issue-tracker",
  version: "1.0.0",
});

// 1. Tool: View Issue List
server.registerTool(
    "list_issues",
    {
        title: "List Issues",
        description: "Fetch a list of issues from a GitHub repository",
        inputSchema: {
            owner: z.string().describe("Repository owner"),
            repo: z.string().describe("Repository name"),
            state: z
                .enum(["open", "closed", "all"])
                .default("open")
                .describe("Status of issues"),
        },
    },
    async ({ owner, repo, state }) => {
        return await listIssuesFromRepo({ owner, repo, state });
    }
);

// 2. Tool: Issue Triage
server.registerTool(
    "triage_issue",
    {
        title: "Triage Issue",
        description: "Automatically label an issue such as 'bug' or 'enhancement'",
        inputSchema: {
            owner: z.string(),
            repo: z.string(),
            issue_number: z.number().describe("The issue number to triage"),
        },
    },
    async ({owner, repo, issue_number}) =>{
      return await addLabels({owner, repo, issue_number});
    }
   
);


//Tool: Weekly Digest
server.registerTool(
    "weekly_digest",
    {
        title: "Weekly Digest",
        description:
            "Get an itemized summary of repository activity from the last 7 days (issues/PRs updated + commits)",
        inputSchema: {
            owner: z.string(),
            repo: z.string(),
        },
    },
    async ({ owner, repo }) => {
      return await getWeeklyDigest({ owner, repo });
    },
);




// ============================================================================
// Express App Setup
// ============================================================================

const app = express();
app.use(express.json());

// Health check endpoint (required for Cloud Run)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

// MCP endpoint with dev logging
app.post("/mcp", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const body = req.body;

  // Extract method and params from JSON-RPC request
  const method = body?.method || "unknown";
  const params = body?.params;

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// JSON error handler (Express defaults to HTML errors)
app.use((_err: unknown, _req: Request, res: Response, _next: Function) => {
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(process.env.PORT || "8080");
const httpServer = app.listen(port, () => {
  console.log();
  console.log(chalk.bold("MCP Server running on"), chalk.cyan(`http://localhost:${port}`));
  console.log(`  ${chalk.gray("Health:")} http://localhost:${port}/health`);
  console.log(`  ${chalk.gray("MCP:")}    http://localhost:${port}/mcp`);

  if (isDev) {
    console.log();
    console.log(chalk.gray("─".repeat(50)));
    console.log();
  }
});

// Graceful shutdown for Cloud Run (SIGTERM before kill)
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  httpServer.close(() => {
    process.exit(0);
  });
});
