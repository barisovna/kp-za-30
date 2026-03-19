import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth-magic";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (sessionId) {
    await deleteSession(sessionId).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("kp_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
