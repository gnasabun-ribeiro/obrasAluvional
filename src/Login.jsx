import { useState } from "react";
import { css } from "./utils";
import { supabase } from "./supabaseClient";
import logoRibeiro from "./assets/logo-ribeiro.png";

export default function Login({ accessDenied }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Email o contraseña incorrectos.");
  };

  const mensaje = error || (accessDenied ? "Tu usuario no tiene acceso al sistema Aluvional." : "");

  return (
    <div style={css("min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#ECECEC;padding:16px")}>
      <form onSubmit={submit} style={css("width:100%;max-width:360px;background:#FFFFFF;border-radius:16px;padding:32px 28px;display:flex;flex-direction:column;gap:16px;box-shadow:0 8px 24px rgba(0,0,0,.12)")}>
        <img src={logoRibeiro} alt="Ribeiro" style={css("height:34px;width:auto;display:block;margin:0 auto 8px")} />
        <div style={css("font-size:17px;font-weight:600;color:#2A2A2A;text-align:center")}>Ingresar</div>

        <label style={css("display:flex;flex-direction:column;gap:6px;font-size:13px;color:#5C5C5C")}>
          Email
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={css("min-height:44px;border:1px solid #D5D5D5;border-radius:8px;padding:0 12px;font-size:15px")}
          />
        </label>

        <label style={css("display:flex;flex-direction:column;gap:6px;font-size:13px;color:#5C5C5C")}>
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={css("min-height:44px;border:1px solid #D5D5D5;border-radius:8px;padding:0 12px;font-size:15px")}
          />
        </label>

        {mensaje && (
          <div style={css("font-size:13px;color:#C0392B;text-align:center")}>{mensaje}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="hov-dark"
          style={css("min-height:48px;border:none;border-radius:8px;color:#FFE500;font-size:16px;font-weight:600;cursor:pointer;margin-top:4px")}
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
