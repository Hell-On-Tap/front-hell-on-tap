"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import { acceptInvite, clanViewer, declineInvite, joinClan, leaveClan, type Clan, type ClanViewer } from "@/lib/clan-api";
import { canManageAnything, notifyInvitesChanged } from "@/lib/clan-rules";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import profile from "../profile/Profile.module.css";
import styles from "./Clans.module.css";

/** Botões da página do clã: entrar/pedir/aceitar, sair, gerenciar e compartilhar. */
export default function ClanActions({ clan }: { clan: Clan }) {
  const router = useRouter();
  const session = useSession();
  // só usa a sessão depois de montar (ver useHydrated)
  const hydrated = useHydrated();
  const status = hydrated ? session.status : "loading";
  const token = hydrated ? session.token : null;
  const [viewer, setViewer] = useState<ClanViewer | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    clanViewer(token, clan.tag)
      .then(setViewer)
      .catch(() => setViewer(null));
  }, [token, clan.tag]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function act(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      setToast(done);
      notifyInvitesChanged();
      load();
      router.refresh();
    } catch (err) {
      setToast(err instanceof AuthError ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = window.location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: `[${clan.tag}] ${clan.name} no Hell on Tap`, url });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link do clã copiado!");
    } catch {
      setToast(url);
    }
  }

  let main: React.ReactNode = null;
  if (status === "guest") {
    main = (
      <a href="#entrar" className={profile.primary}>
        Entrar para participar
      </a>
    );
  } else if (viewer && token) {
    if (viewer.isMember) {
      main = canManageAnything(viewer) ? (
        <Link href={`/clan/${encodeURIComponent(clan.tag)}/gerenciar`} className={profile.primary}>
          Gerenciar clã
        </Link>
      ) : null;
    } else if (viewer.pending?.kind === "invite") {
      const id = viewer.pending.id;
      main = (
        <>
          <button type="button" className={profile.primary} disabled={busy} onClick={() => act(() => acceptInvite(token, id), "Bem-vindo ao clã!")}>
            Aceitar convite
          </button>
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => act(() => declineInvite(token, id), "Convite recusado.")}>
            Recusar
          </button>
        </>
      );
    } else if (viewer.pending?.kind === "request") {
      const id = viewer.pending.id;
      main = (
        <>
          <span className={styles.pendingBadge}>Pedido enviado</span>
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => act(() => declineInvite(token, id), "Pedido cancelado.")}>
            Cancelar pedido
          </button>
        </>
      );
    } else if (clan.joinPolicy === "open") {
      main = (
        <button type="button" className={profile.primary} disabled={busy} onClick={() => act(() => joinClan(token, clan.tag), "Bem-vindo ao clã!")}>
          Entrar no clã
        </button>
      );
    } else if (clan.joinPolicy === "request") {
      main = (
        <button type="button" className={profile.primary} disabled={busy} onClick={() => act(() => joinClan(token, clan.tag), "Pedido enviado ao clã.")}>
          Pedir para entrar
        </button>
      );
    } else {
      main = <span className={styles.pendingBadge}>Só por convite</span>;
    }
  }

  return (
    <div className={profile.actions}>
      {main}
      <button type="button" className={profile.secondary} onClick={share}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M11 1h4v4h-2V4.4L8.7 8.7 7.3 7.3 11.6 3H11zM2 3h5v2H4v7h7V9h2v5H2z" />
        </svg>
        Compartilhar
      </button>
      {viewer?.isMember && !viewer.isOwner && token && (
        <button
          type="button"
          className={styles.linkBtn}
          disabled={busy}
          onClick={() => window.confirm(`Sair do clã ${clan.name}?`) && act(() => leaveClan(token, clan.tag), "Você saiu do clã.")}
        >
          Sair do clã
        </button>
      )}
      <p className={profile.toast} data-show={!!toast} role="status" aria-live="polite">
        {toast}
      </p>
    </div>
  );
}
