"use client";

import type { GameTeam, Skin } from "@/lib/game-bridge";
import styles from "./Rooms.module.css";

/** Character previews supplied by the game. Competitive rooms show only the current side. */
export default function SkinPicker({
  skins,
  value,
  onChange,
  team,
}: {
  skins: Skin[];
  value: string;
  onChange: (id: string) => void;
  team?: GameTeam;
}) {
  if (!skins.length) return null;
  const allowedIds = team === "t"
    ? new Set(["cs_terror", "cs_leet", "cs_arctic", "cs_guerilla"])
    : team === "ct"
      ? new Set(["cs_urban", "cs_gsg9", "cs_sas", "cs_gign"])
      : null;
  const availableSkins = allowedIds ? skins.filter((skin) => allowedIds.has(skin.id)) : skins;
  if (!availableSkins.length) return null;

  return (
    <section className={styles.card} aria-labelledby="skin-picker">
      <div className={styles.cardHead}>
        <h2 id="skin-picker">{team === "t" ? "PERSONAGEM TR" : team === "ct" ? "PERSONAGEM CT" : "SEU PERSONAGEM"}</h2>
        <span>{availableSkins.find((skin) => skin.id === value)?.label}</span>
      </div>
      <div className={styles.skins} role="group" aria-labelledby="skin-picker">
        {availableSkins.map((skin) => (
          <button key={skin.id} type="button" className={styles.skin} aria-pressed={skin.id === value} onClick={() => onChange(skin.id)}>
            {skin.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={skin.image} alt="" className={styles.sprite} />
            ) : (
              <span className={styles.sprite} />
            )}
            {skin.label}
          </button>
        ))}
      </div>
    </section>
  );
}
