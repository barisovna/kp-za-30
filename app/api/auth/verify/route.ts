import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, createSession } from "@/lib/auth-magic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=invalid", request.url)
    );
  }

  const email = await verifyMagicToken(token);
  if (!email) {
    return NextResponse.redirect(
      new URL("/login?error=expired", request.url)
    );
  }

  const sessionId = await createSession(email);

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("kp_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    path: "/",
  });
  return response;
}
