import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://drink-tools.vercel.app/api/claude";

export async function POST(req: NextRequest) {
  try {
    const { message, chatId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const params = new URLSearchParams({ text: message });
    if (chatId) params.set("chatId", chatId);

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AI API returned status ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      reply: data.reply || "No response from AI.",
      chatId: data.chatId || null,
      model: data.model || "unknown",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to AI service." },
      { status: 500 }
    );
  }
}
