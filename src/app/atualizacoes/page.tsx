import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Atualizações | Hell on Tap",
  description: "Notas de atualização e novidades do Hell on Tap.",
};

const changes = [
  {
    title: "Câmeras de espectador",
    description:
      "Alterne entre a visão em primeira pessoa, câmera em terceira pessoa e câmera livre. Na câmera livre, mova-se com WASD na direção da mira e volte a acompanhar o jogador com Espaço.",
  },
  {
    title: "Armas e itens no chão",
    description:
      "Ajustamos o drop e a coleta para respeitar os espaços de arma disponíveis. No competitivo, jogadores eliminados podem deixar armas, granadas e itens de objetivo para a equipe correta recolher.",
  },
  {
    title: "Regras de coleta por equipe",
    description:
      "Terroristas podem recolher a C4; o kit de desarme fica disponível apenas para Contra-Terroristas. Armas no chão permanecem visíveis quando o jogador já ocupa aquele espaço.",
  },
  {
    title: "Correção de troca de armas",
    description:
      "Corrigimos a sincronização dos espaços de arma para evitar que uma arma comprada desapareça ou seja substituída ao passar por cima de um item dropado.",
  },
  {
    title: "Spray de parede",
    description:
      "Adicionamos o spray com a imagem 8bitlogo.png. Pressione T para aplicá-lo no ponto mirado, na parede ou no chão; o desenho desaparece depois de um tempo e conta com efeito sonoro.",
  },
];

export default function UpdatesPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className={styles.scanlines} aria-hidden="true" />
        <section className={styles.content} aria-labelledby="updates-title">
          <p className={styles.eyebrow}>CENTRAL DE TRANSMISSÃO</p>
          <h1 id="updates-title">Atualizações</h1>
          <p className={styles.intro}>
            Acompanhe as mudanças e melhorias do Hell on Tap.
          </p>

          <article className={styles.release}>
            <header className={styles.releaseHeader}>
              <div>
                <p className={styles.label}>NOTAS DO PATCH</p>
                <h2>Hell on Tap <span>1.0.9</span></h2>
              </div>
              <span className={styles.badge}>ATUALIZAÇÃO</span>
            </header>

            <p className={styles.releaseIntro}>
              Esta versão melhora a experiência de espectador e corrige o fluxo de drop e coleta de equipamentos nas partidas.
            </p>

            <ul className={styles.changes}>
              {changes.map((change) => (
                <li key={change.title}>
                  <span className={styles.bullet} aria-hidden="true">+</span>
                  <div>
                    <h3>{change.title}</h3>
                    <p>{change.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <footer className={styles.releaseFooter}>
              <span>HELL ON TAP</span>
              <span>VERSÃO 1.0.9</span>
            </footer>
          </article>
        </section>
      </main>
    </>
  );
}
