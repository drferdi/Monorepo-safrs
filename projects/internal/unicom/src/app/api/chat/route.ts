import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const response = await runAgent(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
