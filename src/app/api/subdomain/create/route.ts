import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findProjectById, findSubdomainBySlug, createSubdomain } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { projectId, slug } = await req.json();

    if (!projectId || !slug) {
      return NextResponse.json({ error: "projectId and slug are required" }, { status: 400 });
    }

    // Verify project ownership
    const project = findProjectById(projectId);
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if slug is available
    const existing = findSubdomainBySlug(slug);
    if (existing) {
      return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
    }

    const subdomain = createSubdomain({ slug, projectId, userId });

    return NextResponse.json({ subdomain }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create subdomain" }, { status: 500 });
  }
}
