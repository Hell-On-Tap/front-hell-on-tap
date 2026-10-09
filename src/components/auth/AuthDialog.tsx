"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthResponse } from "@/lib/auth-api";
import { useSession } from "@/lib/session";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import styles from "./AuthDialog.module.css";

type Mode = "login" | "register";

/** Endereços que abrem o pop-up, de qualquer página: href="#entrar" ou href="#criar-conta". */
export const AUTH_HASH: Record<Mode, string> = { login: "#entrar", register: "#criar-conta" };

/**
 * Elementos marcados com data-stay-active (ex.: o player de música) continuam
 * clicáveis por cima do fundo escuro enquanto o pop-up está aberto.
 */
const STAY_ACTIVE = "[data-stay-active]";

function modeFromHash(): Mode | null {
  if (window.location.hash === AUTH_HASH.login) return "login";
  if (window.location.hash === AUTH_HASH.register) return "register";
  return null;
}

export default function AuthDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const restore = useRef<(() => void) | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [welcome, setWelcome] = useState<string | null>(null);
  const session = useSession();

  // Pop-up "não modal" + inert no resto da página: assim o player fica de fora do bloqueio.
  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;

    const blocked: HTMLElement[] = [];
    const raised: HTMLElement[] = [];
    for (const el of Array.from(document.body.children) as HTMLElement[]) {
      if (el === dialog || el === backdropRef.current) continue;
      if (el.matches(STAY_ACTIVE)) {
        el.style.zIndex = "320";
        raised.push(el);
      } else if (!el.inert) {
        el.inert = true;
        blocked.push(el);
      }
    }
    document.documentElement.style.overflow = "hidden";
    restore.current = () => {
      blocked.forEach((el) => (el.inert = false));
      raised.forEach((el) => (el.style.zIndex = ""));
      document.documentElement.style.overflow = "";
    };

    dialog.show();
    backdropRef.current?.setAttribute("data-open", "true");
    // foco no primeiro campo
    dialog.querySelector<HTMLElement>("input, button")?.focus();
  }, []);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    dialog.close();
    backdropRef.current?.setAttribute("data-open", "false");
    restore.current?.();
    restore.current = null;
    // tira o #entrar do endereço sem criar histórico
    if (modeFromHash()) history.replaceState(null, "", window.location.pathname + window.location.search);
    returnFocus.current?.focus?.();
    setWelcome(null);
  }, []);

  // o endereço manda: #entrar / #criar-conta abrem, qualquer outro fecha
  useEffect(() => {
    function sync() {
      const next = modeFromHash();
      if (next) {
        setMode(next);
        open();
      } else {
        close();
      }
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [open, close]);

  // Esc fecha (o <dialog> não modal não faz isso sozinho)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dialogRef.current?.open) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // garante que nada fique travado se o componente sair da tela aberto
  useEffect(() => () => restore.current?.(), []);

  function switchTo(next: Mode) {
    setMode(next);
    history.replaceState(null, "", AUTH_HASH[next]);
  }

  function onSuccess(res: AuthResponse, remember: boolean) {
    session.signIn(res, remember);
    setWelcome(res.user.nickname);
    setTimeout(close, 1100);
  }

  return (
    <>
      <div ref={backdropRef} className={styles.backdrop} data-open="false" onClick={close} aria-hidden="true" />
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="auth-title" aria-modal="true">
        <div className={styles.panel}>
          <button type="button" className={styles.close} onClick={close} aria-label="Fechar">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 2h3l3 3 3-3h3v3l-3 3 3 3v3h-3l-3-3-3 3H2v-3l3-3-3-3z" />
            </svg>
          </button>

          <header className={styles.head}>
            <Image src="/logo-pixel.png" alt="" width={1254} height={1254} className={styles.logo} />
            <h2 id="auth-title" className={styles.title}>
              {welcome ? "Bem-vindo" : mode === "login" ? "Entrar" : "Criar conta"}
            </h2>
            <p className={styles.subtitle}>
              {welcome
                ? `Você está dentro, ${welcome}.`
                : mode === "login"
                  ? "Entre para jogar, entrar no placar e guardar suas partidas."
                  : "Toda partida no Hell on Tap é jogada com conta."}
            </p>
          </header>

          {!welcome && (
            <>
              <div className={styles.tabs} role="tablist" aria-label="Escolha">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  className={styles.tab}
                  onClick={() => switchTo("login")}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  className={styles.tab}
                  onClick={() => switchTo("register")}
                >
                  Criar conta
                </button>
              </div>

              {/* key: troca de aba recomeça o formulário limpo */}
              {mode === "login" ? (
                <LoginForm key="login" onSuccess={onSuccess} />
              ) : (
                <RegisterForm key="register" onSuccess={onSuccess} />
              )}

              <p className={styles.switch}>
                {mode === "login" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button type="button" onClick={() => switchTo("register")}>
                      Criar conta
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button type="button" onClick={() => switchTo("login")}>
                      Entrar
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
