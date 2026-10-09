"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function formatTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function MusicPlayer({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Só aparece quando o navegador bloqueia o autoplay com som:
  // "full" = tela de entrada (primeira visita), "hint" = aviso pequeno (visitas seguintes)
  const [gate, setGate] = useState<"none" | "full" | "hint">("none");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // true = tocar quando a próxima faixa estiver pronta
  const wantPlay = useRef(false);
  const track = tracks[index];
  const multiple = tracks.length > 1;

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio
      .play()
      .then(() => {
        wantPlay.current = false;
        markEntered();
        setGate("none");
      })
      .catch((err: DOMException) => {
        // NotAllowedError = autoplay bloqueado até a primeira interação
        if (err.name === "NotAllowedError") setGate(hasEntered() ? "hint" : "full");
      });
  }, []);

  // Ao abrir: tenta tocar direto. Se bloqueado, a primeira tecla ou clique libera.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    play();

    function onGesture() {
      remove();
      play();
    }
    function remove() {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    }
    window.addEventListener("click", onGesture);
    window.addEventListener("keydown", onGesture);
    return remove;
  }, [play]);

  if (!track) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      play();
    } else {
      wantPlay.current = false;
      audio.pause();
    }
  }

  function step(delta: number) {
    const audio = audioRef.current;
    // Com uma faixa só, ou depois de 3 s em "anterior", volta ao início da música
    if (audio && (!multiple || (delta < 0 && audio.currentTime > 3))) {
      audio.currentTime = 0;
      return;
    }
    wantPlay.current = playing;
    setIndex((i) => (i + delta + tracks.length) % tracks.length);
  }

  function onEnded() {
    if (multiple) {
      wantPlay.current = true;
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
      {gate === "full" && (
        <button type="button" className={styles.gate} onClick={play} autoFocus>
          <span className={styles.gateKey}>Pressione qualquer tecla</span>
          <span className={styles.gateTrack}>
            para entrar ao som de {track.title}
          </span>
        </button>
      )}

      <aside className={styles.player} aria-label="Música" data-stay-active="">
        {gate === "hint" && (
          <p className={styles.hint} role="status">
            Clique em qualquer lugar para ligar o som.
          </p>
        )}
        <audio
          ref={audioRef}
          src={track.audio}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          onCanPlay={() => {
            if (wantPlay.current) play();
          }}
          onLoadedMetadata={(e) => {
            setTime(0);
            setDuration(e.currentTarget.duration);
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            setDuration(e.currentTarget.duration);
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
