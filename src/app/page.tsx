import Link from "next/link";
import ModeMenu from "@/components/ModeMenu";
import MusicPlayer from "@/components/MusicPlayer";
import { getPlaylist } from "@/lib/playlist";
import { GAME_URL, HUD_STATS, SAMPLE_SCOREBOARD } from "@/lib/home-data";
import styles from "./page.module.css";

export default async function Home() {
  const playlist = await getPlaylist();

  return (
    <>
      <header className={styles.nav}>
        <Link href="/" className={styles.navLogo} aria-label="Hell on Tap, início">
          HOT
        </Link>
        <nav className={styles.navLinks} aria-label="Principal">
          <a href="#modos">Modos</a>
          <a href="#placar">Placar</a>
          <Link href="/login">Entrar</Link>
          <Link href="/registro" className={styles.navCta}>
            Criar conta
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroInner}>
            <h1 id="hero-title" className={styles.title}>
              <span className={styles.logo} aria-hidden="true">
                HOT
              </span>
              <span className={styles.name}>Hell on Tap</span>
            </h1>
            <p className={styles.tagline}>
              O inferno servido na pressão. FPS retrô no navegador, com a mira
              do Counter-Strike 1.6 e a cara do Doom.
            </p>
            <div className={styles.actions}>
              <a href={GAME_URL} className={styles.primary}>
                Jogar agora
              </a>
              <Link href="/registro" className={styles.secondary}>
                Criar conta
              </Link>
            </div>
          </div>

          <div className={styles.crosshair} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <dl className={styles.hud}>
            {HUD_STATS.map((s) => (
              <div key={s.label} className={styles.hudItem}>
                <dt className={styles.hudLabel}>{s.label}</dt>
                <dd className={styles.hudValue}>
                  <span className={styles.hudIcon} aria-hidden="true">
                    {s.icon}
                  </span>
                  {s.value}
                </dd>
              </div>
            ))}
            <div className={`${styles.hudItem} ${styles.hudAmmo}`}>
              <dt className={styles.hudLabel}>servidor | snapshots</dt>
              <dd className={styles.hudValue}>
                60<small>Hz</small>
                <span className={styles.hudBar} aria-hidden="true" />
                20<small>Hz</small>
              </dd>
            </div>
          </dl>
        </section>

        <section id="modos" className={styles.section} aria-labelledby="modos-title">
          <div className={styles.sectionHead}>
            <h2 id="modos-title">Escolha o modo</h2>
            <p className={styles.keysHint}>Use as teclas 1, 2 e 3, como no menu de compra.</p>
          </div>
          <ModeMenu />
        </section>

        <section id="placar" className={styles.section} aria-labelledby="placar-title">
          <div className={styles.sectionHead}>
            <h2 id="placar-title">Placar da semana</h2>
            <p>Prévia com dados de exemplo. O placar real virá da API.</p>
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
                  <th scope="col">Ping</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_SCOREBOARD.map((p, i) => (
                  <tr key={p.name}>
                    <td>{i + 1}</td>
                    <td className={styles.player}>{p.name}</td>
                    <td>{p.frags}</td>
                    <td>{p.deaths}</td>
                    <td>{p.hs}</td>
                    <td>{p.ping}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.join} aria-labelledby="join-title">
          <h2 id="join-title">Guarde cada frag</h2>
          <p>
            Com uma conta, suas partidas, frags, mortes e headshots ficam
            registrados e entram no placar.
          </p>
          <Link href="/registro" className={styles.primary}>
            Criar conta
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.navLogo}>HOT</span>
        <p>Hell on Tap, um jogo da 500ml Stories.</p>
      </footer>

      <MusicPlayer tracks={playlist} />
    </>
  );
}
