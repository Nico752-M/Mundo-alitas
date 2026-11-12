import { NextResponse } from "next/server";

export async function GET() {
  const p = process.env.ADMIN_PASSWORD;
  return NextResponse.json({
    existe: Boolean(p),
    largo: p?.length ?? 0,
    secretLargo: process.env.ADMIN_SESSION_SECRET?.length ?? 0
  });
}