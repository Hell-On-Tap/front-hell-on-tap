"use client";

import { useState } from "react";
import { AuthError, login, type AuthResponse } from "@/lib/auth-api";
import { Field, PasswordField } from "./fields";
import styles from "./AuthDialog.module.css";

type Errors = Partial<Record<"login" | "password", string>>;

export default function LoginForm({ onSuccess }: { onSuccess: (res: AuthResponse, remember: boolean) => void }) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values = {
      login: String(data.get("login") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      remember: data.get("remember") === "on",
    };

    const next: Errors = {};
    if (!values.login) next.login = "Informe seu apelido ou e-mail.";
    if (!values.password) next.password = "Informe sua senha.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await login(values);
      onSuccess(res, values.remember);
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  const clear = (field: keyof Errors) => () => errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label="Apelido ou e-mail"
        name="login"
        autoComplete="username"
        autoFocus
        error={errors.login}
        onChange={clear("login")}
      />
      <PasswordField
        label="Senha"
        name="password"
        autoComplete="current-password"
        error={errors.password}
        onChange={clear("password")}
      />

      <label className={styles.check}>
        <input type="checkbox" name="remember" defaultChecked />
        <span>Manter conectado neste dispositivo</span>
      </label>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
