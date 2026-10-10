"use client";

import { useEffect, useRef, useState } from "react";
import {
  attachGame,
  emitGameMessage,
  onGameReload,
  reloadGame,
  updateGame,
  useGameState,
  type GameMessage,
  type Skin,
} from "@/lib/game-bridge";
import { savedSkin, storeSkin } from "@/lib/game-api";
import { addPreviews, clearInventory, loadInventory } from "@/lib/inventory";
import { useGameUrl } from "@/lib/game-url";
import { useGameActive } from "@/lib/player-store";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./GameHost.module.css";

/** Sem nenhuma notícia do jogo por este tempo: mostra a falha com "Tentar de novo". */
const STALL_TIMEOUT = 45_000;

/**
 * Jogo carregado de antemão: assim que a pessoa entra na conta, o iframe do jogo
 * abre escondido e carrega texturas e personagens (com o progresso num canto da
 * tela). A página /jogar só mostra este mesmo iframe, então trocar de sala não
 * recarrega o jogo. Fica no layout e sai quando a pessoa sai da conta.
 */
export default function GameHost() {
  const hydrated = useHydrated();
  const { status, token, user } = useSession();
  const base = useGameUrl();
  const authed = hydrated && status === "authed" && !!token && !!user;
  if (!authed || !base) return null;
  return <GameFrameHost base={base} token={token!} nickname={user!.nickname} />;
}

function GameFrameHost({ base, token, nickname }: { base: string; token: string; nickname: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const game = useGameState();
  const inGamePage = useGameActive();
  const origin = new URL(base).origin;
  const authRef = useRef({ token, nickname });
  const ready = useRef(false);

  // conta que vai para o jogo quando ele pedir (e de novo se trocar de login)
  useEffect(() => {
    authRef.current = { token, nickname };
    if (ready.current) {
      frameRef.current?.contentWindow?.postMessage(authMessage(token, nickname), origin);
    }
  }, [token, nickname, origin]);

  // outra conta (ou saiu): o inventário é recarregado quando o jogo ficar pronto
  useEffect(() => {
    if (ready.current) void loadInventory(token);
    return () => clearInventory();
  }, [token]);

  useEffect(() => {
    onGameReload(() => setAttempt((n) => n + 1));
    return () => onGameReload(null);
  }, []);

  useEffect(() => {
    ready.current = false;
    updateGame({ phase: "loading", done: 0, total: 0 });
    attachGame(frameRef.current?.contentWindow ?? null, origin);
    let stall = setTimeout(() => updateGame({ phase: "failed" }), STALL_TIMEOUT);
    const alive = () => {
      clearTimeout(stall);
      stall = setTimeout(() => {
        if (!ready.current) updateGame({ phase: "failed" });
      }, STALL_TIMEOUT);
    };
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current?.contentWindow;
      if (event.origin !== origin || !frame || event.source !== frame) return;
      const data = event.data as GameMessage;
      if (!data || typeof data.type !== "string" || !data.type.startsWith("hot:")) return;
      if (data.type === "hot:loading") {
        alive();
        updateGame({ done: Number(data.done) || 0, total: Number(data.total) || 0 });
      } else if (data.type === "hot:ready") {
        alive();
        const { token: t, nickname: n } = authRef.current;
        frame.postMessage(authMessage(t, n), origin);
      } else if (data.type === "hot:idle") {
        ready.current = true;
        clearTimeout(stall);
        // jogo pronto: inventário da conta (o jogo recebe as facas e a equipada)
        void loadInventory(authRef.current.token);
        updateGame({
          phase: "ready",
          skins: Array.isArray(data.skins) ? (data.skins as Skin[]) : [],
          knives: Array.isArray(data.knives) ? (data.knives as Skin[]) : [],
        });
      } else if (data.type === "hot:skin-saved" && typeof data.skin === "string") {
        storeSkin(data.skin);
      } else if (data.type === "hot:previews" && data.images && typeof data.images === "object") {
        addPreviews(data.images as Record<string, string>);
      }
      emitGameMessage(data);
    };
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(stall);
      window.removeEventListener("message", onMessage);
      attachGame(null);
      updateGame({ phase: "off", visible: false });
    };
  }, [origin, attempt]);

  // partida na tela: foco no jogo (teclado e mouse vão direto para ele)
  useEffect(() => {
    if (game.visible) frameRef.current?.focus();
  }, [game.visible]);

  return (
    <>
      <iframe
        key={attempt}
        ref={frameRef}
        src={`${base}/?embed=1`}
        title="Hell on Tap"
        className={styles.frame}
        data-visible={game.visible}
        aria-hidden={!game.visible}
        tabIndex={game.visible ? 0 : -1}
        allow="fullscreen; autoplay; clipboard-write; gamepad"
        allowFullScreen
      />
      {!inGamePage && <LoadingBadge />}
    </>
  );
}

function authMessage(token: string, nickname: string) {
  return {
    type: "hot:auth",
    token,
    nickname,
    inviteBase: `${location.origin}/jogar?modo=online&sala=`,
    skin: savedSkin(),
  };
}

/** Canto da tela: "Preparando o jogo 63%", depois "Jogo pronto" por alguns segundos. */
function LoadingBadge() {
  const game = useGameState();
  const [doneShown, setDoneShown] = useState(false);

  useEffect(() => {
    if (game.phase !== "ready") return;
    Promise.resolve().then(() => setDoneShown(true));
    const timer = setTimeout(() => setDoneShown(false), 3000);
    return () => clearTimeout(timer);
  }, [game.phase]);

  if (game.phase === "loading") {
    const pct = game.total ? Math.round((game.done / game.total) * 100) : 0;
    return (
      <div className={styles.badge} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.text}>
          <span className={styles.label}>PREPARANDO O JOGO</span>
          <span className={styles.bar} aria-hidden="true">
            <i style={{ width: `${game.total ? pct : 8}%` }} />
          </span>
        </span>
        <span className={styles.pct}>{game.total ? `${pct}%` : "…"}</span>
      </div>
    );
  }
  if (game.phase === "failed") {
    return (
      <div className={styles.badge} data-failed="true" role="alert">
        <span className={styles.text}>
          <span className={styles.label}>O JOGO NÃO CARREGOU</span>
          <span className={styles.hint}>Confira se o servidor do jogo está ligado.</span>
        </span>
        <button
          type="button"
          className={styles.retry}
          onClick={() => {
            updateGame({ phase: "loading", done: 0, total: 0 });
            reloadGame();
          }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }
  if (game.phase === "ready" && doneShown) {
    return (
      <div className={styles.badge} data-ready="true" role="status">
        <span className={styles.check} aria-hidden="true">
          ✓
        </span>
        <span className={styles.label}>JOGO PRONTO</span>
      </div>
    );
  }
  return null;
}
