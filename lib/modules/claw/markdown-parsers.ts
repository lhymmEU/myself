export interface PublicApi {
  category: string;
  name: string;
  url: string;
  description: string;
  auth: string;
  https: boolean;
  cors: string;
}

export interface PublicApisResult {
  categories: { name: string; count: number }[];
  apis: PublicApi[];
  total: number;
}

export interface CliTool {
  category: string;
  subcategory: string | null;
  name: string;
  url: string;
  description: string;
}

export interface CliToolsResult {
  categories: { name: string; count: number }[];
  tools: CliTool[];
  total: number;
}

const EXCLUDED_PUBLIC_API_SECTIONS = new Set([
  "APILayer APIs",
  "Learn more about Public APIs",
  "Index",
]);

export function parsePublicApis(markdown: string): PublicApisResult {
  const apis: PublicApi[] = [];
  const catCounts = new Map<string, number>();
  let currentCategory = "";

  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const catMatch = line.match(/^###\s+(.+)/);
    if (catMatch) {
      const name = catMatch[1].trim();
      if (!EXCLUDED_PUBLIC_API_SECTIONS.has(name)) {
        currentCategory = name;
      }
      continue;
    }

    if (!currentCategory) continue;

    const rowMatch = line.match(
      /^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|?\s*$/
    );
    if (rowMatch) {
      const auth = rowMatch[4].replace(/`/g, "").trim();
      const httpsRaw = rowMatch[5].trim();
      const corsRaw = rowMatch[6].trim();

      apis.push({
        category: currentCategory,
        name: rowMatch[1].trim(),
        url: rowMatch[2].trim(),
        description: rowMatch[3].trim(),
        auth: auth === "No" ? "None" : auth,
        https: httpsRaw.toLowerCase() === "yes",
        cors: corsRaw,
      });

      catCounts.set(currentCategory, (catCounts.get(currentCategory) ?? 0) + 1);
    }
  }

  const categories = Array.from(catCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { categories, apis, total: apis.length };
}

const EXCLUDED_CLI_SECTIONS = new Set([
  "Table of Contents",
  "Other Resources",
  "License",
]);

export function parseCliTools(markdown: string): CliToolsResult {
  const tools: CliTool[] = [];
  const catCounts = new Map<string, number>();
  let currentCategory = "";
  let currentSubcategory: string | null = null;

  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      const name = h2Match[1].trim();
      if (!EXCLUDED_CLI_SECTIONS.has(name)) {
        currentCategory = name;
        currentSubcategory = null;
      } else {
        currentCategory = "";
        currentSubcategory = null;
      }
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match && currentCategory) {
      currentSubcategory = h3Match[1].trim();
      continue;
    }

    if (!currentCategory) continue;

    const entryMatch = line.match(
      /^-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*[-–—]\s*(.+))?/
    );
    if (entryMatch) {
      const description = (entryMatch[3] ?? "").replace(/\.$/, "").trim();

      tools.push({
        category: currentCategory,
        subcategory: currentSubcategory,
        name: entryMatch[1].trim(),
        url: entryMatch[2].trim(),
        description,
      });

      const key = currentCategory;
      catCounts.set(key, (catCounts.get(key) ?? 0) + 1);
    }
  }

  const categories = Array.from(catCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { categories, tools, total: tools.length };
}
