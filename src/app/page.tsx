import Image from "next/image";
import Link from "next/link";
import HeroVideo from "@/components/HeroVideo";
import ModeMenu from "@/components/ModeMenu";
import SiteHeader from "@/components/SiteHeader";
import { AuthedOnly, GuestOnly, Nickname, PlayLink } from "@/components/AuthGate";
import { HUD_STATS, SAMPLE_SCOREBOARD } from "@/lib/home-data";
import styles from "./page.module.css";

export default function Home() {

    return (
        <>
            <SiteHeader />

            <main>
                <section className={styles.hero} aria-labelledby="hero-title">
                    <Image src="/background.png" alt="" fill priority sizes="100vw" quality={80} className={styles.heroBg} />
                    <HeroVideo className={styles.heroVideo} />
                    <div className={styles.heroInner}>
                        <h1 id="hero-title" className={styles.title}>
                            <span className={styles.brand} aria-hidden="true">
                                <Image src="/logo-pixel.png" alt="" width={1254} height={1254} className={styles.mark} priority />
                                <span className={styles.logo}>HOT</span>
                            </span>
                            <span className={styles.name}>Hell on Tap</span>
                        </h1>
                        <p className={styles.tagline}>
                            O inferno servido na pressão. FPS retrô no navegador, com a mira do Counter-Strike 1.6 e a cara do Doom.
                        </p>
                        <div className={styles.actions}>
                            <PlayLink className={styles.primary}>Jogar agora</PlayLink>
                            <GuestOnly>
                                <a href="#criar-conta" className={styles.secondary}>
                                    Criar conta
                                </a>
                            </GuestOnly>
                            <AuthedOnly>
                                <Link href="/lobby" className={styles.secondary}>
                                    Abrir lobby
                                </Link>
                            </AuthedOnly>
                        </div>
                        <GuestOnly>
                            <p className={styles.accountNote}>Para jogar é preciso ter uma conta.</p>
                        </GuestOnly>
                        <AuthedOnly>
                            <p className={styles.accountNote}>
                                Conectado como <strong><Nickname /></strong>.
                            </p>
                        </AuthedOnly>
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

                <GuestOnly>
                <section className={styles.join} aria-labelledby="join-title">
                    <h2 id="join-title">Crie sua conta para jogar</h2>
                    <p>Toda partida no Hell on Tap é jogada com conta. Seus frags, mortes e headshots ficam no seu perfil e entram no placar.</p>
                    <div className={styles.joinActions}>
                        <a href="#criar-conta" className={styles.primary}>
                            Criar conta
                        </a>
                        <a href="#entrar" className={styles.textLink}>
                            Já tenho conta
                        </a>
                    </div>
                </section>
                </GuestOnly>
            </main>

            <footer className={styles.footer}>
                <span className={styles.navLogo}>
                    <Image src="/logo-pixel.png" alt="" width={1254} height={1254} className={styles.navMark} />
                    HOT
                </span>
                <p>Hell on Tap, um jogo da 500ml Stories.</p>
            </footer>
        </>
    );
}
