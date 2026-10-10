import { PanelHead } from "./PanelHead";
import styles from "./Lobby.module.css";

/** Placar: a API ainda não registra partidas, então mostra a tabela vazia. */
export default function ScoreboardPanel({ nickname }: { nickname: string }) {
  return (
    <>
      <PanelHead title="Placar" lead="Ranking dos jogadores. Os números entram quando as partidas começarem a ser registradas." />
      <div className={styles.segmented} role="group" aria-label="Período">
        <button type="button" aria-pressed="true">
          Semana
        </button>
        <button type="button" aria-pressed="false" disabled>
          Geral
        </button>
      </div>
      <div className={styles.board}>
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Jogador</th>
              <th scope="col">Frags</th>
              <th scope="col">Mortes</th>
              <th scope="col">HS %</th>
              <th scope="col">Partidas</th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.boardMe}>
              <td>—</td>
              <td>{nickname} (você)</td>
              <td>0</td>
              <td>0</td>
              <td>—</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.boardEmpty}>Nenhuma partida registrada ainda. Jogue uma para aparecer no placar.</p>
      </div>
    </>
  );
}
