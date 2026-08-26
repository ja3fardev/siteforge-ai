import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl;

  // Check for subdomain (e.g., mysite.siteforge.dev)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "siteforge.dev";
  const subdomain = host.replace(`.${rootDomain}`, "").replace(rootDomain, "");

  if (subdomain && subdomain !== "www" && subdomain !== "app" && subdomain !== "api") {
    // Rewrite to the subdomain page
    url.pathname = `/s/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
