"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Camera, CheckCircle2, LogOut, ScanLine, ShieldCheck, XCircle } from "lucide-react";
import { giftLabel } from "@/lib/gifts";

type PrizeResult = {
  type: "prize";
  status: "redeemed" | "already_redeemed" | "not_found";
  participant?: { full_name: string; whatsapp: string; instagram: string; gift: string; redeemed_at: string | null; created_at: string };
};
type CouponResult = {
  type: "ally_coupon";
  status: "redeemed" | "already_redeemed";
  coupon: { nombre_cliente: string; whatsapp: string; estado: string; usado_en: string | null; creado_en: string; aliado_nombre: string };
};
type UnknownResult = { type: "unknown"; status: "not_found" };
type Redemption = PrizeResult | CouponResult | UnknownResult;

export default function CanjePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [message, setMessage] = useState<Redemption | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      try { await scanner.stop(); } catch { /* la cámara pudo haberse detenido */ }
    }
    scannerRef.current = null;
    setScannerActive(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session").then((r) => r.json()).then((d) => setAuthenticated(Boolean(d.authenticated))).catch(() => setAuthenticated(false)).finally(() => setChecking(false));
  }, []);

  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); setBusy(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible iniciar sesión.");
      setAuthenticated(true); setPassword("");
    } catch (err) { setLoginError(err instanceof Error ? err.message : "Error de acceso."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await stopScanner();
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false); setMessage(null);
  }

  async function redeem(decodedText: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    await stopScanner();
    setBusy(true); setMessage(null); setLoginError("");
    try {
      const response = await fetch("/api/canje", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qr_token: decodedText.trim() }) });
      const data = await response.json();
      if (response.status === 401) { setAuthenticated(false); throw new Error("La sesión expiró. Inicia sesión nuevamente."); }
      if (!response.ok) throw new Error(data.error || "No fue posible verificar el código.");
      setMessage(data as Redemption);
    } catch (err) {
      setMessage({ type: "unknown", status: "not_found" });
      setLoginError(err instanceof Error ? err.message : "No fue posible verificar el código.");
    } finally { setBusy(false); processingRef.current = false; }
  }

  async function startScanner() {
    setLoginError(""); setMessage(null);
    try {
      const scanner = new Html5Qrcode("mundo-alitas-reader");
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 }, (text) => { void redeem(text); }, () => {});
      setScannerActive(true);
    } catch {
      setLoginError("No pudimos activar la cámara. Revisa los permisos del navegador y utiliza HTTPS o localhost.");
      scannerRef.current = null;
    }
  }

  if (checking) return <main className="operator-page"><div className="operator-loading">MUNDO ALITAS</div></main>;

  if (!authenticated) return (
    <main className="operator-page">
      <header className="simple-header"><Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link><Link href="/" className="back-link"><ArrowLeft size={15} /> Inicio</Link></header>
      <section className="login-card">
        <div className="operator-symbol"><ShieldCheck size={25} /></div>
        <p className="eyebrow">ZONA DE OPERADORES</p><h1>ACCESO<br /><em>PRIVADO.</em></h1>
        <p className="muted">Ingresa la contraseña para validar premios y cupones de aliados.</p>
        <form onSubmit={login} className="login-form"><label>Contraseña de operador<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required autoComplete="current-password" /></label>{loginError && <p className="error-message">{loginError}</p>}<button className="button button-gold submit-button" disabled={busy}>{busy ? "Verificando..." : "Entrar al panel"}</button></form>
      </section>
    </main>
  );

  const isCoupon = message?.type === "ally_coupon";
  const success = message?.status === "redeemed";

  return (
    <main className="operator-page">
      <header className="simple-header"><Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link><button className="text-button" onClick={logout}><LogOut size={15} /> Cerrar sesión</button></header>
      <section className="operator-layout">
        <div><p className="eyebrow">PANEL DE CONTROL</p><h1>VALIDAR<br /><em>PREMIOS.</em></h1><p className="muted">Un solo lector para premios y cupones de aliados. El sistema identifica automáticamente el tipo de código.</p></div>
        <div className="scanner-card">
          <div className="scanner-card-head"><span><ScanLine size={17} /> LECTOR QR</span><span className="live-dot">● {scannerActive ? "CÁMARA ACTIVA" : "EN ESPERA"}</span></div>
          <div id="mundo-alitas-reader" className="scanner-viewport"><div className="scanner-placeholder"><Camera size={30} /><span>La cámara aparecerá aquí</span></div></div>
          {!scannerActive ? <button className="button button-gold submit-button" onClick={startScanner} disabled={busy}><Camera size={17} /> Activar cámara</button> : <button className="button button-outline submit-button" onClick={stopScanner}>Detener cámara</button>}
          {loginError && <p className="error-message">{loginError}</p>}

          {message && (
            <div className={`redemption-result ${success ? "redeemed" : "not-found"}`}>
              {success ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
              {message.type === "prize" ? (
                <>
                  <strong>{message.status === "redeemed" ? "PREMIO CANJEADO" : message.status === "already_redeemed" ? "ESTE PREMIO YA FUE ENTREGADO" : "CÓDIGO NO VÁLIDO"}</strong>
                  {message.participant && <><span className="result-name">{message.participant.full_name}</span><span className="result-gift">{giftLabel(message.participant.gift)}</span><small>{message.status === "redeemed" ? "Entrega confirmada correctamente." : `Canje registrado: ${message.participant.redeemed_at ? new Date(message.participant.redeemed_at).toLocaleString("es-CO") : "anteriormente"}`}</small></>}
                </>
              ) : message.type === "ally_coupon" ? (
                <>
                  <strong>{message.status === "redeemed" ? "CUPÓN VÁLIDO" : "CUPÓN INVÁLIDO / YA UTILIZADO"}</strong>
                  <span className="result-name">{message.coupon.nombre_cliente}</span>
                  <span className="result-gift">Referido por: {message.coupon.aliado_nombre}</span>
                  <small>{message.status === "redeemed" ? "Cupón marcado como USADO. Puede entregar cualquier producto del menú." : `Este cupón ya fue utilizado${message.coupon.usado_en ? ` el ${new Date(message.coupon.usado_en).toLocaleString("es-CO")}` : ""}.`}</small>
                  <small>WhatsApp: {message.coupon.whatsapp}</small>
                </>
              ) : (
                <strong>CUPÓN / CÓDIGO INVÁLIDO</strong>
              )}
              <button className="text-button" onClick={() => { setMessage(null); setLoginError(""); }}>Escanear otro código</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
