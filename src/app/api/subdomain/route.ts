import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByUsername, findSubdomainByUser, createSubdomain, findSubdomainBySlug } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { slug, projectId } = await req.json();

    if (!slug || !projectId) {
      return NextResponse.json({ error: "Slug and projectId are required" }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "Slug can only contain lowercase letters, numbers, and hyphens" }, { status: 400 });
    }

    const existing = findSubdomainBySlug(slug);
    if (existing) {
      return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
    }

    const userSubdomain = findSubdomainByUser(userId);
    if (userSubdomain) {
      return NextResponse.json({ error: "You already have a subdomain. Each user can only have one." }, { status: 409 });
    }

    const subdomain = createSubdomain({ slug, projectId, userId });
    return NextResponse.json({ subdomain }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create subdomain" }, { status: 500 });
  }
}
