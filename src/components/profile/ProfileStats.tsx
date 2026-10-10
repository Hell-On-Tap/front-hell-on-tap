"use client";

import { useEffect, useState } from "react";
import { hsRate, kd, playTime, profileStats, STATS_MODES, type ModeStats, type StatsMode } from "@/lib/stats-api";
import styles from "./ProfileStats.module.css";

/**
 * Estatísticas do perfil, uma aba por modo (Mata-mata, 5x5). Só partidas online
 * contam; o treino com bots fica de fora. Busca na hora (os números mudam a cada partida).
 */
export default function ProfileStats({ nickname }: { nickname: string }) {
  const [mode, setMode] = useState<StatsMode>("deathmatch");
  const [data, setData] = useState<Record<StatsMode, ModeStats> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileStats(nickname)
      .then((r) => !cancelled && setData(r.modes))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [nickname]);

  const s = data?.[mode];
  const items = s
    ? [
        { label: "Abates", value: s.kills.toLocaleString("pt-BR") },
        { label: "Mortes", value: s.deaths.toLocaleString("pt-BR") },
        { label: "K/D", value: kd(s) },
        { label: "Headshots", value: hsRate(s) },
        { label: "Tempo de jogo", value: playTime(s.playSeconds) },
      ]
    : ["Abates", "Mortes", "K/D", "Headshots", "Tempo de jogo"].map((label) => ({ label, value: "—" }));
  const empty = s && !s.kills && !s.deaths && !s.playSeconds;

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Modo">
        {STATS_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={styles.tab}
            onClick={() => setMode(m.id)}
          >
            {m.label}
            {m.soon && <span className={styles.soon}>em breve</span>}
          </button>
        ))}
      </div>
      <dl className={styles.grid} role="tabpanel" aria-busy={!data && !failed}>
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd data-small={item.label === "Tempo de jogo"}>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        {failed
          ? "Não foi possível carregar as estatísticas agora."
          : mode === "competitive"
            ? "O 5x5 ainda não está disponível. Os números aparecem aqui quando o modo abrir."
            : empty
              ? "Ainda sem partidas online. O treino com bots não conta."
              : "Partidas online de mata-mata. O treino com bots não conta."}
      </p>
    </>
  );
}
