"use client";

import { useEffect, useState } from "react";
import {
  backgroundCss,
  BACKGROUNDS,
  gradientId,
  loadSavedGradients,
  parseGradient,
  storeSavedGradients,
  type CustomGradient,
} from "@/lib/image-crop";
import styles from "./ImageCropper.module.css";

const DEFAULT_GRADIENT: CustomGradient = { angle: 160, from: "#ffb43a", to: "#c8170e" };
/** atalhos de direção: ângulo do CSS, seta e nome */
const ANGLES: [number, string, string][] = [
  [0, "↑", "Para cima"],
  [45, "↗", "Para cima e direita"],
  [90, "→", "Para a direita"],
  [135, "↘", "Para baixo e direita"],
  [180, "↓", "Para baixo"],
  [225, "↙", "Para baixo e esquerda"],
  [270, "←", "Para a esquerda"],
  [315, "↖", "Para cima e esquerda"],
];

type Props = {
  /** null = sem fundo (transparente ou padrão, conforme noneLabel) */
  value: string | null;
  onChange: (value: string | null) => void;
  /** nome da opção "sem fundo": "Transparente" no enquadramento, "Padrão do site" no clã */
  noneLabel?: string;
  label?: string;
};

/**
 * Escolha de fundo: sem fundo, fundos prontos, gradientes salvos, gradiente
 * personalizado (cores + direção) e uma cor qualquer. Usado no enquadramento
 * de imagens e na cor de fundo do clã.
 */
export default function BackgroundPicker({ value, onChange, noneLabel = "Transparente", label = "Fundo" }: Props) {
  const [gradOpen, setGradOpen] = useState(false);
  const [grad, setGrad] = useState<CustomGradient>(() => parseGradient(value) ?? DEFAULT_GRADIENT);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    Promise.resolve().then(() => setSaved(loadSavedGradients()));
  }, []);

  const customColor = value && /^#[0-9a-f]{6}$/i.test(value) && !BACKGROUNDS.some((b) => b.id === value) ? value : null;

  /** muda o gradiente em edição e já aplica */
  function editGradient(changes: Partial<CustomGradient>) {
    const next = { ...grad, ...changes };
    setGrad(next);
    onChange(gradientId(next));
  }
  const gradId = gradientId(grad);
  const gradSaved = saved.includes(gradId);
  const gradActive = parseGradient(value) !== null;
  function toggleSaved() {
    const next = gradSaved ? saved.filter((g) => g !== gradId) : [gradId, ...saved];
    setSaved(next.slice(0, 8));
    storeSavedGradients(next);
  }

  return (
    <>
      <div className={styles.swatches} role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          className={`${styles.swatch} ${styles.none}`}
          title={noneLabel}
          aria-label={noneLabel}
          onClick={() => onChange(null)}
        />
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={value === b.id}
            className={styles.swatch}
            style={{ background: b.css }}
            title={b.label}
            aria-label={b.label}
            onClick={() => onChange(b.id)}
          />
        ))}
        {saved.map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={value === g}
            className={styles.swatch}
            style={{ background: backgroundCss(g) ?? undefined }}
            title="Gradiente salvo"
            aria-label="Gradiente salvo"
            onClick={() => {
              setGrad(parseGradient(g)!);
              onChange(g);
            }}
          />
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={gradActive && !saved.includes(value ?? "")}
          className={`${styles.swatch} ${styles.custom}`}
          style={{ background: backgroundCss(gradId) ?? undefined }}
          title="Gradiente personalizado"
          aria-label="Gradiente personalizado (abre o editor)"
          onClick={() => {
            setGradOpen((o) => !o);
            onChange(gradId);
          }}
        >
          <span aria-hidden="true">G</span>
        </button>
        <label
          className={`${styles.swatch} ${styles.custom}`}
          title="Outra cor"
          aria-checked={!!customColor}
          role="radio"
          style={customColor ? { background: customColor } : undefined}
        >
          <span aria-hidden="true">+</span>
          <input
            type="color"
            aria-label="Escolher outra cor"
            value={customColor ?? "#8e0b0b"}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>

      {gradOpen && (
        <div id="grad-editor" className={styles.gradEditor}>
          <div className={styles.gradBar} style={{ background: backgroundCss(gradId) ?? undefined }} aria-hidden="true" />
          <div className={styles.gradRow}>
            <label className={styles.gradColor}>
              <span>De</span>
              <input type="color" value={grad.from} onChange={(e) => editGradient({ from: e.target.value })} />
            </label>
            <button
              type="button"
              className={styles.chip}
              onClick={() => editGradient({ from: grad.to, to: grad.from })}
              title="Trocar as cores de lugar"
            >
              ⇄ Inverter
            </button>
            <label className={styles.gradColor}>
              <span>Para</span>
              <input type="color" value={grad.to} onChange={(e) => editGradient({ to: e.target.value })} />
            </label>
          </div>
          <div className={styles.gradRow}>
            <label className={styles.gradAngle}>
              <span>Direção</span>
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={grad.angle}
                onChange={(e) => editGradient({ angle: Number(e.target.value) })}
                aria-valuetext={`${grad.angle} graus`}
              />
              <output>{grad.angle}°</output>
            </label>
          </div>
          <div className={styles.gradPresets} role="group" aria-label="Direções prontas">
            {ANGLES.map(([a, arrow, label]) => (
              <button
                key={a}
                type="button"
                className={styles.gradDir}
                aria-pressed={grad.angle === a}
                aria-label={label}
                title={label}
                onClick={() => editGradient({ angle: a })}
              >
                {arrow}
              </button>
            ))}
            <button type="button" className={styles.chip} onClick={toggleSaved}>
              {gradSaved ? "Remover dos salvos" : "Salvar gradiente"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
