import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-session";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success || !verifyAdminPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    await createAdminSession();
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión. Revisa la configuración del servidor." }, { status: 500 });
  }
}
