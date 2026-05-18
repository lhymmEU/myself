import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Modules forbidden in cloud Next.js code. They show up when somebody
 * accidentally drags in a local-mode shim, an SSH transport, or a packaged
 * mailer that would inflate the Vercel bundle. The allowlist below names
 * the few files (e.g. `lib/db/**`, `lib/core/mailer.ts`) where these are
 * legitimately allowed.
 */
const FORBIDDEN_NODE_MODULES = [
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
 * Files that legitimately need either Node modules above or raw Postgres
 * handles. Anything not in this list must go through the Drizzle ORM.
 */
const FORBIDDEN_MODULE_ALLOWLIST = [
  "lib/db/**",
  "lib/core/mailer.ts",
  "scripts/**",
];

const restrictedImportsRule = {
  paths: [
    ...FORBIDDEN_NODE_MODULES.map((name) => ({
      name,
      message: `\`${name}\` is forbidden in app code. If you really need it, add the file to FORBIDDEN_MODULE_ALLOWLIST in eslint.config.mjs.`,
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
 * Catches the `require("fs")`-inside-a-function escape hatch.
 * Allowed only in the allowlist above.
 */
const restrictedRequireSyntax = {
  selector: `CallExpression[callee.name='require'][arguments.0.value=/^(${FORBIDDEN_NODE_MODULES.map(
    (m) => m.replace(/[/]/g, "\\/"),
  ).join("|")})$/]`,
  message:
    "require() of forbidden Node modules is not allowed outside the allowlist.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Node CLI sub-project: bundled by esbuild into
    // `public/myself-op.js` and run on the user's own machine, not part of
    // the cloud Next.js bundle. It legitimately uses fs/child_process and
    // has its own tsconfig.
    "agent-watcher/**",
    "public/myself-op.js",
  ]),
  {
    name: "cloud/forbidden-modules",
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
    name: "cloud/forbidden-modules-allowlist",
    files: FORBIDDEN_MODULE_ALLOWLIST,
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
