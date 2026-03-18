import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { addComment, addLabels, closeIssue, createIssue, getWeeklyDigest, listIssuesFromRepo } from "./tools.js";
dotenv.config();
const isDev = process.env.NODE_ENV !== "production";

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: "github-issue-tracker",
  version: "1.0.0",
});

// Tool: View Issue List
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

//  Tool: Issue Triage
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


// Tool: Weekly Digest
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

// Tool: Add Comment
server.registerTool(
      "add_comment",
    { 
        title: "Add Comment",
        description:"Post a comment on a GitHub issue or pull request",
        inputSchema:{
          owner : z.string(),
          repo: z.string(),
          issue_Number: z.number(),
          body: z.string().describe("the body of the comment")
        }
    },
    async ({owner, repo, issue_Number, body})=>{
      return await addComment({owner, repo, issue_Number, body});
    }

);

// Tool: Create Issue
server.registerTool(
    "create_issue",
    {
        title: "Create Issue",
        description: "Create a new issue in a GitHub repository",
        inputSchema: {
            owner: z.string().describe("Repository owner"),
            repo: z.string().describe("Repository name"),
            title: z.string().describe("Issue title"),
            body: z.string().optional().describe("Issue body (markdown)"),
            labels: z.array(z.string()).optional().describe("Labels to apply"),
            assignees: z.array(z.string()).optional().describe("Users to assign"),
            milestone: z.number().optional().describe("Milestone number"),
        },
    },
    async ({ owner, repo, title, body, labels, assignees, milestone }) => {
        return await createIssue({ owner, repo, title, body, labels, assignees, milestone });
    },
);

// Tool: Close Issue
server.registerTool(
    "close_issue",
    {
        title: "Close Issue",
        description: "Close a GitHub issue in a repository",
        inputSchema: {
            owner: z.string().describe("Repository owner"),
            repo: z.string().describe("Repository name"),
            issue_number: z.number().describe("Issue number to close"),
            state_reason: z
                .enum(["completed", "not_planned"])
                .optional()
                .describe("Optional reason for closing the issue"),
        },
    },
    async ({ owner, repo, issue_number, state_reason }) => {
        return await closeIssue({ owner, repo, issue_number, state_reason });
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
