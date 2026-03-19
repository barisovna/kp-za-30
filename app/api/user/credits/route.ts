import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import { getUserCredits } from "@/lib/user-kv";

/** GET — серверные кредиты текущего пользователя */
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) return NextResponse.json({ credits: null });

  const session = await getSession(sessionId).catch(() => null);
  if (!session) return NextResponse.json({ credits: null });

  const credits = await getUserCredits(session.userId);
  return NextResponse.json({ credits });
}
