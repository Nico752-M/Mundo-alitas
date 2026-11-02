"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, Copy, RotateCcw } from "lucide-react";

type Participant = {
  id: string;
  full_name: string;
  qr_token: string;
  birth_date: string;
  room: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
};

const initialForm = {
  code: "",
  full_name: "",
  whatsapp: "",
  birth_date: ""
};

export default function CoworkingRegistroPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<Participant | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/coworking/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No fue posible completar el registro.");
      }

      setResult(data.participant);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!result) return;

    await navigator.clipboard.writeText(result.qr_token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (result) return (
    <main className="form-page coworking-page">
      <header className="simple-header">
        <Link href="/coworking" className="wordmark">
          MUNDO <span>ALITAS</span>
        </Link>
        <span>REGISTRO COMPLETADO</span>
      </header>

      <section className="success-layout">
        <div className="success-copy">
          <div className="success-icon"><Check size={22} /></div>
          <p className="eyebrow">TU ESPACIO TE ESPERA</p>
          <h1>¡LISTO,<br /><em>{result.full_name.split(" ")[0]}!</em></h1>
          <p className="muted">
            Tu inscripción y reserva quedaron guardadas.
            Presenta este QR en la entrada. Después de escanearlo,
            quedará utilizado y no podrá volver a ingresar con el mismo código.
          </p>

          <div className="reservation-summary">
            <h3>DETALLES DE TU RESERVA</h3>
            <p><strong>Sala:</strong> {result.room}</p>
            <p><strong>Fecha:</strong> {result.reservation_date}</p>
            <p><strong>Horario:</strong> {result.start_time} – {result.end_time}</p>
          </div>

          <button className="button button-outline" onClick={copyCode}>
            <Copy size={16} />
            {copied ? "Código copiado" : "Copiar código"}
          </button>
        </div>

        <div className="qr-card">
          <div className="qr-card-top">
            <span>MUNDO ALITAS</span>
            <span>COWORKING</span>
          </div>
          <div className="qr-frame">
            <QRCodeSVG value={result.qr_token} size={224} level="H" includeMargin />
          </div>
          <strong>Tu QR personal de entrada</strong>
          <p>Guarda una captura y preséntala en la entrada. Es válido para una sola entrada.</p>
          <div className="qr-code-id">
            {result.qr_token.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <button
          className="text-button success-reset"
          onClick={() => {
            setResult(null);
            setForm(initialForm);
          }}
        >
          <RotateCcw size={15} /> Registrar otra persona
        </button>
      </section>
    </main>
  );

  return (
    <main className="form-page coworking-page">
      <header className="simple-header">
        <Link href="/coworking" className="wordmark">
          MUNDO <span>ALITAS</span>
        </Link>
        <Link href="/coworking" className="back-link">
          <ArrowLeft size={15} /> Coworking
        </Link>
      </header>

      <section className="registration-layout">
        <div className="registration-intro">
          <p className="eyebrow">COWORKING · INSCRIPCIÓN</p>
          <h1>ACTIVA<br />TU <em>ACCESO.</em></h1>
          <p className="muted">
            Ingresa el código que te entregó el establecimiento después de
            confirmar tu pago y completa tus datos para recibir tu QR personal.
          </p>
          <div className="intro-index">
            <span>01</span><div /><span>REGISTRO DE VISITANTE</span>
          </div>
        </div>

        <form className="registration-form" onSubmit={submit}>
          <div className="form-heading">
            <span>FORMULARIO</span>
            <span>01 / 01</span>
          </div>

          <label>
            Código de inscripción
            <input
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              placeholder="Ingresa tu código"
              autoComplete="off"
              required
              minLength={4}
              maxLength={32}
            />
          </label>

          <label>
            Nombre completo
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="Escribe tu nombre"
              autoComplete="name"
              required
              minLength={3}
              maxLength={100}
            />
          </label>

          <label>
            Número de WhatsApp
            <input
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="Ej. 300 123 4567"
              inputMode="tel"
              autoComplete="tel"
              required
              minLength={7}
              maxLength={20}
            />
          </label>

          <label>
            Fecha de cumpleaños
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => update("birth_date", e.target.value)}
              max={new Date().toLocaleDateString("en-CA")}
              required
            />
          </label>

          {error && <p className="error-message">{error}</p>}

          <button
            className="button button-gold submit-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Validando..." : "Confirmar inscripción"}
            <Check size={17} />
          </button>

          <p className="privacy-note">
            El código se utiliza una vez por cada inscripción.
            Cada persona recibe un QR individual de una sola entrada.
          </p>
        </form>
      </section>
    </main>
  );
}
