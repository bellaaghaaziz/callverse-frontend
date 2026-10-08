import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const roleHome: Record<string, string> = {
  CUSTOMER: "/client",
  ADVISOR: "/advisor",
  SUPERVISOR: "/supervisor",
  ADMIN: "/admin",
};
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname === "/login") return NextResponse.next();
  const home = roleHome[request.cookies.get("role")?.value || ""];
  if (!home) return NextResponse.redirect(new URL("/login", request.url));
  if (!(pathname === home || pathname.startsWith(home + "/")))
    return NextResponse.redirect(new URL(home, request.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
