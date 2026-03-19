import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import { getUserCredits } from "@/lib/user-kv";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  const session = await getSession(sessionId).catch(() => null);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const credits = await getUserCredits(session.userId).catch(() => null);

  return NextResponse.json({
    user: {
      email: session.email,
      userId: session.userId,
      credits,
    },
  });
}
