import { runInit } from "./init";
import { runStart } from "./start";

const HELP = `
myself-op watcher

  node myself-op.js init     One-time setup: paste your token, install the skill.
  node myself-op.js start    Subscribe to events and invoke your agent.
  node myself-op.js help     Show this message.

Environment overrides:
  MYSELF_SUPABASE_URL    Override the Supabase URL (default: baked in at build).
  MYSELF_AGENT_CMD       Command to invoke for processing events (default: "openclaw").
  CLAUDE_SKILLS_DIR      Where to install the skill (default: ~/.claude/skills).
`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case "init":
      await runInit();
      return;
    case "start":
      await runStart();
      return;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      return;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
