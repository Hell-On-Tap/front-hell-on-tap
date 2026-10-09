"use client";

import { useEffect, useState } from "react";
import { GAME_URL, MODES } from "@/lib/home-data";
import { useSession } from "@/lib/session";
import styles from "./ModeMenu.module.css";

export default function ModeMenu() {
  const authed = useSession().status === "authed";
  const [selected, setSelected] = useState(0);
  const mode = MODES[selected];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const index = MODES.findIndex((m) => m.key === e.key);
      if (index >= 0) setSelected(index);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.menu}>
      <ul className={styles.list}>
        {MODES.map((m, i) => (
          <li key={m.key}>
            <button
              type="button"
              className={styles.item}
              aria-pressed={i === selected}
              data-available={m.available}
              onClick={() => setSelected(i)}
            >
              <kbd className={styles.key}>{m.key}</kbd>
              <span className={styles.itemName}>{m.name}</span>
              {!m.available && <span className={styles.soon}>Em breve</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.detail} aria-live="polite">
        <h3>{mode.name}</h3>
        <p className={styles.description}>{mode.description}</p>
        <p className={styles.extra}>{mode.detail}</p>
        {mode.available && mode.href ? (
          <a href={authed ? GAME_URL : mode.href} className={styles.play}>
            {authed ? "Jogar" : "Entrar e jogar"}
          </a>
        ) : (
          <span className={styles.locked}>Ainda não disponível</span>
        )}
      </div>
    </div>
  );
}
