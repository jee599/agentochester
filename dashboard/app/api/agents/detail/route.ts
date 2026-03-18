import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

function findAgentFile(role: string): { type: "builtin" | "external"; path: string; division?: string } | null {
  // Check builtin first
  const builtinDir = path.resolve(process.cwd(), "..", "agents", "builtin");
  if (fs.existsSync(builtinDir)) {
    const files = fs.readdirSync(builtinDir).filter((f) => f.endsWith(".yaml"));
    for (const f of files) {
      const content = fs.readFileSync(path.join(builtinDir, f), "utf-8");
      const parsed = yaml.parse(content);
      if (parsed.role === role) {
        return { type: "builtin", path: path.join(builtinDir, f) };
      }
    }
  }

  // Check external
  const externalDir = path.resolve(process.cwd(), "..", "agents", "external", "agency-agents");
  if (fs.existsSync(externalDir)) {
    const EXCLUDED = new Set(["scripts", "integrations", "examples", ".github", ".git"]);
    const dirs = fs.readdirSync(externalDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory() || EXCLUDED.has(dir.name)) continue;
      const found = findMdByRole(path.join(externalDir, dir.name), role);
      if (found) return { type: "external", path: found, division: dir.name };
    }
  }

  return null;
}

function findMdByRole(dirPath: string, role: string): string | null {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const found = findMdByRole(fullPath, role);
      if (found) return found;
    } else if (entry.name.endsWith(".md") && !["README.md", "CONTRIBUTING.md"].includes(entry.name)) {
      const basename = entry.name.replace(".md", "");
      const prefixes = [
        "engineering-", "design-", "marketing-", "product-", "testing-",
        "support-", "sales-", "paid-media-", "project-management-",
        "specialized-", "game-development-", "academic-", "strategy-", "spatial-computing-",
      ];
      let inferredRole = basename;
      for (const p of prefixes) {
        if (inferredRole.startsWith(p)) { inferredRole = inferredRole.slice(p.length); break; }
      }
      if (inferredRole.replace(/-/g, "_") === role) return fullPath;
    }
  }
  return null;
}

function parseBuiltinAgent(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const p = yaml.parse(content);
  return {
    name: p.name,
    role: p.role,
    description: p.description || "",
    source: "builtin",
    identity: {
      personality: p.identity?.personality?.trim() || "",
      communication: p.identity?.communication?.trim() || "",
      thinking: p.identity?.thinking?.trim() || "",
    },
    critical_rules: {
      must: p.critical_rules?.must || [],
      must_not: p.critical_rules?.must_not || [],
    },
    deliverables: p.deliverables || [],
    success_metrics: p.success_metrics || [],
    tags: p.tags || [],
  };
}

function parseExternalAgent(filePath: string, division: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const content = raw.replace(/^---[\s\S]*?---\n*/, "");

  const nameMatch = content.match(/^#\s+(.+)/m);
  const name = nameMatch ? nameMatch[1].replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim() : "Unknown";

  const sections = content.split(/^##\s+/m).slice(1).map((s) => {
    const lines = s.split("\n");
    const heading = lines[0].replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
    const body = lines.slice(1).join("\n").trim();
    return { heading, body };
  });

  const find = (keys: string[]) => sections.find((s) => keys.some((k) => s.heading.toLowerCase().includes(k.toLowerCase())))?.body || "";

  const identityBody = find(["Identity", "Memory"]);
  const getBold = (text: string, label: string) => {
    const m = text.match(new RegExp(`\\*\\*${label}\\*\\*[:\\s]*(.+)`, "i"));
    return m ? m[1].trim() : "";
  };

  const rulesBody = find(["Critical Rules", "Rules"]);
  const bullets = (text: string) => [...text.matchAll(/^[-*]\s+(.{6,})/gm)].map((m) => m[1].trim());

  const alwaysMatch = rulesBody.match(/###?\s*(?:ALWAYS|Must|Do)[\s\S]*?(?=###?\s*(?:NEVER|Must Not|Don't)|$)/i);
  const neverMatch = rulesBody.match(/###?\s*(?:NEVER|Must Not|Don't)[\s\S]*/i);

  const missionBody = find(["Core Mission", "Mission"]);
  const firstSentence = missionBody.match(/^[^.!?]+[.!?]/)?.[0]?.trim() || missionBody.slice(0, 200);

  return {
    name,
    role: "",
    description: firstSentence,
    source: "external",
    division,
    identity: {
      personality: getBold(identityBody, "Personality") || identityBody.slice(0, 300),
      communication: getBold(identityBody, "Communication Style") || getBold(identityBody, "Communication"),
      thinking: getBold(identityBody, "Thinking") || getBold(identityBody, "Approach"),
    },
    critical_rules: {
      must: alwaysMatch ? bullets(alwaysMatch[0]) : bullets(rulesBody),
      must_not: neverMatch ? bullets(neverMatch[0]) : [],
    },
    deliverables: bullets(find(["Deliverables", "Outputs"])).slice(0, 8),
    success_metrics: bullets(find(["Success Metrics", "Metrics"])).slice(0, 8),
    tags: [],
  };
}

export async function GET(request: NextRequest) {
  const role = new URL(request.url).searchParams.get("role");
  if (!role) return NextResponse.json({ error: "role required" }, { status: 400 });

  const found = findAgentFile(role);
  if (!found) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  try {
    const data = found.type === "builtin"
      ? parseBuiltinAgent(found.path)
      : parseExternalAgent(found.path, found.division || "");
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "parse error" }, { status: 500 });
  }
}
