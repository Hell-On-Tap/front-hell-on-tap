"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { savedSkin, storeSkin } from "@/lib/game-api";
import { useGameUrl } from "@/lib/game-url";
import { setGameActive } from "@/lib/player-store";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import WaitingRoom, { type LiveRoom, type Skin } from "./WaitingRoom";
import styles from "./GameFrame.module.css";

/** Tempo para o jogo responder antes de mostrar o aviso de "não abriu". */
const LOAD_TIMEOUT = 15_000;

/**
 * O jogo (servidor 500mldoom) roda num iframe em tela cheia. Quando ele avisa que
 * está pronto (`hot:ready`), o site manda a conta logada (`hot:auth`): o token só
 * vai para o servidor do jogo, que confere na API. `hot:exit` volta para o lobby.
 *
 * Online, a sala de espera é do site (WaitingRoom, por cima do jogo): o jogo conta
 * quem está na sala (`hot:room`) e o site manda `hot:skin`, `hot:start` e `hot:leave`.
 * Quando a partida começa (`hot:started`), a sala de espera some e o jogo aparece.
 */
export default function GameFrame() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const { status, token, user } = useSession();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const [live, setLive] = useState<LiveRoom | null>(null);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [mySkin, setMySkin] = useState("");
  const [started, setStarted] = useState(false);
  const [gameError, setGameError] = useState("");

  const mode = params.get("modo") === "bots" ? "bots" : "online";
  const roomParam = (params.get("sala") ?? "").toUpperCase();
  const room = /^[A-Z0-9]{6}$/.test(roomParam) ? roomParam : "";
  const authed = hydrated && status === "authed" && !!token && !!user;
  // online sem sala: as salas ficam no lobby
  const needsRoom = mode === "online" && !room;
  // endereço do jogo: GAME_URL da API (ou NEXT_PUBLIC_GAME_URL)
  const gameBase = useGameUrl();
  const GAME_ORIGIN = gameBase ? new URL(gameBase).origin : "";
  const src = `${gameBase}/?${new URLSearchParams({ embed: "1", modo: mode, ...(room ? { sala: room } : {}), v: String(attempt) })}`;

  // partida aberta: música pausada e botões flutuantes escondidos até sair daqui
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, []);

  useEffect(() => {
    if (needsRoom) router.replace("/lobby");
  }, [needsRoom, router]);

  const toGame = useCallback((message: Record<string, unknown>) => {
    if (GAME_ORIGIN) frameRef.current?.contentWindow?.postMessage(message, GAME_ORIGIN);
  }, [GAME_ORIGIN]);

  useEffect(() => {
    if (!authed || needsRoom || !GAME_ORIGIN) return;
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current?.contentWindow;
      if (event.origin !== GAME_ORIGIN || !frame || event.source !== frame) return;
      if (event.data?.type === "hot:ready") {
        frame.postMessage(
          {
            type: "hot:auth",
            token,
            nickname: user!.nickname,
            inviteBase: `${location.origin}/jogar?modo=online&sala=`,
            skin: savedSkin(),
          },
          GAME_ORIGIN,
        );
        setState("ready");
      } else if (event.data?.type === "hot:exit") {
        router.push("/lobby");
      } else if (event.data?.type === "hot:room") {
        const data = event.data as LiveRoom & { skins?: Skin[] };
        if (!Array.isArray(data.players)) return;
        setLive({ code: data.code, isHost: !!data.isHost, started: !!data.started, players: data.players });
        if (Array.isArray(data.skins)) setSkins(data.skins);
        const me = data.players.find((p) => p.you);
        if (me) setMySkin(me.skin);
      } else if (event.data?.type === "hot:started") {
        setStarted(true);
        frameRef.current?.focus();
      } else if (event.data?.type === "hot:error") {
        setGameError(typeof event.data.message === "string" ? event.data.message : "A conexão com a sala caiu.");
      }
    };
    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => setState((s) => (s === "loading" ? "failed" : s)), LOAD_TIMEOUT);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [authed, token, user, router, attempt, needsRoom, GAME_ORIGIN]);

  const leave = useCallback(() => {
    toGame({ type: "hot:leave" });
    router.push("/lobby");
  }, [toGame, router]);
  const gone = useCallback((message: string) => setGameError(message), []);

  if (!hydrated || status === "loading" || needsRoom || (authed && !gameBase)) return <div className={styles.screen} aria-busy="true" />;

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

  return (
    <div className={styles.screen}>
      <iframe
        key={attempt}
        ref={frameRef}
        src={src}
        title={mode === "bots" ? "Hell on Tap: treino com bots" : "Hell on Tap: mata-mata online"}
        className={styles.frame}
        allow="fullscreen; autoplay; clipboard-write; gamepad"
        allowFullScreen
        onLoad={() => frameRef.current?.focus()}
      />

      {/* sala de espera do site, até a partida começar */}
      {mode === "online" && state === "ready" && !started && !gameError && live && (
        <WaitingRoom
          token={token!}
          code={room}
          live={live}
          skins={skins}
          mySkin={mySkin}
          onSkin={(skin) => {
            setMySkin(skin);
            storeSkin(skin);
            toGame({ type: "hot:skin", skin });
          }}
          onStart={() => toGame({ type: "hot:start" })}
          onLeave={leave}
          onGone={gone}
        />
      )}

      {mode === "online" && state === "ready" && !live && !gameError && (
        <div className={styles.overlay} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Entrando na sala {room}…</p>
        </div>
      )}

      {gameError && (
        <div className={styles.overlay} role="alert">
          <div className={styles.card}>
            <h1>{started ? "A partida caiu" : "Não deu para entrar"}</h1>
            <p>{gameError}</p>
            <div className={styles.actions}>
              <Link href="/lobby" className={styles.primary}>
                Ver salas no lobby
              </Link>
            </div>
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className={styles.overlay} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>{mode === "bots" ? "Abrindo o treino…" : room ? `Entrando na sala ${room}…` : "Abrindo o mata-mata…"}</p>
        </div>
      )}

      {state === "failed" && (
        <div className={styles.overlay} role="alert">
          <div className={styles.card}>
            <h1>O jogo não abriu</h1>
            <p>O servidor do jogo não respondeu. Confira se ele está ligado e tente de novo.</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setState("loading");
                  setAttempt((n) => n + 1);
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
      )}
    </div>
  );
}
