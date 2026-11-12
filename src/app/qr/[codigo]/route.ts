import { NextResponse } from "next/server";
import { query, withConnection } from "@/lib/oracle";

export const dynamic = "force-dynamic";

const WHATSAPP = "573147172603";

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = codigo.toUpperCase();

  if (/^[A-Z0-9_-]{4,32}$/.test(code)) {
    try {
      const rows = await withConnection((conn) =>
        query<{ nombre: string }>(conn, `SELECT nombre FROM aliados WHERE codigo = :v_code AND active = 1`, { v_code: code })
      );
      if (rows[0]) {
        const text = `Hola Mundo Alitas 👋 Vengo de ${rows[0].nombre} (código ${code}). Quiero hacer un pedido.`;
        return NextResponse.redirect(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`);
      }
    } catch (error) {
      console.error("Aliado redirect:", error);
    }
  }
  return NextResponse.redirect(new URL("/", request.url));
}