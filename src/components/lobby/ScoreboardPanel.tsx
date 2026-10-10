"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hours, hsRate, kd, leaderboard, STATS_MODES, type LeaderRow, type StatsMode } from "@/lib/stats-api";
import { PanelHead } from "./PanelHead";
import styles from "./Lobby.module.css";

/** Placar geral por modo: mais abates primeiro. Só partidas online contam. */
export default function ScoreboardPanel({ nickname }: { nickname: string }) {
  const [mode, setMode] = useState<StatsMode>("deathmatch");
  const [rows, setRows] = useState<Record<string, LeaderRow[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    leaderboard(mode)
      .then((r) => {
        if (cancelled) return;
        setRows((all) => ({ ...all, [mode]: r.players }));
        setError("");
      })
      .catch(() => !cancelled && setError("Não foi possível carregar o placar."));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const list = rows[mode];
  const me = nickname.toLowerCase();

  return (
    <>
      <PanelHead title="Placar" lead="Ranking por modo, com os abates das partidas online. O treino com bots não conta." />
      <div className={styles.segmented} role="group" aria-label="Modo">
        {STATS_MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
            {m.soon ? " (em breve)" : ""}
          </button>
        ))}
      </div>
      {error && <p className={styles.msgError}>{error}</p>}
      <div className={styles.board}>
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Jogador</th>
              <th scope="col">Abates</th>
              <th scope="col">Mortes</th>
              <th scope="col">K/D</th>
              <th scope="col">HS %</th>
              <th scope="col">Horas</th>
            </tr>
          </thead>
          <tbody>
            {(list ?? []).map((r, i) => (
              <tr key={r.id} className={r.nickname.toLowerCase() === me ? styles.boardMe : undefined}>
                <td>{i + 1}</td>
                <td>
                  <Link href={`/perfil/${encodeURIComponent(r.nickname)}`}>{r.displayName ?? r.nickname}</Link>
                  {r.nickname.toLowerCase() === me && " (você)"}
                </td>
                <td>{r.kills}</td>
                <td>{r.deaths}</td>
                <td>{kd(r)}</td>
                <td>{hsRate(r)}</td>
                <td>{hours(r.playSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list && !list.length && (
          <p className={styles.boardEmpty}>
            {mode === "competitive" ? "O 5x5 ainda não está disponível." : "Ninguém no placar ainda. Jogue uma partida online para aparecer aqui."}
          </p>
        )}
        {!list && !error && <p className={styles.boardEmpty}>Carregando…</p>}
      </div>
    </>
  );
}
