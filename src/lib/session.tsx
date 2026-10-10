"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthError, me, type AuthResponse } from "./auth-api";
import { heartbeat } from "./friends-api";

type User = AuthResponse["user"];
type Status = "loading" | "guest" | "authed";

type Session = {
  status: Status;
  user: User | null;
  token: string | null;
  /** guarda a sessão depois de login/cadastro; remember=false some ao fechar o navegador */
  signIn: (response: AuthResponse, remember: boolean) => void;
  signOut: () => void;
  /** atualiza os dados mostrados (ex.: depois de editar o perfil) */
  updateUser: (changes: Partial<User>) => void;
};

const KEY = "hot:token";
const SessionContext = createContext<Session | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null, remember = true) {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(KEY, token);
  } catch {
    /* armazenamento bloqueado: a sessão vale só enquanto a página estiver aberta */
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ao abrir o site: confere com a API se o token salvo ainda vale
  useEffect(() => {
    const saved = readToken();
    let cancelled = false;
    const done = (u: User | null, t: string | null) => {
      if (cancelled) return;
      setUser(u);
      setToken(t);
      setStatus(u ? "authed" : "guest");
    };
    if (!saved) {
      Promise.resolve().then(() => done(null, null));
    } else {
      me(saved)
        .then((u) => done(u, saved))
        .catch((err) => {
          // 401 = token vencido ou inválido; outros erros (API fora do ar) mantêm o token
          if (err instanceof AuthError && err.status === 401) writeToken(null);
          done(null, null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // "estou online": avisa a API a cada minuto enquanto a aba está aberta e visível
  useEffect(() => {
    if (!token) return;
    const beat = () => document.visibilityState === "visible" && heartbeat(token).catch(() => {});
    beat();
    const timer = setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [token]);

  const signIn = useCallback((response: AuthResponse, remember: boolean) => {
    writeToken(response.accessToken, remember);
    setToken(response.accessToken);
    setUser(response.user);
    setStatus("authed");
  }, []);

  const signOut = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
    setStatus("guest");
  }, []);

  const updateUser = useCallback((changes: Partial<User>) => {
    setUser((u) => (u ? { ...u, ...changes } : u));
  }, []);

  const value = useMemo(
    () => ({ status, user, token, signIn, signOut, updateUser }),
    [status, user, token, signIn, signOut, updateUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return ctx;
}
