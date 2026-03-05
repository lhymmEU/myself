import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";
import type { MarketplaceSkill } from "@/lib/modules/claw/types";

const CLAWHUB_API = "https://topclawhubskills.com/api";
const GITHUB_API = "https://api.github.com";
const VERCEL_SKILLS_REPO = "vercel-labs/skills";

interface ClawHubEntry {
  slug: string;
  display_name: string;
  summary: string;
  downloads: number;
  stars: number;
  owner_handle: string;
  clawhub_url: string;
  is_certified: boolean;
}

interface GitHubContent {
  name: string;
  type: string;
  path: string;
  html_url: string;
}

async function fetchClawHub(
  query?: string,
  limit = 20
): Promise<MarketplaceSkill[]> {
  const endpoint = query
    ? `${CLAWHUB_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    : `${CLAWHUB_API}/top-downloads?limit=${limit}`;

  const res = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  const entries: ClawHubEntry[] = data.data ?? [];

  return entries.map((e) => ({
    slug: e.slug,
    displayName: e.display_name,
    summary: e.summary,
    downloads: e.downloads,
    stars: e.stars,
    source: "clawhub" as const,
    url: e.clawhub_url,
    certified: e.is_certified,
    owner: e.owner_handle,
  }));
}

async function fetchVercelSkills(
  query?: string,
  limit = 20
): Promise<MarketplaceSkill[]> {
  // Fetch skill directory listing from GitHub
  const res = await fetch(
    `${GITHUB_API}/repos/${VERCEL_SKILLS_REPO}/contents/skills`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "MyClaw-Dashboard",
      },
      next: { revalidate: 600 },
    }
  );
  if (!res.ok) return [];

  const contents: GitHubContent[] = await res.json();
  const dirs = contents
    .filter((c) => c.type === "dir")
    .slice(0, 50);

  // Fetch SKILL.md frontmatter for each skill (limited concurrency)
  const skills: MarketplaceSkill[] = [];
  const batch = dirs.slice(0, 30);

  const results = await Promise.allSettled(
    batch.map(async (dir) => {
      const mdRes = await fetch(
        `https://raw.githubusercontent.com/${VERCEL_SKILLS_REPO}/main/skills/${dir.name}/SKILL.md`,
        { next: { revalidate: 600 } }
      );
      if (!mdRes.ok) return null;
      const text = await mdRes.text();
      const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!fmMatch) return null;
      const fm = fmMatch[1];
      const nameMatch = fm.match(/^name:\s*(.+)$/m);
      const descMatch = fm.match(/^description:\s*(.+)$/m);
      return {
        slug: dir.name,
        displayName: nameMatch?.[1]?.trim() ?? dir.name,
        summary: descMatch?.[1]?.trim() ?? "",
        downloads: 0,
        stars: 0,
        source: "vercel" as const,
        url: `https://skills.sh/vercel-labs/skills/${dir.name}`,
        owner: "vercel-labs",
      };
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      skills.push(r.value);
    }
  }

  if (query) {
    const q = query.toLowerCase();
    return skills
      .filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  return skills.slice(0, limit);
}

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const source = req.nextUrl.searchParams.get("source") ?? "clawhub";
    const query = req.nextUrl.searchParams.get("q") ?? undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);

    if (source === "vercel") {
      const skills = await fetchVercelSkills(query, limit);
      return NextResponse.json({ skills });
    }

    const skills = await fetchClawHub(query, limit);
    return NextResponse.json({ skills });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const { connectionId: cid, slug, source } = await req.json();
    const connectionId = cid ?? getDefaultConnection()?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    const safeSlug = slug.replace(/[^a-zA-Z0-9._\-/@]/g, "");

    let command: string;
    if (source === "vercel") {
      command = `npx skills add vercel-labs/skills@${safeSlug} -g -y`;
    } else {
      command = `clawhub install ${safeSlug}`;
    }

    const result = await executeCommand(connectionId, command, 60000);

    return NextResponse.json({
      success: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
