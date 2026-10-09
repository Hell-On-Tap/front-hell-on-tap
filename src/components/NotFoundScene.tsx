"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./NotFoundScene.module.css";

const RESPAWN_SECONDS = 10;
const MAGAZINE = 30;
const MAX_HOLES = 40;

type Hole = { id: number; x: number; y: number; r: number };

// Brasas subindo: posições fixas (não aleatórias) para o HTML do servidor e do
// navegador baterem.
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
    left: (i * 37) % 100,
    size: 2 + ((i * 7) % 4),
    duration: 6 + ((i * 13) % 7),
    delay: -((i * 11) % 9),
    drift: ((i * 29) % 60) - 30,
}));

// A 404 é gerada estática: o caminho real só existe no navegador.
const noop = () => () => {};
function useBrowserPath() {
    return useSyncExternalStore(
        noop,
        () => window.location.pathname,
        () => "esta página"
    );
}

export default function NotFoundScene() {
    const pathname = useBrowserPath();
    const router = useRouter();
    const [seconds, setSeconds] = useState(RESPAWN_SECONDS);
    const [respawning, setRespawning] = useState(true);
    const [ammo, setAmmo] = useState(MAGAZINE);
    const [reserve, setReserve] = useState(90);
    const [reloading, setReloading] = useState(false);
    const [holes, setHoles] = useState<Hole[]>([]);
    const [shake, setShake] = useState(0);
    const nextId = useRef(0);

    // Contagem para renascer na home
    useEffect(() => {
        if (!respawning) return;
        if (seconds <= 0) {
            router.push("/");
            return;
        }
        const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [seconds, respawning, router]);

    // Recarga automática com o pente vazio
    useEffect(() => {
        if (ammo > 0 || reloading || reserve === 0) return;
        const start = setTimeout(() => setReloading(true), 0);
        const done = setTimeout(() => {
            const take = Math.min(MAGAZINE, reserve);
            setAmmo(take);
            setReserve((r) => r - take);
            setReloading(false);
        }, 1400);
        return () => {
            clearTimeout(start);
            clearTimeout(done);
        };
    }, [ammo, reloading, reserve]);

    function shoot(e: React.PointerEvent<HTMLDivElement>) {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (ammo === 0 || reloading) return;
        setAmmo((a) => a - 1);
        setShake((n) => n + 1);
        const hole: Hole = {
            id: nextId.current++,
            x: e.clientX,
            y: e.clientY,
            r: Math.floor(Math.random() * 360),
        };
        setHoles((h) => [...h.slice(-(MAX_HOLES - 1)), hole]);
    }

    return (
        <div className={styles.scene} onPointerDown={shoot}>
            <div className={styles.bg} aria-hidden="true">
                <Image src="/background.png" alt="" fill sizes="100vw" className={styles.bgImg} />
            </div>
            <div className={styles.damage} aria-hidden="true" />

            <div className={styles.embers} aria-hidden="true">
                {EMBERS.map((e, i) => (
                    <span
                        key={i}
                        style={
                            {
                                left: `${e.left}%`,
                                width: e.size,
                                height: e.size,
                                animationDuration: `${e.duration}s`,
                                animationDelay: `${e.delay}s`,
                                "--drift": `${e.drift}px`,
                            } as React.CSSProperties
                        }
                    />
                ))}
            </div>

            {/* tremor a cada tiro: alterna duas animações iguais para reiniciar sem recriar o conteúdo */}
            <div className={`${styles.shaker} ${shake === 0 ? "" : shake % 2 ? styles.recoilA : styles.recoilB}`}>
                <header className={styles.top}>
                    <Link href="/" className={styles.brand} aria-label="Hell on Tap, início">
                        <Image src="/logo-pixel.png" alt="" width={1254} height={1254} className={styles.brandMark} />
                        HOT
                    </Link>

                    <p className={styles.killfeed} aria-label={`Você foi abatido por ${pathname}`}>
                        <span className={styles.killer}>404</span>
                        <svg className={styles.gun} viewBox="0 0 48 16" aria-hidden="true">
                            <path d="M2 5h30l2-2h6v3h6v3H34l-2 2h-8l-3 4h-5l2-4H8l-2 3H2z" />
                        </svg>
                        <svg className={styles.headshot} viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M8 1a6 6 0 0 0-6 6c0 2 1 3.4 2 4.2V14h2v-2h1v2h2v-2h1v2h2v-2.8c1-.8 2-2.2 2-4.2a6 6 0 0 0-6-6Zm-2.5 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                        </svg>
                        <span className={styles.victim}>{pathname}</span>
                    </p>
                </header>

                <main className={styles.center}>
                    <h1 className={styles.code} data-text="404">
                        404
                    </h1>
                    <p className={styles.title}>Você caiu fora do mapa.</p>
                    <p className={styles.text}>Essa página não existe ou ainda está em construção.</p>

                    <div className={styles.respawn} role="status">
                        {respawning ? (
                            <>
                                Renascendo no spawn em <strong key={seconds}>{seconds}</strong>
                            </>
                        ) : (
                            "Respawn cancelado. Fique à vontade."
                        )}
                    </div>

                    <div className={styles.actions}>
                        <Link href="/" className={styles.primary}>
                            Renascer agora
                        </Link>
                        <Link href="/login" className={styles.secondary}>
                            Entrar
                        </Link>
                        {respawning && (
                            <button type="button" className={styles.cancel} onClick={() => setRespawning(false)}>
                                Cancelar respawn
                            </button>
                        )}
                    </div>
                </main>

                <footer className={styles.hud}>
                    <div className={styles.hp}>
                        <span aria-hidden="true">✚</span> 0
                    </div>
                    <p className={styles.hint}>Atire à vontade enquanto espera.</p>
                    <div className={styles.ammo} aria-label={`Munição: ${ammo} no pente, ${reserve} na reserva`}>
                        {reloading ? (
                            <span className={styles.reloading}>Recarregando</span>
                        ) : (
                            <>
                                <span className={ammo <= 5 ? styles.low : undefined}>{ammo}</span>
                                <span className={styles.bar} aria-hidden="true" />
                                {reserve}
                            </>
                        )}
                    </div>
                </footer>
            </div>

            <div className={styles.holes} aria-hidden="true">
                {holes.map((h) => (
                    <span key={h.id} className={styles.hole} style={{ left: h.x, top: h.y, rotate: `${h.r}deg` }}>
                        <span className={styles.spark} />
                    </span>
                ))}
            </div>
        </div>
    );
}
