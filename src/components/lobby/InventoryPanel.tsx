import { PanelHead } from "./PanelHead";
import styles from "./Lobby.module.css";

const CATEGORIES = ["Armas", "Skins", "Personagens", "Sprays"];

/** Inventário ainda não definido: mostra o espaço reservado, sem prometer itens. */
export default function InventoryPanel() {
  return (
    <>
      <PanelHead title="Inventário" lead="Seus itens vão aparecer aqui. O inventário ainda está sendo definido." />
      <div className={styles.chips} aria-hidden="true">
        {CATEGORIES.map((c) => (
          <span key={c} className={styles.chip}>
            {c}
          </span>
        ))}
      </div>
      <div className={styles.inventory}>
        <ul className={styles.slots} aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <li key={i} className={styles.slot}>
              <svg viewBox="0 0 16 16">
                <path d="M5 7V5a3 3 0 0 1 6 0v2h1v7H4V7zm2 0h2V5a1 1 0 0 0-2 0z" />
              </svg>
            </li>
          ))}
        </ul>
        <p className={styles.inventoryNote}>
          <strong>Em breve</strong>
          Armas, skins, personagens e sprays entram aqui quando o sistema de itens estiver pronto.
        </p>
      </div>
    </>
  );
}
