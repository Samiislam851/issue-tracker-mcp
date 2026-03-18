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

export const  listIssuesFromRepo = async({ owner, repo, state }: { owner: string; repo: string; state: "open" | "closed" | "all"; }) => {
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

export const addLabels = async ({ owner, repo, issue_number }:{owner: string; repo: string; issue_number : number}) => {
        const octokit = getOctokit();
        const { data: issue } = await octokit.issues.get({
            owner,
            repo,
            issue_number,
        });
        const label = (issue.title + (issue.body || ""))
            .toLowerCase()
            .includes("bug") ? "bug" : "enhancement";
            
        await octokit.issues.addLabels({
            owner,
            repo,
            issue_number,
            labels: [label],
        });

        const output = {
            message: `Issue #${issue_number} labeled as: ${label}`,
            label,
        };
        return {
            content: [{ type: "text" as const, text: output.message }],
            structuredContent: output,
        };
    }

    export const getWeeklyDigest = async ({ owner , repo } : {owner: string, repo: string}) => {
      const octokit = getOctokit();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const sinceIso = sevenDaysAgo.toISOString();

        const [issuesResp, commitsResp] = await Promise.all([
            octokit.issues.listForRepo({
                owner,
                repo,
                state: "all",
                since: sinceIso,
                per_page: 100,
            }),
            octokit.repos.listCommits({
                owner,
                repo,
                since: sinceIso,
                per_page: 100,
            }),
        ]);

        const updatedIssues = issuesResp.data.filter((i) => !i.pull_request);
        const updatedPRs = issuesResp.data.filter((i) => !!i.pull_request);

        const issueItems = updatedIssues.map((i) => ({
            number: i.number,
            title: i.title,
            state: i.state,
            updated_at: i.updated_at,
            url: i.html_url,
        }));

        const prItems = updatedPRs.map((i) => ({
            number: i.number,
            title: i.title,
            state: i.state,
            updated_at: i.updated_at,
            url: i.html_url,
        }));

        const commitItems = commitsResp.data.map((c) => ({
            sha: c.sha,
            message: c.commit?.message?.split("\n")[0] || "",
            author: c.commit?.author?.name || c.author?.login || null,
            date: c.commit?.author?.date || null,
            url: c.html_url,
        }));

        const lines: string[] = [];
        lines.push(`Last 7 days activity for ${owner}/${repo} (since ${sinceIso})`);
        lines.push("");
        lines.push(`Issues updated: ${issueItems.length}`);
        if (issueItems.length) {
            lines.push(...issueItems.map((i) => `- #${i.number} ${i.title} (${i.state}) — ${i.updated_at}`));
        }
        lines.push("");
        lines.push(`PRs updated: ${prItems.length}`);
        if (prItems.length) {
            lines.push(...prItems.map((p) => `- #${p.number} ${p.title} (${p.state}) — ${p.updated_at}`));
        }
        lines.push("");
        lines.push(`Commits: ${commitItems.length}`);
        if (commitItems.length) {
            lines.push(
                ...commitItems.map((c) => `- ${c.sha.slice(0, 7)} ${c.message}${c.author ? ` — ${c.author}` : ""}`),
            );
        }

        const output = {
            owner,
            repo,
            since: sinceIso,
            counts: {
                issues_updated: issueItems.length,
                prs_updated: prItems.length,
                commits: commitItems.length,
            },
            issues: issueItems,
            pull_requests: prItems,
            commits: commitItems,
        };

        return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
            structuredContent: output,
        };
    }

    export const addComment = async ({ owner, repo, issue_Number, body }: { owner: string; repo: string; issue_Number: number; body: string }) =>{
      const octokit = getOctokit();
      await octokit.issues.createComment({ owner, repo, issue_number: issue_Number, body });
        const output = {
            status: "success",
            message: `Comment added to #${issue_Number}`,
        };
        return {
            content: [{ type: "text" as const, text: output.message }],
            structuredContent: output,
        };
    }