import { NextResponse } from "next/server";
import { query, withConnection } from "@/lib/oracle";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = codigo.toUpperCase();

  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const rows = await withConnection((conn) =>
      query<{ codigo: string }>(
        conn,
        `SELECT codigo FROM aliados WHERE codigo = :v_code AND active = 1`,
        { v_code: code }
      )
    );

    if (!rows[0]) return NextResponse.redirect(new URL("/", request.url));

    // El QR físico del aliado sigue siendo estático; ahora abre el formulario de cupón.
    return NextResponse.redirect(new URL(`/aliados/cupon?codigo=${encodeURIComponent(code)}`, request.url));
  } catch (error) {
    console.error("Aliado QR redirect:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
