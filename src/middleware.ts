import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl;

  // Skip subdomain detection for localhost, 127.0.0.1, and Vercel preview URLs
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("vercel.app") ||
    host.includes("netlify.app")
  ) {
    return NextResponse.next();
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "siteforge.dev";

  // Remove port if present
  const hostname = host.split(":")[0];

  // Check for subdomain (e.g., mysite.siteforge.dev)
  if (hostname.endsWith(`.${rootDomain}`)) {
    const subdomain = hostname.replace(`.${rootDomain}`, "");

    if (subdomain && subdomain !== "www" && subdomain !== "app" && subdomain !== "api") {
      url.pathname = `/s/${subdomain}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
