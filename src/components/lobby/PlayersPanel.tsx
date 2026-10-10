"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import { acceptFriend, searchPlayers, sendFriendRequest, type PlayerListItem } from "@/lib/friends-api";
import Avatar from "./Avatar";
import { PanelHead } from "./PanelHead";
import type { useFriends } from "./use-friends";
import styles from "./Lobby.module.css";

const memberSince = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });

type Props = { token: string; meId: string; friends: ReturnType<typeof useFriends> };

/** Todos os jogadores, com busca por apelido ou nome e atalho para adicionar. */
export default function PlayersPanel({ token, meId, friends }: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // espera a pessoa parar de digitar antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      searchPlayers(query)
        .then((res) => {
          if (cancelled) return;
          setPlayers(res.players);
          setHasMore(res.hasMore);
          setError("");
        })
        .catch(() => !cancelled && setError("Não foi possível carregar os jogadores."))
        .finally(() => !cancelled && setLoading(false));
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function more() {
    setLoading(true);
    try {
      const res = await searchPlayers(query, players.length);
      setPlayers((p) => [...p, ...res.players.filter((n) => !p.some((o) => o.id === n.id))]);
      setHasMore(res.hasMore);
    } catch {
      setError("Não foi possível carregar mais jogadores.");
    } finally {
      setLoading(false);
    }
  }

  // relação com cada jogador, a partir da lista de amigos
  const { friends: fr, incoming, outgoing, blocked } = friends.data;
  function relation(id: string) {
    if (id === meId) return "self";
    if (fr.some((f) => f.id === id)) return "friends";
    if (outgoing.some((r) => r.player.id === id)) return "outgoing";
    const inc = incoming.find((r) => r.player.id === id);
    if (inc) return inc.id;
    if (blocked.some((b) => b.id === id)) return "blocked";
    return "none";
  }

  async function add(p: PlayerListItem, incomingId?: string) {
    setBusy(p.id);
    try {
      if (incomingId) await acceptFriend(token, incomingId);
      else await sendFriendRequest(token, p.nickname);
      friends.changed();
    } catch (err) {
      setNotes((n) => ({ ...n, [p.id]: err instanceof AuthError ? err.message : "Não deu certo." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PanelHead title="Jogadores" lead="Encontre jogadores pelo apelido ou nome e mande um pedido de amizade." />
      <div className={styles.searchBox}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6.5 1a5.5 5.5 0 0 1 4.4 8.8l4 4-1.4 1.4-4-4A5.5 5.5 0 1 1 6.5 1zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
        </svg>
        <input
          type="search"
          className={styles.input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogador"
          aria-label="Buscar jogador por apelido ou nome"
          maxLength={32}
        />
      </div>
      {error && <p className={styles.msgError}>{error}</p>}

      {players.length ? (
        <ul className={styles.playerGrid} aria-busy={loading}>
          {players.map((p) => {
            const rel = relation(p.id);
            return (
              <li key={p.id} className={styles.playerCard}>
                <Link href={`/perfil/${encodeURIComponent(p.nickname)}`} className={styles.playerLink}>
                  <Avatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="lg" />
                  <span className={styles.rowName}>{p.displayName ?? p.nickname}</span>
                  <span className={styles.rowHandle}>@{p.nickname}</span>
                  <span className={styles.rowMeta}>desde {memberSince.format(new Date(p.memberSince))}</span>
                </Link>
                <div className={styles.playerAction}>
                  {rel === "self" ? (
                    <span className={styles.tag}>Você</span>
                  ) : rel === "friends" ? (
                    <span className={styles.tagOk}>Amigos</span>
                  ) : rel === "outgoing" ? (
                    <span className={styles.tag}>Pedido enviado</span>
                  ) : rel === "blocked" ? (
                    <span className={styles.tag}>Bloqueado</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.small}
                      disabled={busy === p.id}
                      onClick={() => add(p, rel === "none" ? undefined : rel)}
                    >
                      {rel === "none" ? "Adicionar" : "Aceitar pedido"}
                    </button>
                  )}
                  {notes[p.id] && <span className={styles.msgError}>{notes[p.id]}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !loading && <p className={styles.empty}>{query ? `Ninguém encontrado para “${query}”.` : "Nenhum jogador ainda."}</p>
      )}
      {loading && !players.length && <p className={styles.empty}>Carregando…</p>}
      {hasMore && (
        <button type="button" className={styles.moreBtn} onClick={more} disabled={loading}>
          {loading ? "Carregando…" : "Mostrar mais"}
        </button>
      )}
    </>
  );
}
