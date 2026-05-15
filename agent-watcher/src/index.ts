import { runInit } from "./init";
import { runStart } from "./start";

const HELP = `
myself-op watcher

  node myself-op.js init     One-time setup: paste your token, install the skill.
  node myself-op.js start    Subscribe to events and invoke your agent.
  node myself-op.js help     Show this message.

Environment overrides:
  MYSELF_SUPABASE_URL          Override the Supabase URL (default: baked in at build).
  MYSELF_SUPABASE_ANON_KEY     Override the anon/publishable key (default: baked in).
  MYSELF_AGENT_CMD             Command to invoke for processing events (default: "openclaw").
  MYSELF_OP_SKILL_DIR          Where to write the skill scripts (default: ~/.myself-op/skill).
  MYSELF_OP_SESSION_ID         openclaw session id (default: "myself-op-watcher").
  MYSELF_OP_AGENT_TIMEOUT_SEC  openclaw agent timeout in seconds (default: 600).
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
