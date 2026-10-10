"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import { onGameMessage, reloadGame, sendToGame, showGame, updateGame, useGameState, type Skin } from "@/lib/game-bridge";
import { getRoom, savedSkin, storeSkin, type GameRoom } from "@/lib/game-api";
import { setGameActive } from "@/lib/player-store";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import { PrivacyBadge } from "./RoomSettings";
import SkinPicker from "./SkinPicker";
import WaitingRoom, { type LiveRoom } from "./WaitingRoom";
import styles from "./GameFrame.module.css";
import rooms from "./Rooms.module.css";

/**
 * Página da partida (/jogar). O jogo já está carregado desde o login (GameHost,
 * no layout): aqui o site manda abrir a sala ou o treino e mostra o jogo quando
 * a partida começa.
 *
 * Online, antes do jogo aparecer, sempre há uma tela do site: a sala de espera
 * (partida ainda não começou) ou a escolha de personagem com "Entrar na partida"
 * (partida já rolando). `hot:exit` (Voltar ao menu, dentro do jogo) volta ao lobby.
 */
export default function GameFrame() {
  const params = useSearchParams();
  const mode = params.get("modo") === "bots" ? "bots" : "online";
  const roomParam = (params.get("sala") ?? "").toUpperCase();
  const room = /^[A-Z0-9]{6}$/.test(roomParam) ? roomParam : "";
  // outra sala na mesma página: começa do zero
  return <GameSession key={`${mode}:${room}`} mode={mode} room={room} />;
}

type Stage =
  | { kind: "checking" }
  | { kind: "joining" }
  | { kind: "waiting" }
  | { kind: "inProgress"; meta: GameRoom }
  | { kind: "playing" }
  | { kind: "error"; title: string; message: string };

function GameSession({ mode, room }: { mode: "online" | "bots"; room: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { status, token, user } = useSession();
  const game = useGameState();
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [live, setLive] = useState<LiveRoom | null>(null);
  const [mySkin, setMySkin] = useState("");

  const authed = hydrated && status === "authed" && !!token && !!user;
  // online sem sala: as salas ficam no lobby
  const needsRoom = mode === "online" && !room;

  // partida aberta: música pausada e botões flutuantes escondidos até sair daqui
  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
      showGame(false);
      sendToGame({ type: "hot:leave" });
    };
  }, []);

  useEffect(() => {
    if (needsRoom) router.replace("/lobby");
  }, [needsRoom, router]);

  // mensagens do jogo durante esta partida
  useEffect(() => {
    return onGameMessage((data) => {
      if (data.type === "hot:exit") {
        router.push("/lobby");
      } else if (data.type === "hot:room") {
        const players = Array.isArray(data.players) ? (data.players as LiveRoom["players"]) : [];
        setLive({ code: String(data.code), isHost: !!data.isHost, started: !!data.started, players });
        if (Array.isArray(data.skins)) updateGame({ skins: data.skins as Skin[] });
        const me = players.find((p) => p.you);
        if (me) setMySkin(me.skin);
        setStage((s) => (s.kind === "joining" ? { kind: "waiting" } : s));
      } else if (data.type === "hot:started") {
        setStage({ kind: "playing" });
        showGame(true);
      } else if (data.type === "hot:error") {
        showGame(false);
        setStage((s) => ({
          kind: "error",
          title: s.kind === "playing" ? "A partida caiu" : "Não deu para entrar",
          message: typeof data.message === "string" ? data.message : "A conexão com a sala caiu.",
        }));
      }
    });
  }, [router]);

  const join = useCallback(
    (skin?: string) => {
      setStage({ kind: "joining" });
      sendToGame({ type: "hot:play", mode: "online", room, skin: skin ?? savedSkin() });
    },
    [room],
  );

  // jogo pronto: abre o treino, ou confere a sala antes de entrar
  useEffect(() => {
    if (!authed || needsRoom || game.phase !== "ready" || stage.kind !== "checking") return;
    let cancelled = false;
    if (mode === "bots") {
      sendToGame({ type: "hot:play", mode: "bots" });
      showGame(true);
      Promise.resolve().then(() => !cancelled && setStage({ kind: "playing" }));
      return () => {
        cancelled = true;
      };
    }
    getRoom(token, room)
      .then((meta) => {
        if (cancelled) return;
        // partida rolando: escolhe o personagem antes de cair no jogo
        if (meta.started) setStage({ kind: "inProgress", meta });
        else join();
      })
      .catch((err) => {
        if (cancelled) return;
        setStage({
          kind: "error",
          title: "Não deu para entrar",
          message:
            err instanceof AuthError && err.status === 404
              ? "Esta sala não existe mais."
              : err instanceof AuthError
                ? err.message
                : "Não foi possível abrir a sala.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [authed, needsRoom, game.phase, stage.kind, mode, room, token, join]);

  const chooseSkin = useCallback((skin: string) => {
    setMySkin(skin);
    storeSkin(skin);
    sendToGame({ type: "hot:skin", skin });
  }, []);
  const leave = useCallback(() => {
    sendToGame({ type: "hot:leave" });
    router.push("/lobby");
  }, [router]);
  const gone = useCallback((message: string) => {
    sendToGame({ type: "hot:leave" });
    setStage({ kind: "error", title: "Não deu para entrar", message });
  }, []);

  if (!hydrated || status === "loading" || needsRoom) return <div className={styles.screen} aria-busy="true" />;

  if (!authed) {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <h1>Entre para jogar</h1>
          <p>
            {room
              ? `Você foi convidado para a sala ${room}. Entre com sua conta e a partida abre aqui mesmo.`
              : "As partidas do Hell on Tap são com conta. Entre ou crie a sua para jogar."}
          </p>
          <div className={styles.actions}>
            <a href="#entrar" className={styles.primary}>
              Entrar
            </a>
            <a href="#criar-conta" className={styles.ghost}>
              Criar conta
            </a>
          </div>
        </div>
      </div>
    );
  }

  const pct = game.total ? Math.round((game.done / game.total) * 100) : 0;

  return (
    <div className={styles.screen}>
      {game.phase === "failed" ? (
        <div className={styles.overlay} role="alert">
          <div className={styles.card}>
            <h1>O jogo não abriu</h1>
            <p>O servidor do jogo não respondeu. Confira se ele está ligado e tente de novo.</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  updateGame({ phase: "loading", done: 0, total: 0 });
                  reloadGame();
                }}
              >
                Tentar de novo
              </button>
              <Link href="/lobby" className={styles.ghost}>
                Voltar ao lobby
              </Link>
            </div>
          </div>
        </div>
      ) : game.phase !== "ready" ? (
        <div className={styles.overlay} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Preparando o jogo{game.total ? ` · ${pct}%` : "…"}</p>
        </div>
      ) : stage.kind === "error" ? (
        <div className={styles.overlay} role="alert">
          <div className={styles.card}>
            <h1>{stage.title}</h1>
            <p>{stage.message}</p>
            <div className={styles.actions}>
              <Link href="/lobby" className={styles.primary}>
                Ver salas no lobby
              </Link>
            </div>
          </div>
        </div>
      ) : stage.kind === "waiting" && live ? (
        <WaitingRoom
          token={token!}
          code={room}
          live={live}
          skins={game.skins}
          mySkin={mySkin}
          onSkin={chooseSkin}
          onStart={() => sendToGame({ type: "hot:start" })}
          onLeave={leave}
          onGone={gone}
        />
      ) : stage.kind === "inProgress" ? (
        <InProgress meta={stage.meta} onEnter={join} onLeave={() => router.push("/lobby")} />
      ) : stage.kind !== "playing" ? (
        <div className={styles.overlay} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>{mode === "bots" ? "Abrindo o treino…" : `Entrando na sala ${room}…`}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Partida já começou: escolhe o personagem e entra (nada de cair direto no jogo). */
function InProgress({ meta, onEnter, onLeave }: { meta: GameRoom; onEnter: (skin: string) => void; onLeave: () => void }) {
  const game = useGameState();
  const [skin, setSkin] = useState(() => savedSkin() ?? game.skins[0]?.id ?? "");
  const full = meta.players >= meta.maxPlayers;
  return (
    <div className={rooms.waiting} role="region" aria-label="Entrar na partida">
      <div className={rooms.waitingShell}>
        <header className={rooms.waitingHead}>
          <div className={rooms.waitingTitle}>
            <span className={rooms.eyebrow}>MATA-MATA ONLINE · PARTIDA EM ANDAMENTO</span>
            <h1>{meta.name}</h1>
            <div className={rooms.waitingTags}>
              <PrivacyBadge privacy={meta.privacy} />
              <span>
                {meta.players}/{meta.maxPlayers} jogadores · Dono: {meta.owner}
              </span>
            </div>
          </div>
        </header>
        <SkinPicker
          skins={game.skins}
          value={skin}
          onChange={(id) => {
            setSkin(id);
            storeSkin(id);
          }}
        />
        <div className={rooms.startBar}>
          <button type="button" className={rooms.ghost} onClick={onLeave}>
            Voltar ao lobby
          </button>
          <p>
            {full ? (
              "A sala está cheia agora. Tente de novo daqui a pouco."
            ) : (
              <>
                <strong>A partida já começou.</strong> Escolha seu personagem e entre: você nasce num ponto livre do mapa.
              </>
            )}
          </p>
          <button
            type="button"
            className={`${rooms.primary} ${rooms.startButton}`}
            disabled={full}
            onClick={() => onEnter(skin)}
          >
            Entrar na partida
          </button>
        </div>
      </div>
    </div>
  );
}
