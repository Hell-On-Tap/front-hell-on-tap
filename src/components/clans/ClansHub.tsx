"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import {
  acceptInvite,
  declineInvite,
  myClans,
  myInvites,
  searchClans,
  type ClanSummary,
  type MyClan,
  type ReceivedInvite,
} from "@/lib/clan-api";
import { notifyInvitesChanged } from "@/lib/clan-rules";
import { imageUrl } from "@/lib/profile-api";
import { useSession } from "@/lib/session";
import ClanCard from "./ClanCard";
import CreateClanDialog from "./CreateClanDialog";
import styles from "./Clans.module.css";

export default function ClansHub() {
  const router = useRouter();
  const { status, token } = useSession();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ClanSummary[] | null>(null);
  const [mine, setMine] = useState<MyClan[] | null>(null);
  const [invites, setInvites] = useState<ReceivedInvite[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // busca com pequena espera enquanto digita
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchClans(search)
        .then((r) => !cancelled && setResults(r))
        .catch((err) => !cancelled && setError(err instanceof AuthError ? err.message : "Não foi possível buscar clãs."));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  const loadMine = useCallback(() => {
    if (!token) return;
    myClans(token).then(setMine).catch(() => setMine([]));
    myInvites(token).then(setInvites).catch(() => setInvites([]));
  }, [token]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  async function answer(invite: ReceivedInvite, accept: boolean) {
    if (!token) return;
    try {
      if (accept) {
        await acceptInvite(token, invite.id);
        notifyInvitesChanged();
        router.push(`/clan/${encodeURIComponent(invite.clan.tag)}`);
        return;
      }
      await declineInvite(token, invite.id);
      notifyInvitesChanged();
      loadMine();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Não foi possível responder ao convite.");
    }
  }

  return (
    <main className={styles.hub}>
      <header className={styles.hubHead}>
        <div>
          <h1 className={styles.hubTitle}>Clãs</h1>
          <p className={styles.hubLead}>Monte um time, convide os amigos e organize cargos e permissões.</p>
        </div>
        {status === "authed" ? (
          <button type="button" className={styles.primary} onClick={() => setCreating(true)}>
            Criar clã
          </button>
        ) : (
          status === "guest" && (
            <a href="#entrar" className={styles.primary}>
              Entrar para criar um clã
            </a>
          )
        )}
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {invites.length > 0 && (
        <section className={styles.block} id="convites" aria-labelledby="invites-title">
          <h2 id="invites-title">Convites recebidos</h2>
          <ul className={styles.invites}>
            {invites.map((inv) => (
              <li key={inv.id} className={styles.invite}>
                <span className={styles.inviteLogo} data-image={!!inv.clan.logoUrl} data-frame={inv.clan.logoFrame !== false}>
                  {imageUrl(inv.clan.logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(inv.clan.logoUrl)!} alt="" />
                  ) : (
                    <span aria-hidden="true">{inv.clan.tag.slice(0, 3)}</span>
                  )}
                </span>
                <span className={styles.inviteText}>
                  <strong>
                    [{inv.clan.tag}] {inv.clan.name}
                  </strong>
                  <small>{inv.invitedBy ? `Convite de ${inv.invitedBy}` : "Você foi convidado"}</small>
                </span>
                <button type="button" className={styles.primarySmall} onClick={() => answer(inv, true)}>
                  Aceitar
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => answer(inv, false)}>
                  Recusar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {status === "authed" && (
        <section className={styles.block} aria-labelledby="mine-title">
          <h2 id="mine-title">Meus clãs</h2>
          {mine === null ? (
            <p className={styles.muted}>Carregando…</p>
          ) : mine.length ? (
            <div className={styles.grid}>
              {mine.map((c) => (
                <ClanCard key={c.id} clan={c} role={c.role} />
              ))}
            </div>
          ) : (
            <p className={styles.muted}>Você ainda não está em nenhum clã. Crie um ou entre em um da lista abaixo.</p>
          )}
        </section>
      )}

      <section className={styles.block} aria-labelledby="find-title">
        <h2 id="find-title">Encontrar clãs</h2>
        <input
          type="search"
          className={styles.search}
          placeholder="Buscar por nome ou tag"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar clãs por nome ou tag"
        />
        {results === null ? (
          <p className={styles.muted}>Carregando…</p>
        ) : results.length ? (
          <div className={styles.grid}>
            {results.map((c) => (
              <ClanCard key={c.id} clan={c} />
            ))}
          </div>
        ) : (
          <p className={styles.muted}>{search ? "Nenhum clã encontrado." : "Ainda não existe nenhum clã. Crie o primeiro!"}</p>
        )}
      </section>

      {creating && <CreateClanDialog onClose={() => setCreating(false)} />}
    </main>
  );
}
