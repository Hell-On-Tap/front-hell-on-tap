"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/profile-api";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import EditProfileDialog from "./EditProfileDialog";
import FriendButton from "./FriendButton";
import { setOrganizing, useOrganizing } from "@/lib/profile-organize";
import styles from "./Profile.module.css";

/** Compartilhar (todos) e editar (só o dono do perfil). */
export default function ProfileActions({ profile }: { profile: Profile }) {
  const session = useSession();
  // só usa a sessão depois de montar (ver useHydrated)
  const user = useHydrated() ? session.user : null;
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(false);
  const organizing = useOrganizing();
  const isOwner = user?.id === profile.id;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function share() {
    const url = window.location.href.split("#")[0];
    const name = profile.displayName ?? profile.nickname;
    // celular: menu nativo de compartilhar; computador: copia o link
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} no Hell on Tap`, url });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link do perfil copiado!");
    } catch {
      setToast(url);
    }
  }

  return (
    <div className={styles.actions}>
      {isOwner && (
        <button type="button" className={styles.primary} onClick={() => setEditing(true)}>
          Editar perfil
        </button>
      )}
      {isOwner && (
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            setOrganizing(true);
            // leva até as seções, que é onde se arrasta
            requestAnimationFrame(() => {
              const el = document.getElementById("profile-sections");
              if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
            });
          }}
          disabled={organizing}
          aria-pressed={organizing}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1 2h9v3H1zM1 7h14v3H1zM1 12h11v3H1zM12 1l3 3h-2v2h-2V4H9z" />
          </svg>
          Organizar
        </button>
      )}
      {user && !isOwner && session.token && (
        <FriendButton token={session.token} profileId={profile.id} nickname={profile.nickname} />
      )}
      <button type="button" className={styles.secondary} onClick={share}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M11 1h4v4h-2V4.4L8.7 8.7 7.3 7.3 11.6 3H11zM2 3h5v2H4v7h7V9h2v5H2z" />
        </svg>
        Compartilhar
      </button>
      <p className={styles.toast} data-show={!!toast} role="status" aria-live="polite">
        {toast}
      </p>
      {isOwner && editing && <EditProfileDialog profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
