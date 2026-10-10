"use client";

import { useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import {
  acceptFriend,
  dismissFriendRequest,
  FRIENDS_CHANGED,
  friendsChanged,
  friendStatus,
  sendFriendRequest,
  type FriendStatus,
} from "@/lib/friends-api";
import styles from "./Profile.module.css";

/** Botão de amizade no perfil de outro jogador (só para quem está logado). */
export default function FriendButton({ token, profileId, nickname }: { token: string; profileId: string; nickname: string }) {
  const [state, setState] = useState<{ status: FriendStatus; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      friendStatus(token, profileId)
        .then((s) => !cancelled && setState(s))
        .catch(() => {});
    load();
    window.addEventListener(FRIENDS_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(FRIENDS_CHANGED, load);
    };
  }, [token, profileId]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      friendsChanged();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Não deu certo. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (!state || state.status === "self") return null;

  const label = {
    none: "Adicionar amigo",
    outgoing: "Cancelar pedido",
    incoming: "Aceitar pedido",
    friends: "Amigos",
    blocked: "Bloqueado",
  }[state.status];

  return (
    <>
      {state.status === "friends" || state.status === "blocked" ? (
        <span className={styles.friendTag} data-status={state.status}>
          {state.status === "friends" && (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 11.2 2.8 8 1.4 9.4 6 14l8.6-8.6L13.2 4z" />
            </svg>
          )}
          {label}
        </span>
      ) : (
        <button
          type="button"
          className={state.status === "outgoing" ? styles.secondary : styles.primary}
          disabled={busy}
          title={state.status === "outgoing" ? `Pedido enviado para ${nickname}` : undefined}
          onClick={() =>
            run(() =>
              state.status === "none"
                ? sendFriendRequest(token, nickname)
                : state.status === "incoming"
                  ? acceptFriend(token, state.requestId!)
                  : dismissFriendRequest(token, state.requestId!),
            )
          }
        >
          {label}
        </button>
      )}
      {error && (
        <p className={styles.friendError} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
