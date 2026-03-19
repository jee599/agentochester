import { NextRequest, NextResponse } from "next/server";
import { smartDecompose } from "@/lib/smart-decomposer";
import { decomposePrompt } from "@/lib/decomposer";
import { matchAgent } from "@/lib/agents-handler";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    // 1. Try LLM-based decomposition, fallback to keyword-based
    let tasks;
    try {
      tasks = await smartDecompose(prompt);
    } catch {
      tasks = decomposePrompt(prompt);
    }

    // 2. Match each task to an agent
    const results = await Promise.all(
      tasks.map(async (task) => {
        const match = await matchAgent(task.role, task.action);
        return {
          task,
          match: {
            agent: match.agent,
            matchType: match.matchType,
            candidates: match.candidates,
          },
        };
      })
    );

    return NextResponse.json({
      prompt,
      tasks: results,
      summary: {
        totalTasks: results.length,
        matched: results.filter((r) => r.match.agent !== null).length,
        unmatched: results.filter((r) => r.match.agent === null).length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to compose" },
      { status: 500 }
    );
  }
}
