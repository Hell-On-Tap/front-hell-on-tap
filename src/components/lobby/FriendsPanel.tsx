"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthError } from "@/lib/auth-api";
import {
  acceptFriend,
  blockPlayer,
  dismissFriendRequest,
  lastSeenLabel,
  removeFriend,
  sendFriendRequest,
  unblockPlayer,
  type Friend,
} from "@/lib/friends-api";
import Avatar from "./Avatar";
import { PanelHead } from "./PanelHead";
import type { useFriends } from "./use-friends";
import styles from "./Lobby.module.css";

type Props = { token: string; friends: ReturnType<typeof useFriends> };

const NICK = /^[A-Za-z0-9_-]{3,16}$/;

/** Adicionar, responder pedidos, ver quem está online, remover e bloquear. */
export default function FriendsPanel({ token, friends }: Props) {
  const { data, loaded, error } = friends;
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "online">("all");

  /** Roda uma ação, mostra o resultado e atualiza a lista. */
  async function act<T>(key: string, fn: () => Promise<T>, ok?: string): Promise<T | undefined> {
    setBusy(key);
    setMessage(null);
    try {
      const result = await fn();
      if (ok) setMessage({ kind: "ok", text: ok });
      friends.changed();
      return result;
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof AuthError ? err.message : "Algo deu errado. Tente de novo." });
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const nick = nickname.trim();
    if (!NICK.test(nick)) {
      setMessage({ kind: "error", text: "Digite um apelido válido: 3 a 16 letras, números, _ ou -." });
      return;
    }
    const result = await act("add", () => sendFriendRequest(token, nick));
    if (result) {
      setNickname("");
      setMessage({
        kind: "ok",
        text:
          result.status === "friends"
            ? `${nick} também tinha te chamado: agora vocês são amigos!`
            : `Pedido enviado para ${nick}.`,
      });
    }
  }

  const shown = filter === "online" ? data.friends.filter((f) => f.online) : data.friends;
  const onlineCount = data.friends.filter((f) => f.online).length;

  return (
    <>
      <PanelHead title="Amigos" lead="Mande um pedido pelo apelido. A amizade vale quando a outra pessoa aceitar." />

      <form className={styles.addForm} onSubmit={add} noValidate>
        <label htmlFor="friend-nick" className={styles.srOnly}>
          Apelido do jogador
        </label>
        <span className={styles.addField}>
          <span className={styles.addPrefix} aria-hidden="true">
            @
          </span>
          <input
            id="friend-nick"
            className={styles.input}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="apelido do jogador"
            maxLength={16}
            autoComplete="off"
            spellCheck={false}
          />
        </span>
        <button type="submit" className={styles.primary} disabled={busy === "add"}>
          {busy === "add" ? "Enviando…" : "Adicionar amigo"}
        </button>
      </form>
      <p className={message?.kind === "error" ? styles.msgError : styles.msgOk} role="status" aria-live="polite">
        {message?.text}
      </p>
      {error && <p className={styles.msgError}>{error}</p>}

      {data.incoming.length > 0 && (
        <section className={styles.block} aria-labelledby="incoming-title">
          <h3 id="incoming-title" className={styles.blockTitle}>
            Pedidos recebidos <span className={styles.count}>{data.incoming.length}</span>
          </h3>
          <ul className={styles.rows}>
            {data.incoming.map((r) => (
              <li key={r.id} className={`${styles.row} ${styles.rowAlert}`}>
                <PlayerLink player={r.player} />
                <span className={styles.rowMeta}>quer ser seu amigo</span>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.small}
                    disabled={!!busy}
                    onClick={() => act(r.id, () => acceptFriend(token, r.id), `Agora você e ${r.player.nickname} são amigos.`)}
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    className={styles.smallGhost}
                    disabled={!!busy}
                    onClick={() => act(r.id, () => dismissFriendRequest(token, r.id))}
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.block} aria-labelledby="friends-title">
        <div className={styles.blockHead}>
          <h3 id="friends-title" className={styles.blockTitle}>
            Amigos <span className={styles.count}>{data.friends.length}</span>
          </h3>
          {data.friends.length > 0 && (
            <div className={styles.segmented} role="group" aria-label="Filtrar amigos">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                Todos
              </button>
              <button type="button" aria-pressed={filter === "online"} onClick={() => setFilter("online")}>
                Online ({onlineCount})
              </button>
            </div>
          )}
        </div>
        {!loaded ? (
          <p className={styles.empty}>Carregando…</p>
        ) : shown.length ? (
          <ul className={styles.rows}>
            {shown.map((f) => (
              <FriendRow key={f.id} friend={f} busy={!!busy} act={act} token={token} />
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            {data.friends.length ? "Nenhum amigo online agora." : "Você ainda não tem amigos aqui. Que tal mandar um pedido?"}
          </p>
        )}
      </section>

      {data.outgoing.length > 0 && (
        <section className={styles.block} aria-labelledby="outgoing-title">
          <h3 id="outgoing-title" className={styles.blockTitle}>
            Pedidos enviados <span className={styles.count}>{data.outgoing.length}</span>
          </h3>
          <ul className={styles.rows}>
            {data.outgoing.map((r) => (
              <li key={r.id} className={styles.row}>
                <PlayerLink player={r.player} />
                <span className={styles.rowMeta}>aguardando resposta</span>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.smallGhost}
                    disabled={!!busy}
                    onClick={() => act(r.id, () => dismissFriendRequest(token, r.id))}
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.blocked.length > 0 && (
        <details className={styles.block}>
          <summary className={styles.blockTitle}>
            Bloqueados <span className={styles.count}>{data.blocked.length}</span>
          </summary>
          <ul className={styles.rows}>
            {data.blocked.map((p) => (
              <li key={p.id} className={styles.row}>
                <PlayerLink player={p} />
                <span className={styles.rowMeta}>não pode te mandar pedidos</span>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.smallGhost}
                    disabled={!!busy}
                    onClick={() => act(p.id, () => unblockPlayer(token, p.id), `${p.nickname} foi desbloqueado.`)}
                  >
                    Desbloquear
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function PlayerLink({
  player,
  online,
}: {
  player: { nickname: string; displayName: string | null; avatarUrl: string | null };
  online?: boolean;
}) {
  return (
    <Link href={`/perfil/${encodeURIComponent(player.nickname)}`} className={styles.rowPlayer}>
      <Avatar nickname={player.nickname} avatarUrl={player.avatarUrl} online={online} />
      <span className={styles.rowNames}>
        <span className={styles.rowName}>{player.displayName ?? player.nickname}</span>
        <span className={styles.rowHandle}>@{player.nickname}</span>
      </span>
    </Link>
  );
}

/** Amigo: online/visto por último; remover e bloquear pedem confirmação. */
function FriendRow({
  friend,
  busy,
  act,
  token,
}: {
  friend: Friend;
  busy: boolean;
  act: (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<unknown>;
  token: string;
}) {
  const [confirm, setConfirm] = useState<"remove" | "block" | null>(null);
  return (
    <li className={styles.row} data-online={friend.online}>
      <PlayerLink player={friend} online={friend.online} />
      <span className={friend.online ? styles.rowOnline : styles.rowMeta}>
        {friend.online ? "Online" : lastSeenLabel(friend.lastSeenAt)}
      </span>
      <div className={styles.rowActions}>
        {confirm ? (
          <>
            <button
              type="button"
              className={styles.smallDanger}
              disabled={busy}
              onClick={() =>
                confirm === "remove"
                  ? act(friend.id, () => removeFriend(token, friend.id), `${friend.nickname} saiu da sua lista.`)
                  : act(friend.id, () => blockPlayer(token, friend.nickname), `${friend.nickname} foi bloqueado.`)
              }
            >
              {confirm === "remove" ? "Confirmar remoção" : "Confirmar bloqueio"}
            </button>
            <button type="button" className={styles.smallGhost} onClick={() => setConfirm(null)}>
              Voltar
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.smallGhost} onClick={() => setConfirm("remove")}>
              Remover
            </button>
            <button type="button" className={styles.smallGhost} onClick={() => setConfirm("block")}>
              Bloquear
            </button>
          </>
        )}
      </div>
    </li>
  );
}
