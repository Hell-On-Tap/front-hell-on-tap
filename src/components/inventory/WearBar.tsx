import { WEAR_TIERS } from "@/lib/inventory";
import styles from "./Inventory.module.css";

/** Barra do desgaste (float) no estilo do CS: faixas coloridas e um marcador no valor. */
export default function WearBar({ wear, compact = false }: { wear: number; compact?: boolean }) {
  const tier = WEAR_TIERS.find((t) => wear < t.max) ?? WEAR_TIERS[WEAR_TIERS.length - 1];
  return (
    <span className={compact ? `${styles.wear} ${styles.wearCompact}` : styles.wear}>
      <span className={styles.wearTrack} role="img" aria-label={`Desgaste ${wear.toFixed(4)} (${tier.label})`}>
        {WEAR_TIERS.map((t, i) => {
          const width = (t.max - (i ? WEAR_TIERS[i - 1].max : 0)) * 100;
          return <span key={t.short} className={styles.wearZone} data-zone={i} style={{ width: `${width}%` }} />;
        })}
        <span className={styles.wearMark} style={{ left: `${Math.min(100, wear * 100)}%` }} />
      </span>
      {!compact && (
        <span className={styles.wearText}>
          <strong>{tier.label}</strong> · {wear.toFixed(6)}
        </span>
      )}
    </span>
  );
}
