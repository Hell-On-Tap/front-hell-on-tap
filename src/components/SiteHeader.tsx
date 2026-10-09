"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { imageUrl } from "@/lib/profile-api";
import { useSession } from "@/lib/session";
import styles from "./SiteHeader.module.css";

// ---- tela cheia: estado vem do próprio navegador ----
function subscribeFullscreen(cb: () => void) {
    document.addEventListener("fullscreenchange", cb);
    return () => document.removeEventListener("fullscreenchange", cb);
}
const noop = () => () => {};

function toggleFullscreen() {
    if (document.fullscreenElement) {
        void document.exitFullscreen();
    } else {
        void document.documentElement.requestFullscreen().catch(() => {
            /* navegador recusou (ex.: sem interação); nada a fazer */
        });
    }
}

export default function SiteHeader() {
    const { status, user, signOut } = useSession();
    const [scrolled, setScrolled] = useState(false);
    const isFullscreen = useSyncExternalStore(
        subscribeFullscreen,
        () => !!document.fullscreenElement,
        () => false
    );
    // iPhone não tem a API de tela cheia: o botão some lá
    const canFullscreen = useSyncExternalStore(
        noop,
        () => document.fullscreenEnabled,
        () => true
    );

    // fundo do menu aparece depois que a página começa a rolar
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // atalho: tecla F
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key !== "f" && e.key !== "F") return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
            toggleFullscreen();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <header className={styles.header} data-scrolled={scrolled}>
            <Link href="/" className={styles.logo} aria-label="Hell on Tap, início">
                <Image src="/logo-pixel.png" alt="" width={1254} height={1254} className={styles.mark} priority />
                HOT
            </Link>

            <nav className={styles.links} aria-label="Principal">
                <Link href="/#modos" className={styles.section}>
                    Modos
                </Link>
                <Link href="/#placar" className={styles.section}>
                    Placar
                </Link>
                {status === "guest" && (
                    <>
                        <a href="#entrar">Entrar</a>
                        <a href="#criar-conta" className={styles.cta}>
                            Criar conta
                        </a>
                    </>
                )}
                {status === "authed" && user && (
                    <>
                        <Link
                            href={`/perfil/${encodeURIComponent(user.nickname)}`}
                            className={styles.user}
                            title="Meu perfil"
                        >
                            {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imageUrl(user.avatarUrl)!} alt="" className={styles.userAvatar} />
                            ) : (
                                <span className={styles.userDot} aria-hidden="true" />
                            )}
                            {user.nickname}
                        </Link>
                        <button type="button" className={styles.logout} onClick={signOut}>
                            Sair
                        </button>
                    </>
                )}
                {canFullscreen && (
                    <button
                        type="button"
                        className={styles.fullscreen}
                        onClick={toggleFullscreen}
                        aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                        aria-pressed={isFullscreen}
                        title={isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
                    >
                        {isFullscreen ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M9 4v5H4v2h7V4zM15 4v7h7V9h-5V4zM4 13v2h5v5h2v-7zM13 13v7h2v-5h5v-2z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 3h7v2H5v5H3zM14 3h7v7h-2V5h-5zM3 14h2v5h5v2H3zM19 14h2v7h-7v-2h5z" />
                            </svg>
                        )}
                    </button>
                )}
            </nav>
        </header>
    );
}
