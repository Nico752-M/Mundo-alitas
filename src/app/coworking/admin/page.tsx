"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Camera, CheckCircle2, Copy, LogOut, Plus, ScanLine, ShieldCheck, XCircle } from "lucide-react";

type Code = { id: string; code: string; max_uses: number; used_count: number; active: boolean; created_at: string };
type Participant = { id: string; full_name: string; whatsapp: string; entered_at: string | null; created_at: string; coworking_codes?: { code: string } | null };
type AccessResult = { status: "entered" | "already_entered" | "not_found"; full_name?: string; whatsapp?: string; entered_at?: string | null };

export default function CoworkingAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<Code[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [codeForm, setCodeForm] = useState({ code: "", max_uses: "10" });
  const [notice, setNotice] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) { try { await scanner.stop(); } catch { /* cámara detenida */ } }
    scannerRef.current = null; setScannerActive(false);
  }, []);

  const loadData = useCallback(async () => {
    const response = await fetch("/api/coworking/admin", { cache: "no-store" });
    const data = await response.json();
    if (response.status === 401) { setAuthenticated(false); throw new Error("La sesión expiró. Inicia sesión nuevamente."); }
    if (!response.ok) throw new Error(data.error || "No fue posible cargar los datos.");
    setCodes(data.codes ?? []); setParticipants(data.participants ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session").then((r) => r.json()).then((d) => setAuthenticated(Boolean(d.authenticated))).catch(() => setAuthenticated(false)).finally(() => setChecking(false));
  }, []);
  useEffect(() => { if (authenticated) void loadData().catch((err) => setNotice(err.message)); }, [authenticated, loadData]);
  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); setBusy(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No fue posible iniciar sesión.");
      setAuthenticated(true); setPassword("");
    } catch (err) { setLoginError(err instanceof Error ? err.message : "Error de acceso."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await stopScanner(); await fetch("/api/admin/logout", { method: "POST" }); setAuthenticated(false); setAccessResult(null);
  }

  async function createCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/coworking/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: codeForm.code, max_uses: Number(codeForm.max_uses) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No fue posible crear el código.");
      setCodeForm({ code: "", max_uses: "10" }); setNotice(`Código ${data.code.code} creado correctamente.`); await loadData();
    } catch (err) { setNotice(err instanceof Error ? err.message : "Error al crear el código."); }
    finally { setBusy(false); }
  }

  async function toggleCode(code: Code) {
    setNotice("");
    try {
      const response = await fetch("/api/coworking/codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: code.id, active: !code.active }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No fue posible actualizar el código.");
      await loadData();
    } catch (err) { setNotice(err instanceof Error ? err.message : "Error al actualizar."); }
  }

  async function validateAccess(decodedText: string) {
    if (processingRef.current) return;
    processingRef.current = true; await stopScanner(); setBusy(true); setAccessResult(null);
    try {
      const response = await fetch("/api/coworking/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qr_token: decodedText.trim() }) });
      const data = await response.json(); if (response.status === 401) { setAuthenticated(false); throw new Error("La sesión expiró. Inicia sesión nuevamente."); }
      if (!response.ok) throw new Error(data.error || "No fue posible validar el QR.");
      setAccessResult(data as AccessResult); await loadData();
    } catch (err) { setNotice(err instanceof Error ? err.message : "No fue posible validar el QR."); }
    finally { setBusy(false); processingRef.current = false; }
  }

  async function startScanner() {
    setNotice(""); setAccessResult(null);
    try {
      const scanner = new Html5Qrcode("coworking-reader"); scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 }, (text) => { void validateAccess(text); }, () => {});
      setScannerActive(true);
    } catch { setNotice("No pudimos activar la cámara. Revisa los permisos y utiliza HTTPS o localhost."); scannerRef.current = null; }
  }

  if (checking) return <main className="operator-page"><div className="operator-loading">MUNDO ALITAS</div></main>;
  if (!authenticated) return <main className="operator-page"><header className="simple-header"><Link href="/coworking" className="wordmark">MUNDO <span>ALITAS</span></Link><Link href="/coworking" className="back-link"><ArrowLeft size={15} /> Coworking</Link></header><section className="login-card"><div className="operator-symbol"><ShieldCheck size={25} /></div><p className="eyebrow">ADMINISTRACIÓN COWORKING</p><h1>ACCESO<br /><em>PRIVADO.</em></h1><p className="muted">Utiliza la misma contraseña de administración del sistema Mundo Alitas.</p><form onSubmit={login} className="login-form"><label>Contraseña de administrador<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required autoComplete="current-password" /></label>{loginError && <p className="error-message">{loginError}</p>}<button className="button button-gold submit-button" disabled={busy}>{busy ? "Verificando..." : "Entrar al panel"}</button></form></section></main>;

  return <main className="operator-page coworking-admin-page">
    <header className="simple-header"><Link href="/coworking" className="wordmark">MUNDO <span>ALITAS</span></Link><div className="admin-header-actions"><Link href="/coworking" className="back-link"><ArrowLeft size={15} /> Coworking</Link><button className="text-button" onClick={logout}><LogOut size={15} /> Cerrar sesión</button></div></header>
    <section className="coworking-admin-heading"><p className="eyebrow">PANEL DE CONTROL</p><h1>GESTIONAR<br /><em>COWORKING.</em></h1><p className="muted">Crea códigos para las personas que ya realizaron su pago, controla sus cupos y valida su QR al ingresar.</p></section>
    <section className="coworking-admin-grid">
      <div className="scanner-card"><div className="scanner-card-head"><span><Plus size={17} /> CREAR CÓDIGO</span><span>CUPO CONFIGURABLE</span></div><form className="coworking-create-form" onSubmit={createCode}><label>Nombre del código<input value={codeForm.code} onChange={(e) => setCodeForm((v) => ({ ...v, code: e.target.value.toUpperCase() }))} placeholder="EJ. COWORKING10" required minLength={4} maxLength={32} pattern="[A-Za-z0-9_-]+" /></label><label>Cantidad de personas<input type="number" value={codeForm.max_uses} onChange={(e) => setCodeForm((v) => ({ ...v, max_uses: e.target.value }))} min="1" max="1000" required /></label><button className="button button-gold submit-button" disabled={busy}>Crear código <Plus size={16} /></button></form><p className="privacy-note">Entrega el código únicamente después de confirmar el pago. Cada inscripción consume un cupo.</p></div>
      <div className="scanner-card"><div className="scanner-card-head"><span><ScanLine size={17} /> VALIDAR ENTRADA</span><span className="live-dot">● {scannerActive ? "CÁMARA ACTIVA" : "EN ESPERA"}</span></div><div id="coworking-reader" className="scanner-viewport"><div className="scanner-placeholder"><Camera size={30} /><span>La cámara aparecerá aquí</span></div></div>{!scannerActive ? <button className="button button-gold submit-button" onClick={startScanner} disabled={busy}><Camera size={17} /> Activar cámara</button> : <button className="button button-outline submit-button" onClick={stopScanner}>Detener cámara</button>}{accessResult && <div className={`redemption-result ${accessResult.status === "entered" ? "redeemed" : "not_found"}`}>{accessResult.status === "entered" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}<strong>{accessResult.status === "entered" ? "ENTRADA AUTORIZADA" : accessResult.status === "already_entered" ? "QR YA UTILIZADO" : "QR NO VÁLIDO"}</strong>{accessResult.full_name && <><span className="result-name">{accessResult.full_name}</span><span>{accessResult.whatsapp}</span></>}</div>}</div>
    </section>
    {notice && <p className="coworking-notice">{notice}</p>}
    <section className="coworking-admin-data"><div className="coworking-data-heading"><div><p className="eyebrow">CONTROL DE CUPOS</p><h2>CÓDIGOS <em>CREADOS.</em></h2></div><span>{codes.length} códigos</span></div><div className="coworking-table-wrap"><table className="coworking-table"><thead><tr><th>Código</th><th>Usos</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{codes.map((code) => <tr key={code.id}><td><strong>{code.code}</strong></td><td>{code.used_count} / {code.max_uses}</td><td>{code.active && code.used_count < code.max_uses ? "Activo" : "Inactivo / Agotado"}</td><td><button className="text-button" onClick={() => void toggleCode(code)}>{code.active ? "Desactivar" : "Activar"}</button></td></tr>)}{codes.length === 0 && <tr><td colSpan={4}>Todavía no has creado códigos.</td></tr>}</tbody></table></div></section>
    <section className="coworking-admin-data"><div className="coworking-data-heading"><div><p className="eyebrow">HISTORIAL</p><h2>PERSONAS <em>INSCRITAS.</em></h2></div><span>{participants.length} registros</span></div><div className="coworking-table-wrap"><table className="coworking-table"><thead><tr><th>Nombre</th><th>WhatsApp</th><th>Código</th><th>Entrada</th><th>Registro</th></tr></thead><tbody>{participants.map((person) => <tr key={person.id}><td>{person.full_name}</td><td>{person.whatsapp}</td><td>{person.coworking_codes?.code ?? "—"}</td><td>{person.entered_at ? "Ingresó" : "Pendiente"}</td><td>{new Date(person.created_at).toLocaleString("es-CO")}</td></tr>)}{participants.length === 0 && <tr><td colSpan={5}>Todavía no hay personas inscritas.</td></tr>}</tbody></table></div></section>
  </main>;
}
