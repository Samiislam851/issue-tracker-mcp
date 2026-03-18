import { describe, it, expect } from "vitest";
import { hello, echo } from "../src/tools.js";

describe("hello", () => {
  it("returns greeting with name", () => {
    const result = hello("World");
    expect(result.message).toBe("Hello, World! Welcome to MCP.");
  });

  it("handles empty name", () => {
    const result = hello("");
    expect(result.message).toBe("Hello, ! Welcome to MCP.");
  });
});

describe("echo", () => {
  it("echoes back input text", () => {
    const result = echo("test input");
    expect(result.echo).toBe("test input");
  });

  it("includes timestamp", () => {
    const result = echo("test");
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });
});
