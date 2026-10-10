"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerMode, setPlayerMode, setPlayerPlaying, usePlayerMode } from "@/lib/player-store";
import type { Track } from "@/lib/playlist";
import styles from "./MusicPlayer.module.css";

const ENTERED_KEY = "hot:entered";

// O navegador não permite que o site guarde "som liberado": cada visita nova
// pode exigir uma interação. Guardamos só que a pessoa já entrou uma vez,
// para não mostrar a tela cheia de novo.
function hasEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
}

function markEntered() {
  try {
    localStorage.setItem(ENTERED_KEY, "1");
  } catch {
    /* armazenamento indisponível: a tela de entrada volta a aparecer */
  }
}

/**
 * Estado do player salvo no navegador: música, ponto da música e se a pessoa
 * quer ouvir ("playing" é a intenção, não o estado do <audio>: se o navegador
 * bloquear o som, a intenção de tocar continua salva).
 */
const STATE_KEY = "hot:player-state";
type SavedState = { trackId: string; time: number; playing: boolean };

function readState(): SavedState | null {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null");
    if (s && typeof s.trackId === "string" && typeof s.time === "number" && typeof s.playing === "boolean") return s;
  } catch {
    /* estado inválido ou armazenamento bloqueado: começa do zero */
  }
  return null;
}

function writeState(state: SavedState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* sem armazenamento: o player só não lembra depois do F5 */
  }
}

function formatTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function MusicPlayer({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  // o <audio> só recebe a música depois de escolher a faixa salva, para não
  // carregar a primeira faixa à toa e aplicar o ponto salvo na música errada
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Só aparece quando o navegador bloqueia o autoplay com som:
  // "full" = tela de entrada (primeira visita), "hint" = aviso pequeno (visitas seguintes)
  const [gate, setGate] = useState<"none" | "full" | "hint">("none");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // true = tocar quando a próxima faixa estiver pronta
  const wantPlay = useRef(false);
  // o que a pessoa quer: true = ouvir música (sobrevive a bloqueio de autoplay)
  const intent = useRef(true);
  // ponto salvo a aplicar quando o áudio carregar (depois do F5)
  const pendingSeek = useRef<number | null>(null);
  const indexRef = useRef(0);
  const lastSave = useRef(0);
  // só grava depois de restaurar, para não apagar o estado salvo ao abrir
  const restored = useRef(false);
  const mode = usePlayerMode();
  const track = tracks[index];
  const multiple = tracks.length > 1;

  /** Grava música, ponto e intenção no navegador. */
  const save = useCallback(() => {
    const audio = audioRef.current;
    const current = tracks[indexRef.current];
    if (!audio || !current || !restored.current) return;
    lastSave.current = Date.now();
    writeState({ trackId: current.id, time: pendingSeek.current ?? audio.currentTime, playing: intent.current });
  }, [tracks]);

  /** Vai para o ponto salvo assim que o áudio souber a duração. */
  const applySeek = useCallback(() => {
    const audio = audioRef.current;
    const t = pendingSeek.current;
    if (!audio || t === null || audio.readyState < HTMLMediaElement.HAVE_METADATA) return;
    pendingSeek.current = null;
    // perto do fim: recomeça a música em vez de terminar na hora
    if (Number.isFinite(audio.duration) && t < audio.duration - 1) audio.currentTime = t;
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    intent.current = true;
    audio
      .play()
      .then(() => {
        wantPlay.current = false;
        markEntered();
        setGate("none");
        save();
      })
      .catch((err: DOMException) => {
        // NotAllowedError = autoplay bloqueado até a primeira interação
        if (err.name === "NotAllowedError") setGate(hasEntered() ? "hint" : "full");
      });
  }, [save]);

  // Ao abrir: tenta tocar direto. Se bloqueado, a primeira tecla ou clique libera.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;

    // Retoma o que estava salvo: música, ponto e se estava tocando.
    // Player fechado (X) = parado; sem nada salvo (primeira visita) = tocar.
    const saved = readState();
    const savedIndex = saved ? tracks.findIndex((t) => t.id === saved.trackId) : -1;
    intent.current = getPlayerMode() === "closed" ? false : saved ? saved.playing : true;

    const startIndex = saved && savedIndex >= 0 ? savedIndex : 0;
    if (saved && savedIndex >= 0) pendingSeek.current = saved.time;
    // toca (ou tenta) quando a faixa estiver pronta, já no ponto salvo
    wantPlay.current = intent.current;
    indexRef.current = startIndex;
    restored.current = true;
    void Promise.resolve().then(() => {
      setIndex(startIndex);
      setReady(true);
    });

    // som bloqueado: o primeiro clique ou tecla libera (se a pessoa queria ouvir)
    function onGesture() {
      remove();
      if (intent.current && audioRef.current?.paused) play();
    }
    function remove() {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    }
    window.addEventListener("click", onGesture);
    window.addEventListener("keydown", onGesture);

    // grava o ponto exato ao recarregar, fechar a aba ou trocar de aba
    const onHide = () => save();
    const onVisibility = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      remove();
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // faixa atual: guarda para os eventos e grava a troca de música
  useEffect(() => {
    if (!ready) return;
    indexRef.current = index;
    save();
  }, [index, ready, save]);

  if (!track) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      play();
    } else {
      wantPlay.current = false;
      intent.current = false;
      audio.pause();
      save();
    }
  }

  /** X do player: pausa e esconde (o ícone do menu traz de volta). */
  function close() {
    wantPlay.current = false;
    intent.current = false;
    audioRef.current?.pause();
    setGate("none");
    setPlayerMode("closed");
    save();
  }

  function step(delta: number) {
    const audio = audioRef.current;
    // Com uma faixa só, ou depois de 3 s em "anterior", volta ao início da música
    if (audio && (!multiple || (delta < 0 && audio.currentTime > 3))) {
      audio.currentTime = 0;
      return;
    }
    wantPlay.current = intent.current;
    pendingSeek.current = null;
    setIndex((i) => (i + delta + tracks.length) % tracks.length);
  }

  function onEnded() {
    if (multiple) {
      wantPlay.current = intent.current;
      pendingSeek.current = null;
      setIndex((i) => (i + 1) % tracks.length);
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        play();
      }
    }
  }

  return (
    <>
      {gate === "full" && mode !== "closed" && (
        <button type="button" className={styles.gate} onClick={play} autoFocus>
          <span className={styles.gateKey}>Pressione qualquer tecla</span>
          <span className={styles.gateTrack}>
            para entrar ao som de {track.title}
          </span>
        </button>
      )}

      <aside
        className={styles.player}
        aria-label="Música"
        data-stay-active=""
        data-mode={mode}
        hidden={mode !== "open"}
      >
        <button type="button" className={styles.close} onClick={close} aria-label="Fechar player e parar a música" title="Fechar">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2h3l3 3 3-3h3v3l-3 3 3 3v3h-3l-3-3-3 3H2v-3l3-3-3-3z" />
          </svg>
        </button>
        {gate === "hint" && (
          <p className={styles.hint} role="status">
            Clique em qualquer lugar para ligar o som.
          </p>
        )}
        <audio
          ref={audioRef}
          src={ready ? track.audio : undefined}
          preload="auto"
          onPlay={() => {
            setPlaying(true);
            setPlayerPlaying(true);
          }}
          onPause={() => {
            setPlaying(false);
            setPlayerPlaying(false);
          }}
          onEnded={onEnded}
          onCanPlay={() => {
            if (wantPlay.current) play();
          }}
          onLoadedMetadata={(e) => {
            setTime(0);
            setDuration(e.currentTarget.duration);
            applySeek();
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            setDuration(e.currentTarget.duration);
            // grava o ponto a cada segundo
            if (Date.now() - lastSave.current > 1000) save();
          }}
        />

        {track.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.cover} src={track.cover} alt="" width={64} height={64} />
        )}

        <div className={styles.info}>
          <p className={styles.title} title={track.title}>
            {track.title}
          </p>
          <p className={styles.meta}>
            {track.subtitle ? `${track.subtitle}, por ` : "por "}
            {track.sourceUrl ? (
              <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer">
                {track.artist}
              </a>
            ) : (
              track.artist
            )}
          </p>

          <div className={styles.progress}>
            <span>{formatTime(time)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.5}
              value={Math.min(time, duration || 0)}
              onChange={(e) => {
                const audio = audioRef.current;
                if (audio) audio.currentTime = Number(e.target.value);
              }}
              aria-label="Posição da música"
              style={{ "--pct": `${duration ? (time / duration) * 100 : 0}%` } as React.CSSProperties}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button type="button" onClick={() => step(-1)} aria-label="Música anterior" className={styles.btn}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 5h2v14H6zM20 5v14L9 12z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar música" : "Tocar música"}
            className={`${styles.btn} ${styles.main}`}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Próxima música" className={styles.btn}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
