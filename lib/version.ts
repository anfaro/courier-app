import pkg from "../package.json";

export const APP_VERSION = pkg.version;

export function getCommitHash(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  return "dev";
}
