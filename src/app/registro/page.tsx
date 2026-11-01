
"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, ChevronRight, Copy, Gift, RotateCcw } from "lucide-react";
import { GIFTS } from "@/lib/gifts";

const GIFT_IMAGES = ["/images/alita.png", "/images/Papas.jpg", "/images/cerezada.png"];

type Registration = {
  id: string;
  full_name: string;
  gift: string;
  qr_token: string;
};

const initialForm = {
  full_name: "",
  whatsapp: "",
  instagram: "",
  birth_date: "",
  gift: ""
};

export default function RegistroPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<Registration | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/registro", {
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
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
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

  const selectedGiftIndex = GIFTS.findIndex((gift) => gift.value === form.gift);
  const giftTheme = selectedGiftIndex >= 0
    ? `registration-theme-${selectedGiftIndex + 1}`
    : "registration-theme-default";

  const formComplete =
    form.full_name.trim().length >= 3 &&
    form.whatsapp.trim().length >= 7 &&
    form.instagram.trim().length >= 2 &&
    form.birth_date !== "" &&
    form.gift !== "";

  if (result) {
    const selectedGiftIndex = GIFTS.findIndex((gift) => gift.value === result.gift);
    const selectedGift = GIFTS[selectedGiftIndex];
    const selectedGiftLabel = selectedGiftIndex === 0 ? "1 alita" : selectedGift?.label;

    return (
      <main className="form-page">
        <header className="simple-header">
          <Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link>
          <span>REGISTRO COMPLETADO</span>
        </header>

        <section className="success-layout">
          <div className="success-copy">
            <div className="success-icon"><Check size={22} /></div>
            <p className="eyebrow">YA HACES PARTE</p>
            <h1>¡LISTO,<br /><em>{result.full_name.split(" ")[0]}!</em></h1>
            <p className="muted">Tu registro quedó guardado. Presenta este código al operador para reclamar tu premio.</p>
            <div className="prize-panel">
              <span>Tu premio</span>
              <strong>{selectedGiftLabel}</strong>
            </div>
            <button className="button button-outline" onClick={copyCode}>
              <Copy size={16} /> {copied ? "Código copiado" : "Copiar código"}
            </button>
          </div>

          <div className="qr-card">
            <div className="qr-card-top">
              <span>MUNDO ALITAS</span>
              <span>PREMIO PERSONAL</span>
            </div>
            <div className="qr-frame">
              <QRCodeSVG value={result.qr_token} size={224} level="H" includeMargin />
            </div>
            <strong>Tu código de acceso</strong>
            <p>Guarda una captura de esta pantalla. El código es único y solo puede utilizarse una vez.</p>
            <div className="qr-code-id">{result.qr_token.slice(0, 8).toUpperCase()}</div>
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
  }

  return (
    <main className={`form-page registration-theme ${giftTheme}`}>
      <header className="simple-header">
        <Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link>
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Inicio</Link>
      </header>

      <div className="gift-atmosphere" aria-hidden="true">
        {GIFT_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`gift-photo ${selectedGiftIndex === i ? "is-active" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      <section className="registration-layout">
        <div className="registration-intro">
          <p className="eyebrow">UNA EXPERIENCIA MUNDO ALITAS</p>
          <h1>RECLAMA<br />TU <em>PREMIO.</em></h1>
          <p className="muted">Déjanos tus datos, elige tu regalo y recibe tu código personal para reclamarlo.</p>
          <div className="intro-index">
            <span>01</span><div /><span>REGISTRO DE PARTICIPANTE</span>
          </div>
        </div>

        <form className="registration-form" onSubmit={submit}>
          <div className="form-heading">
            <span>FORMULARIO</span><span>01 / 02</span>
          </div>

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
            Usuario de Instagram
            <input
              value={form.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="@tuusuario"
              autoComplete="off"
              required
              minLength={2}
              maxLength={40}
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

          <fieldset>
            <legend>Elige tu regalo</legend>
            <div className="gift-options">
              {GIFTS.map((gift, index) => (
                <button
                  type="button"
                  key={gift.value}
                  className={`gift-option ${form.gift === gift.value ? "selected" : ""}`}
                  aria-pressed={form.gift === gift.value}
                  onClick={() => update("gift", gift.value)}
                >
                  <span className="gift-number">0{index + 1}</span>
                  <span className="gift-name">
                    {index === 0 ? "1 alita" : gift.label}
                  </span>
                  <span className="gift-check">
                    {form.gift === gift.value ? <Check size={15} /> : <ChevronRight size={15} />}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p className="error-message">{error}</p>}

          {!formComplete && (
            <p className="privacy-note">Completa tus datos, indica tu cumpleaños y elige tu regalo para continuar.</p>
          )}

          <button
            className="button button-gold submit-button"
            type="submit"
            disabled={loading || !formComplete}
          >
            {loading ? "Guardando registro..." : "Confirmar registro"}
            <Gift size={17} />
          </button>

          <p className="privacy-note">
            Tus datos se utilizarán únicamente para gestionar el registro y la entrega del premio del evento.
          </p>
        </form>
      </section>
    </main>
  );
}
