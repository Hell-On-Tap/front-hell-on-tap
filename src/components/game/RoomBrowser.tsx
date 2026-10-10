"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import {
  dismissGameInvite,
  listRooms,
  myGameInvites,
  ROOMS_CHANGED,
  type GameInvite,
  type GameRoom,
} from "@/lib/game-api";
import { playPath } from "@/lib/home-data";
import { CreateRoomButton, PrivacyBadge } from "./RoomSettings";
import styles from "./Rooms.module.css";

/** A lista se atualiza sozinha enquanto a aba está aberta. */
const REFRESH = 5_000;

/** Salas online: convites recebidos, criar, entrar com código e a lista de salas abertas. */
export default function RoomBrowser({ token, nickname }: { token: string; nickname: string }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<GameRoom[] | null>(null);
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "open">("all");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const load = useCallback(() => {
    listRooms(token)
      .then((r) => {
        setRooms(r.rooms);
        setError("");
      })
      .catch((err) => setError(err instanceof AuthError ? err.message : "Não foi possível carregar as salas."));
    myGameInvites(token)
      .then((r) => setInvites(r.invites))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(load);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH);
    window.addEventListener("focus", load);
    window.addEventListener(ROOMS_CHANGED, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener(ROOMS_CHANGED, load);
    };
  }, [load]);

  function joinCode(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(value)) {
      setCodeError("O código tem 6 letras ou números.");
      return;
    }
    router.push(playPath("online", value));
  }

  async function dismiss(id: string) {
    setInvites((list) => list.filter((i) => i.id !== id));
    await dismissGameInvite(token, id).catch(() => {});
    window.dispatchEvent(new Event(ROOMS_CHANGED));
  }

  const shown = (rooms ?? []).filter((r) => filter === "all" || (r.players < r.maxPlayers && !r.started));

  return (
    <section className={styles.browser} aria-labelledby="rooms-title">
      <div className={styles.browserHead}>
        <h4 id="rooms-title">SALAS ONLINE</h4>
        <span className={styles.live}>ao vivo</span>
      </div>

      {invites.length > 0 && (
        <ul className={styles.invites} aria-label="Convites para jogar">
          {invites.map((i) => (
            <li key={i.id} className={styles.invite}>
              <p>
                <strong>{i.from.name}</strong> te chamou para <strong>{i.roomName}</strong>
                {" · "}
                {i.players}/{i.maxPlayers}
                {i.started ? " · em jogo" : ""}
              </p>
              <div className={styles.inviteActions}>
                <Link href={playPath("online", i.room)} className={styles.small}>
                  Entrar
                </Link>
                <button type="button" className={styles.smallGhost} onClick={() => dismiss(i.id)}>
                  Dispensar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.toolbar}>
        <CreateRoomButton token={token} nickname={nickname} />
        <form className={styles.codeForm} onSubmit={joinCode} noValidate>
          <label htmlFor="room-code" className={styles.srOnly}>
            Código da sala
          </label>
          <input
            id="room-code"
            className={styles.input}
            placeholder="CÓDIGO"
            value={code}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setCodeError("");
            }}
          />
          <button type="submit" className={styles.ghost}>
            Entrar
          </button>
        </form>
      </div>
      {codeError && (
        <p className={styles.msgError} role="alert">
          {codeError}
        </p>
      )}

      <div className={styles.filters} role="group" aria-label="Filtrar salas">
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          Todas ({rooms?.length ?? 0})
        </button>
        <button type="button" aria-pressed={filter === "open"} onClick={() => setFilter("open")}>
          Com vaga, na espera
        </button>
      </div>

      {error && <p className={styles.msgError}>{error}</p>}

      {rooms === null && !error ? (
        <p className={styles.empty}>Procurando salas…</p>
      ) : shown.length ? (
        <ul className={styles.rooms}>
          {shown.map((r) => {
            const full = r.players >= r.maxPlayers;
            return (
              <li key={r.code} className={styles.room} data-mine={r.mine} data-full={full}>
                <div className={styles.roomMain}>
                  <div className={styles.roomTitle}>
                    <span className={styles.roomName}>{r.name}</span>
                    <PrivacyBadge privacy={r.privacy} />
                    {r.mine && <span className={styles.mineTag}>SUA SALA</span>}
                  </div>
                  <span className={styles.roomMeta} title={r.names.join(", ")}>
                    Dono: {r.owner}
                    {r.names.length ? ` · ${r.names.join(", ")}` : " · ninguém entrou ainda"}
                  </span>
                </div>
                <div className={styles.slots} aria-label={`${r.players} de ${r.maxPlayers} jogadores`}>
                  <span>
                    {r.players}/{r.maxPlayers}
                  </span>
                  <span className={styles.slotBar} aria-hidden="true">
                    {Array.from({ length: r.maxPlayers }, (_, i) => (
                      <i key={i} data-on={i < r.players} />
                    ))}
                  </span>
                  <span className={styles.state} data-started={r.started}>
                    {r.started ? "EM JOGO" : "NA ESPERA"}
                  </span>
                </div>
                {full ? (
                  <button type="button" className={styles.smallGhost} disabled>
                    Cheia
                  </button>
                ) : (
                  <Link href={playPath("online", r.code)} className={styles.small}>
                    {r.mine ? "Voltar" : r.started ? "Entrar no jogo" : "Entrar"}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>
          {rooms?.length ? "Nenhuma sala com vaga na espera agora." : "Nenhuma sala aberta agora. Crie a sua e chame os amigos!"}
        </p>
      )}
    </section>
  );
}
