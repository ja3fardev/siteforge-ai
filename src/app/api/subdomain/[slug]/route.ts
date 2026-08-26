import { NextRequest, NextResponse } from "next/server";
import { findSubdomainBySlug, findProjectById } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const subdomain = findSubdomainBySlug(params.slug);
    if (!subdomain) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const project = findProjectById(subdomain.projectId);
    if (!project || !project.published) {
      return NextResponse.json({ error: "Site not found or not published" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
