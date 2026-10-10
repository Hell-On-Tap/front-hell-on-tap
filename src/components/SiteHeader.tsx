"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { setPlayerMode, usePlayerMode, usePlayerPlaying } from "@/lib/player-store";
import { imageUrl } from "@/lib/profile-api";
import { useSession } from "@/lib/session";
import { myInvites } from "@/lib/clan-api";
import { FRIENDS_CHANGED, myFriends } from "@/lib/friends-api";
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
    const { status, user, signOut, token } = useSession();
    const playerOpen = usePlayerMode() === "open";
    const playing = usePlayerPlaying();
    const [inviteCount, setInvites] = useState(0);
    const [requestCount, setRequests] = useState(0);
    // sem login, nada de convites nem pedidos
    const invites = token ? inviteCount : 0;
    const friendRequests = token ? requestCount : 0;

    // convites de clã recebidos (atualiza ao voltar para a aba e quando um convite é respondido)
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        const load = () =>
            myInvites(token)
                .then((list) => !cancelled && setInvites(list.length))
                .catch(() => {});
        // pedidos de amizade recebidos (contador do link Lobby)
        const loadFriends = () =>
            myFriends(token)
                .then((f) => !cancelled && setRequests(f.incoming.length))
                .catch(() => {});
        const loadAll = () => {
            load();
            loadFriends();
        };
        loadAll();
        const timer = setInterval(loadFriends, 60_000);
        window.addEventListener("focus", loadAll);
        window.addEventListener("hot:invites-changed", load);
        window.addEventListener(FRIENDS_CHANGED, loadFriends);
        return () => {
            cancelled = true;
            clearInterval(timer);
            window.removeEventListener("focus", loadAll);
            window.removeEventListener("hot:invites-changed", load);
            window.removeEventListener(FRIENDS_CHANGED, loadFriends);
        };
    }, [token]);
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
                <span className={styles.logoText}>HOT</span>
            </Link>

            <nav className={styles.links} aria-label="Principal">
                {status === "authed" ? (
                    <Link href="/lobby" className={styles.clans}>
                        Lobby
                        {friendRequests > 0 && (
                            <span className={styles.inviteBadge} aria-label={`${friendRequests} pedido(s) de amizade`}>
                                {friendRequests}
                            </span>
                        )}
                    </Link>
                ) : (
                    <>
                        <Link href="/#modos" className={styles.section}>
                            Modos
                        </Link>
                        <Link href="/#placar" className={styles.section}>
                            Placar
                        </Link>
                    </>
                )}
                <Link href="/clans" className={styles.clans}>
                    Clãs
                    {invites > 0 && (
                        <span className={styles.inviteBadge} aria-label={`${invites} convite(s) de clã`}>
                            {invites}
                        </span>
                    )}
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
                <button
                    type="button"
                    className={`${styles.fullscreen} ${styles.music}`}
                    onClick={() => setPlayerMode(playerOpen ? "hidden" : "open")}
                    aria-label={playerOpen ? "Ocultar player de música" : "Mostrar player de música"}
                    aria-pressed={playerOpen}
                    title={playerOpen ? "Ocultar player" : "Mostrar player"}
                    data-playing={playing}
                >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M6 2h8v9.5a2.5 2.5 0 1 1-2-2.45V5H8v7.5A2.5 2.5 0 1 1 6 10.05z" />
                    </svg>
                    {/* equalizador: aparece enquanto a música toca */}
                    <span className={styles.eq} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                    </span>
                </button>
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
