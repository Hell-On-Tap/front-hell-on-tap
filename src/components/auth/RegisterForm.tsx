"use client";

import { useState } from "react";
import { AuthError, register, type AuthResponse } from "@/lib/auth-api";
import { Field, PasswordField } from "./fields";
import styles from "./AuthDialog.module.css";

type Errors = Partial<Record<"nickname" | "email" | "password" | "confirm", string>>;

const NICK = /^[A-Za-z0-9_-]{3,16}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterForm({ onSuccess }: { onSuccess: (res: AuthResponse, remember: boolean) => void }) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nickname = String(data.get("nickname") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const next: Errors = {};
    if (!NICK.test(nickname)) next.nickname = "Use de 3 a 16 caracteres: letras, números, _ ou -.";
    if (!EMAIL.test(email)) next.email = "Informe um e-mail válido.";
    if (password.length < 8) next.password = "A senha precisa ter pelo menos 8 caracteres.";
    if (confirm !== password) next.confirm = "As senhas não são iguais.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await register({ nickname, email, password });
      // conta nova já entra conectada neste dispositivo
      onSuccess(res, true);
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
        label="Apelido"
        name="nickname"
        autoComplete="nickname"
        autoFocus
        maxLength={16}
        hint="É o nome que aparece no placar e no killfeed."
        error={errors.nickname}
        onChange={clear("nickname")}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email}
        onChange={clear("email")}
      />
      <PasswordField
        label="Senha"
        name="password"
        autoComplete="new-password"
        hint="Pelo menos 8 caracteres."
        error={errors.password}
        onChange={clear("password")}
      />
      <PasswordField
        label="Confirmar senha"
        name="confirm"
        autoComplete="new-password"
        error={errors.confirm}
        onChange={clear("confirm")}
      />

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
