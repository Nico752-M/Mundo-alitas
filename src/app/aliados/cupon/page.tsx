"use client";

import { useEffect, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle2, Ticket } from "lucide-react";

type Coupon = { token: string; nombre: string; aliado: string; creado_en?: string };

export default function AliadoCouponPage() {
  const [codigo, setCodigo] = useState("");
  useEffect(() => {
    setCodigo((new URLSearchParams(window.location.search).get("codigo") || "").toUpperCase());
  }, []);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [existing, setExisting] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function generar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setBusy(true);
    setCoupon(null);

    try {
      const response = await fetch("/api/aliados/cupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nombre, whatsapp })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible generar el cupón.");
      setCoupon(data.coupon);
      setExisting(Boolean(data.existing));
      setNotice(data.message || "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#080806", color: "#f6edcf", padding: "0 18px 60px" }}>
      <header style={{ height: 74, borderBottom: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "auto" }}>
        <Link href="/" style={{ color: "#f6edcf", textDecoration: "none", fontWeight: 900, letterSpacing: "-.04em" }}>MUNDO <span style={{ color: "#ffd52e" }}>ALITAS</span></Link>
        <Link href="/" style={{ color: "#c9c2ac", textDecoration: "none", display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><ArrowLeft size={15} /> Inicio</Link>
      </header>

      <section style={{ width: "min(540px, 100%)", margin: "54px auto 0" }}>
        <p style={{ color: "#ffd52e", letterSpacing: ".2em", fontSize: 11, fontWeight: 800 }}>PROGRAMA DE ALIADOS</p>
        <h1 style={{ fontSize: "clamp(38px, 8vw, 58px)", lineHeight: .98, letterSpacing: "-.045em", margin: "12px 0 14px", color: "#fff" }}>TU ANTOJO<br /><span style={{ color: "#ffd52e" }}>TIENE PREMIO.</span></h1>
        <p style={{ color: "#b9b5a8", lineHeight: 1.65, marginBottom: 28 }}>Registra tus datos y recibe un cupón digital para reclamar cualquier producto del menú de Mundo Alitas.</p>

        {!coupon ? (
          <form onSubmit={generar} style={{ background: "linear-gradient(145deg,#191916,#10100e)", border: "1px solid rgba(255,213,46,.25)", borderRadius: 12, padding: "26px 24px", display: "grid", gap: 17 }}>
            <label style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 700 }}>Nombre completo
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} maxLength={100} placeholder="Tu nombre" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 700 }}>WhatsApp
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required minLength={7} maxLength={30} inputMode="tel" placeholder="Ej. 3001234567" style={inputStyle} />
              <small style={{ color: "#918d80", fontWeight: 400, lineHeight: 1.5 }}>Lo usamos para identificar tu cupón. Solo puedes tener uno activo a la vez.</small>
            </label>
            {notice && <p role="alert" style={{ color: "#ffb5a9", fontSize: 13, margin: 0 }}>{notice}</p>}
            <button disabled={busy || !codigo} style={buttonStyle}>{busy ? "GENERANDO..." : "GENERAR MI CUPÓN"}</button>
            {!codigo && <p style={{ color: "#ffb5a9", fontSize: 12 }}>No se identificó el código del establecimiento. Escanea nuevamente su QR.</p>}
          </form>
        ) : (
          <div style={{ background: "linear-gradient(145deg,#191916,#10100e)", border: "1px solid rgba(255,213,46,.35)", borderRadius: 14, padding: 24, textAlign: "center" }}>
            <CheckCircle2 size={34} color="#ffd52e" />
            <p style={{ color: "#ffd52e", fontSize: 11, letterSpacing: ".18em", fontWeight: 800 }}>{existing ? "YA TENÍAS UN CUPÓN ACTIVO" : "CUPÓN GENERADO"}</p>
            <h2 style={{ color: "#fff", fontSize: 27, margin: "8px 0" }}>¡Hola, {coupon.nombre}!</h2>
            <p style={{ color: "#b9b5a8", fontSize: 14, margin: "0 0 18px" }}>Referido por <strong style={{ color: "#f6edcf" }}>{coupon.aliado}</strong></p>
            <div style={{ background: "#fff", padding: 15, borderRadius: 10, display: "inline-block" }}>
              <QRCodeSVG value={coupon.token} size={220} level="H" includeMargin />
            </div>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#ffd52e", fontWeight: 800, fontSize: 13 }}><Ticket size={17} /> CUPÓN PERSONAL E INTRANSFERIBLE</div>
            <p style={{ color: "#b9b5a8", fontSize: 12, lineHeight: 1.6 }}>Presenta este código QR en Mundo Alitas. El operador lo escaneará para validar tu cupón. Solo puede utilizarse una vez.</p>
            {notice && <p style={{ color: "#d7c98f", fontSize: 12 }}>{notice}</p>}
            <button onClick={() => { setCoupon(null); setNotice(""); }} style={{ ...buttonStyle, background: "transparent", color: "#ffd52e", border: "1px solid rgba(255,213,46,.5)" }}>VOLVER</button>
          </div>
        )}
      </section>
      <footer style={{ maxWidth: 540, margin: "38px auto 0", textAlign: "center", color: "#777367", fontSize: 11 }}>MUNDO ALITAS · EL SABOR TIENE ALAS</footer>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: "100%", height: 48, borderRadius: 6, border: "1px solid rgba(255,255,255,.16)",
  background: "#0b0b09", color: "#fff", padding: "0 13px", outline: "none", fontSize: 15
};

const buttonStyle: CSSProperties = {
  height: 50, border: 0, borderRadius: 6, background: "#ffd52e", color: "#17150f",
  fontWeight: 900, letterSpacing: ".08em", cursor: "pointer", marginTop: 4
};
