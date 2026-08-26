import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, findUserByUsername, createUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, username, password } = body;

    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }

    // Check if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error("Redis env vars not set");
      return NextResponse.json({ error: "Server configuration error. Please set up the database." }, { status: 500 });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await createUser({ name, email, username, password: hashedPassword });

    return NextResponse.json({ message: "Account created", userId: user.id }, { status: 201 });
  } catch (error: any) {
    console.error("Register error:", error?.message || error);
    return NextResponse.json({ error: "Failed to create account: " + (error?.message || "Unknown error") }, { status: 500 });
  }
}
