"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ReportBugButton.module.css";

const SOUND = "/audios/report.mp3";

/**
 * Aba fixa "Reportar bug" na borda direita, em todas as páginas.
 * Por enquanto toca o som e avisa; o formulário entra quando a API existir.
 */
export default function ReportBugButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function report() {
    // o clique libera o som no navegador
    audioRef.current ??= new Audio(SOUND);
    const audio = audioRef.current;
    audio.volume = 0.8;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* arquivo indisponível: segue sem som */
    });
    setToast(true);
  }

  return (
    <>
      <button type="button" className={styles.tab} onClick={report} aria-label="Reportar bug">
        <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
          {/* inseto em pixel art */}
          <path d="M6 1h1v2h2V1h1v2h1v1h1v2h2v1h-2v2h2v1h-2v2h2v1h-2v1h-1v1H5v-1H4v-1H2v-1h2v-2H2V9h2V7H2V6h2V4h1V3h1zM7 6v8h2V6z" />
        </svg>
        <span className={styles.label}>Reportar bug</span>
      </button>

      <p className={styles.toast} data-show={toast} role="status" aria-live="polite">
        {toast ? "Bug na mira! O formulário de report chega em breve." : ""}
      </p>
    </>
  );
}
