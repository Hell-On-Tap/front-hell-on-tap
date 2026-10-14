import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Atualizações | Hell on Tap",
  description: "Notas de atualização e novidades do Hell on Tap.",
};

interface Release {
  version: string;
  badge: string;
  intro: string;
  changes: { title: string; description: string }[];
}

const releases: Release[] = [
  {
    version: "1.1.0",
    badge: "NOVA VERSÃO",
    intro:
      "Esta versão traz a integração de bots ao modo Casual 5v5 com IA tática realista, áudio espacial balanceado, melhorias essenciais no sistema de drop e coleta, além de grandes otimizações de conectividade e desempenho.",
    changes: [
      {
        title: "Bots no Casual 5v5",
        description:
          "Agora é possível preencher vagas na sala de espera com bots. O anfitrião pode adicionar bots em qualquer equipe com um clique no botão +, escolher entre quatro níveis de dificuldade (Fácil, Médio, Difícil e Perito) ou removê-los a qualquer momento.",
      },
      {
        title: "Inteligência Artificial e Reação Tática",
        description:
          "Os bots não utilizam radar ou visão através de paredes. Eles exploram e patrulham o mapa de forma autônoma e só detectam adversários dentro de seu campo de visão natural (~170°) ou ao ouvir passos e disparos. Além disso, não enxergam através de cortinas de fumaça (smokes) e ficam completamente cegos e desorientados quando atingidos por flashbangs.",
      },
      {
        title: "Locomoção, Afastamento de Paredes e Navegação dos Bots",
        description:
          "Implementamos afastamento preventivo de paredes (whisker/feeler steering) e verificação de passagem com o volume do jogador nos waypoints. Os bots agora mantêm uma distância segura das paredes e esquinas, navegam centralizados por portas e corredores sem raspar ou bater nas paredes, e não pulam mais contra paredes ou caixas altas que não conseguem subir, desviando de forma suave e inteligente.",
      },
      {
        title: "Fechamento Automático de Salas",
        description:
          "Salas do Casual 5v5 que contenham apenas bots são fechadas automaticamente assim que o último jogador humano se desconecta ou sai, liberando recursos do servidor.",
      },
      {
        title: "Câmeras e Áudio 3D do Modo Espectador",
        description:
          "Expandimos o modo espectador nas partidas online e 5v5: além da visão em primeira pessoa, jogadores eliminados podem alternar entre a câmera orbital em terceira pessoa (girando livremente com o mouse) e a câmera livre (noclip) controlada por WASD, com posicionamento e espacialização do áudio 3D acompanhando a câmera livre em tempo real.",
      },
      {
        title: "Física de Drop e Coleta de Armas e Granadas",
        description:
          "Todas as armas e granadas (HE, Flashbang e Smoke) agora podem ser dropadas no chão pressionando G. Corrigimos a física de quique contínuo e habilitamos a coleta tanto passando por cima com espaço livre quanto mirando no item caído e pressionando E à distância.",
      },
      {
        title: "Otimização de Desempenho e Latência (Ping)",
        description:
          "Otimizamos os cálculos de raycast de visão e navegação dos bots no servidor, eliminando a sobrecarga de CPU no loop de eventos e mantendo o ping da sala baixo e estável mesmo com múltiplos bots simultâneos.",
      },
      {
        title: "Exibição de Ping de Todos os Jogadores no TAB",
        description:
          "O placar (TAB) agora sincroniza e exibe o ping de todos os jogadores conectados em tempo real. Bots são identificados com a etiqueta 'BOT' na coluna de ping.",
      },
      {
        title: "Transição para Casual 5v5",
        description:
          "Renomeamos o modo para Casual 5v5 em toda a interface do jogo e do site, preparando o ecossistema para a futura introdução do modo competitivo com ranking.",
      },
      {
        title: "Áudio Espacial e Tiros dos Bots",
        description:
          "Restauramos os efeitos sonoros dos tiros e facadas dos bots nas partidas online, com espacialização 3D HRTF, raio auditivo expandido (28 metros) e volume calibrado para não sobrecarregar os fones de ouvido.",
      },
    ],
  },
  {
    version: "1.0.9",
    badge: "ATUALIZAÇÃO",
    intro:
      "Esta versão melhora a experiência de espectador e corrige o fluxo de drop e coleta de equipamentos nas partidas.",
    changes: [
      {
        title: "Câmeras de espectador",
        description:
          "Alterne entre a visão em primeira pessoa, câmera em terceira pessoa e câmera livre. Na câmera livre, mova-se com WASD na direção da mira e volte a acompanhar o jogador com Espaço.",
      },
      {
        title: "Armas e itens no chão",
        description:
          "Ajustamos o drop e a coleta para respeitar os espaços de arma disponíveis. No casual 5v5, jogadores eliminados podem deixar armas, granadas e itens de objetivo para a equipe correta recolher.",
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
    ],
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

          {releases.map((release) => (
            <article key={release.version} className={styles.release}>
              <header className={styles.releaseHeader}>
                <div>
                  <p className={styles.label}>NOTAS DO PATCH</p>
                  <h2>
                    Hell on Tap <span>{release.version}</span>
                  </h2>
                </div>
                <span className={styles.badge}>{release.badge}</span>
              </header>

              <p className={styles.releaseIntro}>{release.intro}</p>

              <ul className={styles.changes}>
                {release.changes.map((change) => (
                  <li key={change.title}>
                    <span className={styles.bullet} aria-hidden="true">
                      +
                    </span>
                    <div>
                      <h3>{change.title}</h3>
                      <p>{change.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <footer className={styles.releaseFooter}>
                <span>HELL ON TAP</span>
                <span>VERSÃO {release.version}</span>
              </footer>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
