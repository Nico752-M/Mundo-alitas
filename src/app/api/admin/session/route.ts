import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/admin-session";

export async function GET() {
  return NextResponse.json({ authenticated: await isAdminSessionValid() });
}
