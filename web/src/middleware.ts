import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/guess")) {
    const u = new URL("/login", req.url);
    u.searchParams.set("callbackUrl", "/guess");
    return NextResponse.redirect(u);
  }
  if (!req.auth && req.nextUrl.pathname.startsWith("/admin")) {
    const u = new URL("/login", req.url);
    u.searchParams.set("callbackUrl", "/admin");
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/guess/:path*", "/admin/:path*"],
};
