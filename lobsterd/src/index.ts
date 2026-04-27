#!/usr/bin/env node
/**
 * lobsterd CLI entry point.
 *
 * Usage:
 *   lobsterd pair <code> --cloud-url https://your.app [--relay-url wss://...]
 *   lobsterd serve
 *   lobsterd status
 */

import { readConfig } from "./config";
import { runPair } from "./pair";
import { runServe } from "./serve";

interface ParsedArgs {
  command: string | null;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parse(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { command: null, positionals: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!args.command) {
      args.command = arg;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args.flags[key] = true;
      } else {
        args.flags[key] = next;
        i++;
      }
    } else {
      args.positionals.push(arg);
    }
  }
  return args;
}

function help(): never {
  console.log(`Usage:
  lobsterd pair <code> --cloud-url <https://...> [--relay-url <wss://...>] [--ssh-host 127.0.0.1] [--ssh-port 22]
  lobsterd serve
  lobsterd status
`);
  process.exit(2);
}

async function main(): Promise<void> {
  const args = parse(process.argv.slice(2));

  if (!args.command || args.command === "help" || args.command === "--help") {
    help();
  }

  switch (args.command) {
    case "pair": {
      const code = args.positionals[0];
      const cloudUrl = String(args.flags["cloud-url"] ?? "");
      if (!code || !cloudUrl) help();
      await runPair({
        code,
        cloudUrl,
        relayUrl:
          typeof args.flags["relay-url"] === "string"
            ? (args.flags["relay-url"] as string)
            : undefined,
        sshHost:
          typeof args.flags["ssh-host"] === "string"
            ? (args.flags["ssh-host"] as string)
            : undefined,
        sshPort:
          typeof args.flags["ssh-port"] === "string"
            ? Number(args.flags["ssh-port"])
            : undefined,
      });
      break;
    }
    case "serve": {
      const cfg = await readConfig();
      if (!cfg) {
        console.error(
          "No lobsterd config found. Run `lobsterd pair <code> --cloud-url ...` first.",
        );
        process.exit(1);
      }
      await runServe(cfg);
      break;
    }
    case "status": {
      const cfg = await readConfig();
      if (!cfg) {
        console.log("Not paired.");
        process.exit(0);
      }
      console.log(`lobsterId: ${cfg.lobsterId}`);
      console.log(`cloud:     ${cfg.cloudUrl}`);
      console.log(`relay:     ${cfg.relayUrl}`);
      console.log(`sshd:      ${cfg.sshHost}:${cfg.sshPort}`);
      break;
    }
    default:
      help();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
