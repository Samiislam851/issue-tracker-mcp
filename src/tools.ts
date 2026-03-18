/**
 * Pure tool functions — business logic only, no MCP dependency.
 * Each function is registered as an MCP tool in index.ts.
 *
 * This separation makes tools easy to unit test without MCP infrastructure.
 */

export interface HelloResult {
  [key: string]: unknown;
  message: string;
}

export function hello(name: string): HelloResult {
  return { message: `Hello, ${name}! Welcome to MCP.` };
}

export interface EchoResult {
  [key: string]: unknown;
  echo: string;
  timestamp: string;
}

export function echo(text: string): EchoResult {
  return {
    echo: text,
    timestamp: new Date().toISOString(),
  };
}
