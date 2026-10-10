"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dismissGameInvite, myGameInvites, ROOMS_CHANGED, type GameInvite } from "@/lib/game-api";
import { playPath } from "@/lib/home-data";
import styles from "./Rooms.module.css";

const SEEN_KEY = "hot:seen-game-invites";
const REFRESH = 15_000;

function seen(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function markSeen(id: string) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen(), id].slice(-50)));
  } catch {
    /* sem armazenamento: o aviso pode voltar ao recarregar */
  }
}

/** "Fulano te chamou para jogar": aparece em qualquer página com o menu do site. */
export default function GameInviteToast({ token }: { token: string }) {
  const [invite, setInvite] = useState<GameInvite | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      myGameInvites(token)
        .then(({ invites }) => {
          if (cancelled) return;
          const hidden = seen();
          setInvite(invites.find((i) => !hidden.includes(i.id)) ?? null);
        })
        .catch(() => {});
    };
    Promise.resolve().then(load);
    const timer = setInterval(load, REFRESH);
    window.addEventListener("focus", load);
    window.addEventListener(ROOMS_CHANGED, load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener(ROOMS_CHANGED, load);
    };
  }, [token]);

  if (!invite) return null;

  const close = (dismiss: boolean) => {
    markSeen(invite.id);
    setInvite(null);
    if (dismiss) void dismissGameInvite(token, invite.id).catch(() => {});
  };

  return (
    <div className={styles.toast} role="alert">
      <span className={styles.toastLabel}>CONVITE PARA JOGAR</span>
      <p>
        <strong>{invite.from.name}</strong> te chamou para a sala <strong>{invite.roomName}</strong>.
        <small>
          Mata-mata online · {invite.players}/{invite.maxPlayers} jogadores{invite.started ? " · partida rolando" : ""}
        </small>
      </p>
      <div className={styles.inviteActions}>
        <Link href={playPath("online", invite.room)} className={styles.small} onClick={() => close(false)}>
          Entrar
        </Link>
        <button type="button" className={styles.smallGhost} onClick={() => close(true)}>
          Dispensar
        </button>
      </div>
    </div>
  );
}
