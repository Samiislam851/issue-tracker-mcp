/**
 * Pure tool functions — business logic only, no MCP dependency.
 * Each function is registered as an MCP tool in index.ts.
 *
 * This separation makes tools easy to unit test without MCP infrastructure.
 */

import { Octokit } from "@octokit/rest";

let cached: Octokit | null = null; // cache the octokit instance to avoid creating a new one for each request
const getOctokit = () => {
    if (!cached) {
        cached = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }
    return cached;
};

export async function listIssuesFromRepo({ owner, repo, state }: { owner: string; repo: string; state: "open" | "closed" | "all"; }) {
    const octokit = getOctokit();
    const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: state as "open" | "closed" | "all",
        per_page: 10,
    });
    const list = issues
        .filter((i) => !i.pull_request)
        .map((i) => `#${i.number}: ${i.title}`)
        .join("\n");
    const output = { issues: list || "No issues found." };
    return {
        content: [{ type: "text" as const, text: output.issues }],
        structuredContent: output,
    };
}
