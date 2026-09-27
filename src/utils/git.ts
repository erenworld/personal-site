import { execSync } from "node:child_process";

export const REPO_URL = "https://github.com/erenworld/personal-site";

function git(args: string): string | undefined {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return undefined;
  }
}

const sha =
  git("rev-parse HEAD") ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.COMMIT_REF;

const branch = git("rev-parse --abbrev-ref HEAD");

export const gitInfo = {
  sha,
  shortSha: sha?.slice(0, 7),
  branch: branch && branch !== "HEAD" ? branch : "main",
};
