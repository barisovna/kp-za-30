import { NextRequest, NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/auth-magic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Введи корректный email" },
        { status: 400 }
      );
    }

    await sendMagicLink(email.trim().toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("auth/login error:", err);
    return NextResponse.json(
      { error: "Не удалось отправить письмо. Попробуй ещё раз." },
      { status: 500 }
    );
  }
}
