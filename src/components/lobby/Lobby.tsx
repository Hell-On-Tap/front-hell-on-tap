"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import Avatar from "./Avatar";
import ClansPanel from "./ClansPanel";
import FriendsPanel from "./FriendsPanel";
import InventoryPanel from "./InventoryPanel";
import PlayPanel from "./PlayPanel";
import PlayersPanel from "./PlayersPanel";
import ScoreboardPanel from "./ScoreboardPanel";
import { useFriends } from "./use-friends";
import styles from "./Lobby.module.css";

const TABS = [
  { id: "jogar", label: "Jogar" },
  { id: "inventario", label: "Inventário" },
  { id: "amigos", label: "Amigos" },
  { id: "clas", label: "Clãs" },
  { id: "jogadores", label: "Jogadores" },
  { id: "placar", label: "Placar" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// A aba fica no endereço (/lobby#amigos): dá para mandar o link e o F5 mantém a aba.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
}
function readTab(): TabId {
  const hash = window.location.hash.slice(1);
  return (TABS.find((t) => t.id === hash)?.id ?? "jogar") as TabId;
}
function selectTab(id: TabId) {
  history.replaceState(null, "", id === "jogar" ? window.location.pathname : `#${id}`);
  listeners.forEach((l) => l());
}

export default function Lobby() {
  const hydrated = useHydrated();
  const { status, user, token } = useSession();
  const tab = useSyncExternalStore(subscribe, readTab, () => "jogar" as TabId);
  const friends = useFriends(status === "authed" ? token : null);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  // setas do teclado entre as abas (padrão de tablist)
  function onTabKey(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  // o lobby rola para o topo ao trocar de aba no celular (o conteúdo fica abaixo das abas)
  useEffect(() => {
    if (window.innerWidth < 900) document.getElementById("lobby-panel")?.scrollIntoView({ block: "nearest" });
  }, [tab]);

  if (!hydrated || status === "loading") {
    return (
      <main className={styles.page} aria-busy="true">
        <div className={`${styles.shell} ${styles.loading}`} />
      </main>
    );
  }

  if (status !== "authed" || !user || !token) {
    return (
      <main className={styles.page}>
        <section className={styles.gate}>
          <h1>Lobby</h1>
          <p>Entre na sua conta para escolher o modo, ver seus amigos, clãs e o placar.</p>
          <div className={styles.gateActions}>
            <a href="#entrar" className={styles.primary}>
              Entrar
            </a>
            <a href="#criar-conta" className={styles.ghost}>
              Criar conta
            </a>
          </div>
        </section>
      </main>
    );
  }

  const online = friends.data.friends.filter((f) => f.online);
  const requests = friends.data.incoming.length;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {/* cartão do jogador */}
        <header className={styles.me}>
          <Avatar nickname={user.nickname} avatarUrl={user.avatarUrl} online size="lg" />
          <div className={styles.meText}>
            <p className={styles.meHello}>Bem-vindo de volta</p>
            <h1 className={styles.meName}>{user.nickname}</h1>
            <Link href={`/perfil/${encodeURIComponent(user.nickname)}`} className={styles.meLink}>
              Ver meu perfil
            </Link>
          </div>
          <div className={styles.meStats}>
            <button type="button" onClick={() => selectTab("amigos")}>
              <span className={styles.statValue}>
                {online.length}
                <small>/{friends.data.friends.length}</small>
              </span>
              <span className={styles.statLabel}>Amigos online</span>
            </button>
            <button type="button" onClick={() => selectTab("amigos")} data-alert={requests > 0}>
              <span className={styles.statValue}>{requests}</span>
              <span className={styles.statLabel}>Pedidos de amizade</span>
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          {/* menu do lobby, no estilo do menu principal do CS 1.6 */}
          <nav className={styles.tabs} role="tablist" aria-label="Lobby" aria-orientation="vertical" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="lobby-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className={styles.tab}
                onClick={() => selectTab(t.id)}
              >
                <span className={styles.tabLabel}>{t.label}</span>
                {t.id === "amigos" && requests > 0 && (
                  <span className={styles.badge} aria-label={`${requests} pedido(s)`}>
                    {requests}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <section id="lobby-panel" className={styles.panel} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1}>
            {tab === "jogar" && <PlayPanel token={token} nickname={user.nickname} />}
            {tab === "inventario" && <InventoryPanel />}
            {tab === "amigos" && <FriendsPanel token={token} friends={friends} />}
            {tab === "clas" && <ClansPanel token={token} />}
            {tab === "jogadores" && <PlayersPanel token={token} meId={user.id} friends={friends} />}
            {tab === "placar" && <ScoreboardPanel nickname={user.nickname} />}
          </section>

          {/* amigos online sempre à vista (telas largas) */}
          <aside className={styles.side} aria-labelledby="side-title">
            <div className={styles.sideHead}>
              <h2 id="side-title">Online agora</h2>
              <span className={styles.sideCount}>{online.length}</span>
            </div>
            {online.length ? (
              <ul className={styles.sideList}>
                {online.slice(0, 12).map((f) => (
                  <li key={f.id}>
                    <Link href={`/perfil/${encodeURIComponent(f.nickname)}`} className={styles.sideItem}>
                      <Avatar nickname={f.nickname} avatarUrl={f.avatarUrl} online size="sm" />
                      <span>{f.displayName ?? f.nickname}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sideEmpty}>
                {friends.data.friends.length ? "Nenhum amigo online agora." : "Adicione amigos para vê-los aqui."}
              </p>
            )}
            <button type="button" className={styles.sideMore} onClick={() => selectTab("amigos")}>
              {requests > 0 ? `Ver amigos · ${requests} pedido(s)` : "Ver todos os amigos"}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
