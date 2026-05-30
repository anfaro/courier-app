export const APP_VERSION = "1.1.0";

export async function getCommitHash(): Promise<string> {
  try {
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    }
    const { execSync } = await import("child_process");
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}
