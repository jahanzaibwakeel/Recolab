import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { query } from "../db/pool.js";

export interface ModelArtifact {
  version: string;
  createdAt: string;
  algorithmWeights: Record<string, number>;
  diversityLambda?: number;
  explorationRate?: number;
  metrics?: unknown;
  notes?: string[];
}

function candidatePaths(artifactPath: string) {
  if (path.isAbsolute(artifactPath)) return [artifactPath];
  return [
    path.resolve(process.cwd(), artifactPath),
    path.resolve(process.cwd(), "../..", artifactPath),
    path.resolve(config.artifactDir, path.basename(artifactPath))
  ];
}

export async function readModelArtifact(artifactPath?: string | null): Promise<ModelArtifact | null> {
  if (!artifactPath) return null;
  for (const candidate of candidatePaths(artifactPath)) {
    try {
      await access(candidate);
      return JSON.parse(await readFile(candidate, "utf8")) as ModelArtifact;
    } catch {
      // Try the next local artifact location; missing artifacts should not break serving.
    }
  }
  return null;
}

export async function writeModelArtifact(version: string, artifactPath: string, artifact: Omit<ModelArtifact, "version" | "createdAt">) {
  const destination = candidatePaths(artifactPath).at(-1) ?? path.resolve(config.artifactDir, `${version}.json`);
  await mkdir(path.dirname(destination), { recursive: true });
  const payload: ModelArtifact = {
    version,
    createdAt: new Date().toISOString(),
    ...artifact
  };
  await writeFile(destination, JSON.stringify(payload, null, 2), "utf8");
  return destination;
}

export async function modelServingOverrides(version: string) {
  const result = await query("SELECT algorithm_weights, artifact_path FROM model_versions WHERE version = $1", [version]);
  const row = result.rows[0];
  if (!row) return null;
  const artifact = await readModelArtifact(row.artifact_path);
  return {
    weights: artifact?.algorithmWeights ?? row.algorithm_weights ?? null,
    diversityLambda: artifact?.diversityLambda,
    explorationRate: artifact?.explorationRate,
    artifactLoaded: Boolean(artifact),
    artifactPath: row.artifact_path
  };
}
