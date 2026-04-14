import { getAgentDir, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { type Budget, HindsightClient } from "@vectorize-io/hindsight-client";
import path from "path";
import fs from "fs/promises";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const KnownReadFileError = Type.Object({
  code: Type.Union([Type.Literal("ENOENT"), Type.Literal("EISDIR")]),
});

async function readFile(
  path: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    return await fs.readFile(path, { encoding: "utf8", signal });
  } catch (e) {
    if (Value.Check(KnownReadFileError, e)) {
      return null;
    }
    throw e;
  }
}

function getConfigPath(...parents: string[]): string {
  return path.join(...parents, "extensions", "pi-hindsight.json");
}

type Config = {
  baseUrl: string;
  apiKey?: string;
  bankId: string;
  recall?: {
    types?: string[];
    maxTokens?: number;
    budget?: Budget;
    trace?: boolean;
    queryTimestamp?: string;
    includeEntities?: boolean;
    maxEntityTokens?: number;
    includeChunks?: boolean;
    maxChunkTokens?: number;
    /** Include source facts for observation-type results */
    includeSourceFacts?: boolean;
    /** Maximum tokens for source facts (default: 4096) */
    maxSourceFactsTokens?: number;
    /** Optional list of tags to filter memories by */
    tags?: string[];
    /** How to match tags: 'any' (OR, includes untagged), 'all' (AND, includes untagged), 'any_strict' (OR, excludes untagged), 'all_strict' (AND, excludes untagged). Default: 'any' */
    tagsMatch?: "any" | "all" | "any_strict" | "all_strict";
  };
  recallTimeoutMs?: number;
};

const DEFAULT_CONFIG: Config = {
  baseUrl: "http://localhost:8888",
  bankId: "pi-hindsight",
};

async function loadConfig(
  cwd: string,
  signal: AbortSignal | undefined,
): Promise<Config> {
  const globalPath = getConfigPath(getAgentDir());
  const projectPath = getConfigPath(cwd, ".pi");
  const contents = await Promise.all([
    readFile(globalPath, signal),
    readFile(projectPath, signal),
  ]);
  return contents.reduce((config, content) => {
    if (!content) {
      return config;
    }
    const parsed = JSON.parse(content);
    return { ...config, ...parsed };
  }, DEFAULT_CONFIG);
}

export default function hindsightExtension(pi: ExtensionAPI) {
  let config: Config | null = null;
  let hindsight: HindsightClient | null = null;

  pi.on("session_start", async (_, ctx) => {
    config = await loadConfig(ctx.cwd, ctx.signal);
    hindsight = new HindsightClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (!config || !hindsight) {
      return;
    }

    // TODO: Timeout
    const response = await hindsight.recall(
      config.bankId,
      event.prompt,
      config.recall,
    );
  });
}
