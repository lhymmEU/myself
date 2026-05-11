import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Modules that may only appear in code that is gated to local mode.
 * Keep this list small and explicit — adding a new entry means adding a
 * matching `isLocal()` guard at the call site.
 */
const LOCAL_ONLY_NODE_MODULES = [
  "fs",
  "node:fs",
  "fs/promises",
  "node:fs/promises",
  "child_process",
  "node:child_process",
  "net",
  "node:net",
  "dns",
  "node:dns",
  "tls",
  "node:tls",
  "better-sqlite3",
  "ssh2",
  "nodemailer",
];

/**
 * Named exports of `@/lib/db` (or its concrete files) that bypass the
 * Drizzle ORM. They are reserved for `lib/db/**` and the small set of
 * legacy adapters that still own raw SQL.
 */
const RESTRICTED_DB_NAMED_IMPORTS = ["getPgClient"];

/**
 * Files that legitimately need either local-only Node modules or raw
 * SQLite handles. Anything not in this list must go through the runtime
 * capability layer (`lib/core/runtime.ts`) and the Drizzle ORM.
 */
const LOCAL_ONLY_FILE_PATTERNS = [
  "lib/db/**",
  "lib/core/db.ts",
  "lib/core/mailer.ts",
  "lib/claw/ssh.ts",
  "lib/modules/vault/actions.ts",
  "scripts/**",
  "app/api/finance/openbb/credentials/route.ts",
  "app/api/vault/read-local-file/route.ts",
];

const restrictedImportsRule = {
  paths: [
    ...LOCAL_ONLY_NODE_MODULES.map((name) => ({
      name,
      message: `\`${name}\` is local-only. Move the call into lib/local-only or guard with isLocal() inside an approved file.`,
      // Type-only imports are erased at compile time so they don't pull
      // the native module into the cloud bundle — those are fine.
      allowTypeImports: true,
    })),
    {
      name: "@/lib/db",
      importNames: RESTRICTED_DB_NAMED_IMPORTS,
      message:
        "Raw DB handle getPgClient is forbidden outside lib/db/. Use Drizzle via getDb().",
      allowTypeImports: true,
    },
  ],
  patterns: [
    {
      group: ["@/lib/db/index", "@/lib/db/index.*"],
      importNames: RESTRICTED_DB_NAMED_IMPORTS,
      message:
        "Raw DB handles are forbidden outside lib/db/. Use the Drizzle ORM via getDb().",
      allowTypeImports: true,
    },
  ],
};

/**
 * Catches the `require("fs")`-inside-a-function escape hatch that several
 * legacy adapters use. Allowed only in the explicit allowlist above.
 */
const restrictedRequireSyntax = {
  selector: `CallExpression[callee.name='require'][arguments.0.value=/^(${LOCAL_ONLY_NODE_MODULES.map(
    (m) => m.replace(/[/]/g, "\\/"),
  ).join("|")})$/]`,
  message:
    "require() of local-only Node modules is forbidden outside the local-only allowlist. Move the call into lib/local-only or an approved file.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "workers/**",
    "lobsterd/**",
    // Vendored Go WASM runtime — shipped with the Go toolchain. Don't lint
    // or modify; replace by copying a fresh copy from $(go env GOROOT)/lib/wasm.
    "public/wasm/wasm_exec.js",
  ]),
  {
    name: "dual-mode/local-isolation",
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      "no-restricted-imports": ["error", restrictedImportsRule],
      "no-restricted-syntax": ["error", restrictedRequireSyntax],
      // Conventional: arguments / variables prefixed with _ are intentionally unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    name: "dual-mode/local-isolation-allowlist",
    files: LOCAL_ONLY_FILE_PATTERNS,
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
