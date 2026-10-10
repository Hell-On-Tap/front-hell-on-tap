"use client";

import { useEffect, useState } from "react";
import { GAME_URL, MODE_GROUPS, type ModeOption } from "@/lib/home-data";
import { PanelHead } from "./PanelHead";
import styles from "./PlayPanel.module.css";

const OPTIONS = MODE_GROUPS.flatMap((g) => g.options);
const FIRST = OPTIONS.find((o) => o.available)!;
const KEY = "hot:mode";

/** Último modo escolhido neste navegador (só os disponíveis). */
function savedMode(): ModeOption {
  try {
    const id = localStorage.getItem(KEY);
    return OPTIONS.find((o) => o.id === id && o.available) ?? FIRST;
  } catch {
    return FIRST;
  }
}

/** Aba Jogar: um cabeçalho por modo e quadrados com imagem para escolher. */
export default function PlayPanel() {
  const [selected, setSelected] = useState<ModeOption>(FIRST);

  useEffect(() => {
    Promise.resolve().then(() => setSelected(savedMode()));
  }, []);

  function choose(option: ModeOption) {
    if (!option.available) return;
    setSelected(option);
    try {
      localStorage.setItem(KEY, option.id);
    } catch {
      /* sem armazenamento: só não lembra a escolha */
    }
  }

  // teclas 1, 2 e 3, como no menu de compra
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const option = OPTIONS.find((o) => o.key === e.key);
      if (option?.available) choose(option);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const group = MODE_GROUPS.find((g) => g.options.includes(selected))!;

  return (
    <>
      <PanelHead title="Jogar" lead="Escolha o modo e entre. Teclas 1, 2 e 3 também selecionam.">
        {/* escolhido + jogar, sempre à vista no topo */}
        <div className={styles.launch} aria-live="polite">
          <div className={styles.launchText}>
            <span className={styles.launchLabel}>Selecionado</span>
            <strong>
              {group.name} · {selected.name}
            </strong>
          </div>
          <a href={GAME_URL} className={styles.play}>
            Jogar
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2v12l10-6z" />
            </svg>
          </a>
        </div>
      </PanelHead>

      {MODE_GROUPS.map((g) => (
        <section key={g.id} className={styles.group} data-available={g.available} aria-labelledby={`mode-${g.id}`}>
          <header className={styles.groupHead}>
            <h3 id={`mode-${g.id}`}>{g.name}</h3>
            <span className={styles.status} data-available={g.available}>
              {g.available ? "Disponível" : "Em breve"}
            </span>
            <p>{g.detail}</p>
          </header>

          <div className={styles.options} role="radiogroup" aria-labelledby={`mode-${g.id}`}>
            {g.options.map((o) => {
              const checked = selected.id === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={!o.available}
                  className={styles.option}
                  data-available={o.available}
                  onClick={() => choose(o)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.image} alt="" className={styles.art} loading="lazy" />
                  <kbd className={styles.key}>{o.key}</kbd>
                  {checked && (
                    <span className={styles.check} aria-hidden="true">
                      <svg viewBox="0 0 16 16">
                        <path d="M6 11.2 2.8 8 1.4 9.4 6 14l8.6-8.6L13.2 4z" />
                      </svg>
                    </span>
                  )}
                  {!o.available && (
                    <span className={styles.lock} aria-hidden="true">
                      <svg viewBox="0 0 16 16">
                        <path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" />
                      </svg>
                      Em breve
                    </span>
                  )}
                  <span className={styles.caption}>
                    <span className={styles.name}>{o.name}</span>
                    <span className={styles.desc}>{o.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

    </>
  );
}
