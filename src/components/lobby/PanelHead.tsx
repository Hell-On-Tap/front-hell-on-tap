import styles from "./Lobby.module.css";

/** Título e descrição de cada aba do lobby (com ações opcionais à direita). */
export function PanelHead({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <header className={styles.panelHead}>
      <div>
        <h2>{title}</h2>
        {lead && <p>{lead}</p>}
      </div>
      {children}
    </header>
  );
}
