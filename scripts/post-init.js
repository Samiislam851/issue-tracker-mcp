#!/usr/bin/env node
/**
 * Post-init script for TypeScript default template.
 *
 * Renames "my-mcp-server" to the actual project name in src/index.ts.
 * package.json is already handled by the CLI.
 *
 * Environment variables (set by mcpize init):
 * - MCPIZE_PROJECT_DIR: Target project directory
 * - MCPIZE_PROJECT_NAME: Project name (basename of target dir)
 */

import fs from "node:fs";
import path from "node:path";

const TEMPLATE_NAME = "my-mcp-server";

const projectDir = process.env.MCPIZE_PROJECT_DIR || process.cwd();
const projectName = process.env.MCPIZE_PROJECT_NAME || TEMPLATE_NAME;

if (projectName === TEMPLATE_NAME) {
  process.exit(0);
}

// Files to update with project name
const filesToUpdate = [
  { path: path.join(projectDir, "src", "index.ts"), desc: "src/index.ts" },
  { path: path.join(projectDir, "README.md"), desc: "README.md" },
];

for (const { path: filePath, desc } of filesToUpdate) {
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, "utf-8");
  const updated = content.replaceAll(TEMPLATE_NAME, projectName);

  if (content !== updated) {
    fs.writeFileSync(filePath, updated);
    console.log(`  Updated ${desc}: "${TEMPLATE_NAME}" -> "${projectName}"`);
  }
}
