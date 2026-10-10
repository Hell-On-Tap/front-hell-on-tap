"use client";

import type { Skin } from "@/lib/game-bridge";
import styles from "./Rooms.module.css";

/** Escolha do personagem (figuras vindas do próprio jogo). */
export default function SkinPicker({ skins, value, onChange }: { skins: Skin[]; value: string; onChange: (id: string) => void }) {
  if (!skins.length) return null;
  return (
    <section className={styles.card} aria-labelledby="skin-picker">
      <div className={styles.cardHead}>
        <h2 id="skin-picker">SEU PERSONAGEM</h2>
        <span>{skins.find((s) => s.id === value)?.label}</span>
      </div>
      <div className={styles.skins} role="group" aria-labelledby="skin-picker">
        {skins.map((s) => (
          <button key={s.id} type="button" className={styles.skin} aria-pressed={s.id === value} onClick={() => onChange(s.id)}>
            {s.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image} alt="" className={styles.sprite} />
            ) : (
              <span className={styles.sprite} />
            )}
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
