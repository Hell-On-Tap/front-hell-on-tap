"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClanCard from "@/components/clans/ClanCard";
import CreateClanDialog from "@/components/clans/CreateClanDialog";
import { myClans, myInvites, type MyClan } from "@/lib/clan-api";
import { PanelHead } from "./PanelHead";
import styles from "./Lobby.module.css";

/** Meus clãs, convites recebidos e atalhos para criar ou procurar. */
export default function ClansPanel({ token }: { token: string }) {
  const [clans, setClans] = useState<MyClan[] | null>(null);
  const [invites, setInvites] = useState(0);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([myClans(token), myInvites(token)])
      .then(([c, i]) => {
        if (cancelled) return;
        setClans(c);
        setInvites(i.length);
      })
      .catch(() => !cancelled && setError("Não foi possível carregar seus clãs."));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <PanelHead title="Clãs" lead="Seus times. Você pode estar em vários clãs ao mesmo tempo.">
        <div className={styles.headActions}>
          <Link href="/clans" className={styles.ghost}>
            Procurar clãs
          </Link>
          <button type="button" className={styles.primary} onClick={() => setCreating(true)}>
            Criar clã
          </button>
        </div>
      </PanelHead>

      {invites > 0 && (
        <Link href="/clans" className={styles.notice}>
          <strong>{invites}</strong> {invites === 1 ? "convite de clã esperando" : "convites de clã esperando"} resposta
          <span aria-hidden="true">→</span>
        </Link>
      )}
      {error && <p className={styles.msgError}>{error}</p>}

      {clans === null ? (
        !error && <p className={styles.empty}>Carregando…</p>
      ) : clans.length ? (
        <div className={styles.clanGrid}>
          {clans.map((c) => (
            <ClanCard key={c.id} clan={c} role={c.isOwner ? { name: `Dono · ${c.role.name}`, color: c.role.color } : c.role} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Você ainda não está em nenhum clã. Crie o seu ou procure um para entrar.</p>
      )}
      {creating && <CreateClanDialog onClose={() => setCreating(false)} />}
    </>
  );
}
