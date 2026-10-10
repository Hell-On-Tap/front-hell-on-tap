"use client";

import { useEffect, useState } from "react";
import { useFriends } from "@/components/lobby/use-friends";
import { AuthError } from "@/lib/auth-api";
import { getRoom, inviteToRoom, updateRoom, type GameRoom, type RoomSettings } from "@/lib/game-api";
import { PrivacyBadge, RoomSettingsFields } from "./RoomSettings";
import styles from "./Rooms.module.css";

/** O que o jogo conta sobre a sala (mensagem `hot:room`). */
export type LiveRoom = {
  code: string;
  isHost: boolean;
  started: boolean;
  players: { id: string; name: string; skin: string; isHost: boolean; you: boolean }[];
};
export type Skin = { id: string; label: string; image: string };

type Props = {
  token: string;
  code: string;
  live: LiveRoom | null;
  skins: Skin[];
  mySkin: string;
  onSkin: (skin: string) => void;
  onStart: () => void;
  onLeave: () => void;
  /** a sala sumiu do servidor */
  onGone: (message: string) => void;
};

/** Sala de espera no site, por cima do jogo: quem está, personagem, convites e "Iniciar". */
export default function WaitingRoom({ token, code, live, skins, mySkin, onSkin, onStart, onLeave, onGone }: Props) {
  const [meta, setMeta] = useState<GameRoom | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoomSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [invited, setInvited] = useState<Record<string, "sending" | "sent">>({});
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const friends = useFriends(token);

  // nome, privacidade e limite vêm do servidor do jogo (o dono pode mudar a qualquer hora)
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getRoom(token, code)
        .then((room) => !cancelled && setMeta(room))
        .catch((err) => {
          if (!cancelled && err instanceof AuthError && err.status === 404) onGone("Esta sala não existe mais.");
        });
    Promise.resolve().then(load);
    const timer = setInterval(load, 4_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, code, onGone]);

  const players = live?.players ?? [];
  const max = meta?.maxPlayers ?? 10;
  const owner = meta?.mine ?? false;
  const host = live?.isHost ?? false;
  const skinOf = (id: string) => skins.find((s) => s.id === id);
  const inRoom = new Set(players.map((p) => p.name.replace(/ \(reconectando\)$/, "").toLowerCase()));
  const friendList = [...friends.data.friends]
    .filter((f) => !inRoom.has(f.nickname.toLowerCase()))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.nickname.localeCompare(b.nickname));

  function openSettings() {
    if (!meta) return;
    setDraft({ name: meta.name, privacy: meta.privacy, maxPlayers: meta.maxPlayers });
    setEditing(true);
    setMessage(null);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const room = await updateRoom(token, code, { ...draft, name: draft.name.trim() });
      setMeta(room);
      setEditing(false);
      setMessage({ kind: "ok", text: "Configurações salvas." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof AuthError ? err.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function invite(userId: string, nickname: string) {
    setInvited((m) => ({ ...m, [userId]: "sending" }));
    setMessage(null);
    try {
      await inviteToRoom(token, code, userId);
      setInvited((m) => ({ ...m, [userId]: "sent" }));
      setMessage({ kind: "ok", text: `Convite enviado para ${nickname}.` });
    } catch (err) {
      setInvited((m) => {
        const next = { ...m };
        delete next[userId];
        return next;
      });
      setMessage({ kind: "error", text: err instanceof AuthError ? err.message : "Não foi possível convidar." });
    }
  }

  function copyLink() {
    const link = `${location.origin}/jogar?modo=online&sala=${code}`;
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setMessage({ kind: "ok", text: `Código da sala: ${code}` }),
    );
  }

  return (
    <div className={styles.waiting} role="region" aria-label="Sala de espera">
      <div className={styles.waitingShell}>
        <header className={styles.waitingHead}>
          <div className={styles.waitingTitle}>
            <span className={styles.eyebrow}>MATA-MATA ONLINE · SALA DE ESPERA</span>
            <h1>{meta?.name ?? "Sala"}</h1>
            <div className={styles.waitingTags}>
              {meta && <PrivacyBadge privacy={meta.privacy} />}
              <span>
                Código <span className={styles.code}>{code}</span>
              </span>
              {meta && <span>· Dono: {meta.owner}</span>}
            </div>
          </div>
          <div className={styles.waitingHeadActions}>
            <button type="button" className={styles.ghost} onClick={copyLink}>
              {copied ? "Link copiado!" : "Copiar convite"}
            </button>
            {owner && !editing && (
              <button type="button" className={styles.ghost} onClick={openSettings}>
                Configurar sala
              </button>
            )}
          </div>
        </header>

        {editing && draft && (
          <form className={`${styles.card} ${styles.settingsCard}`} onSubmit={saveSettings} noValidate>
            <div className={styles.cardHead}>
              <h2>CONFIGURAR SALA</h2>
            </div>
            <RoomSettingsFields value={draft} onChange={setDraft} idPrefix="room-settings" minPlayers={players.length} />
            <div className={styles.dialogActions}>
              <button type="button" className={styles.ghost} onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className={styles.primary} disabled={saving || !draft.name.trim()}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}

        <p className={message?.kind === "error" ? styles.msgError : styles.msgOk} role="status" aria-live="polite">
          {message?.text}
        </p>

        <div className={styles.waitingGrid}>
          <div className={styles.sideStack}>
            <section className={styles.card} aria-labelledby="wr-players">
              <div className={styles.cardHead}>
                <h2 id="wr-players">JOGADORES</h2>
                <span>
                  {players.length}/{max}
                </span>
              </div>
              <ul className={styles.players}>
                {players.map((p) => {
                  const skin = skinOf(p.skin);
                  return (
                    <li key={p.id} className={styles.player} data-you={p.you}>
                      {skin?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={skin.image} alt="" className={styles.sprite} />
                      ) : (
                        <span className={styles.sprite} />
                      )}
                      <span className={styles.playerText}>
                        <span className={styles.playerName}>{p.name}</span>
                        <span className={styles.playerTags}>
                          {[p.isHost && "ANFITRIÃO", p.you && "VOCÊ"].filter(Boolean).join(" · ") || skin?.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
                {Array.from({ length: Math.max(0, max - players.length) }, (_, i) => (
                  <li key={`slot-${i}`} className={styles.slot}>
                    vaga livre
                  </li>
                ))}
              </ul>
            </section>

            {skins.length > 0 && (
              <section className={styles.card} aria-labelledby="wr-skin">
                <div className={styles.cardHead}>
                  <h2 id="wr-skin">SEU PERSONAGEM</h2>
                  <span>{skinOf(mySkin)?.label}</span>
                </div>
                <div className={styles.skins} role="group" aria-labelledby="wr-skin">
                  {skins.map((s) => (
                    <button key={s.id} type="button" className={styles.skin} aria-pressed={s.id === mySkin} onClick={() => onSkin(s.id)}>
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt="" className={styles.sprite} />
                      ) : (
                        <span className={styles.sprite} />
                      )}
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <section className={styles.card} aria-labelledby="wr-friends">
            <div className={styles.cardHead}>
              <h2 id="wr-friends">CONVIDAR AMIGOS</h2>
              <span>{friendList.filter((f) => f.online).length} online</span>
            </div>
            {!friends.loaded ? (
              <p className={styles.empty}>Carregando amigos…</p>
            ) : friendList.length ? (
              <ul className={styles.friendRows}>
                {friendList.map((f) => {
                  const state = invited[f.id];
                  return (
                    <li key={f.id} className={styles.friendRow}>
                      <span>
                        {f.displayName ?? f.nickname}
                        <small data-online={f.online}>{f.online ? "Online" : `@${f.nickname} · offline`}</small>
                      </span>
                      <button
                        type="button"
                        className={state === "sent" ? styles.smallGhost : styles.small}
                        disabled={!!state || players.length >= max}
                        onClick={() => invite(f.id, f.nickname)}
                      >
                        {state === "sent" ? "Convidado" : state === "sending" ? "Enviando…" : "Convidar"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>
                {friends.data.friends.length
                  ? "Todos os seus amigos já estão na sala."
                  : "Você ainda não tem amigos adicionados. Copie o convite e mande o link."}
              </p>
            )}
          </section>
        </div>

        <div className={styles.startBar}>
          <button type="button" className={styles.ghost} onClick={onLeave}>
            Sair da sala
          </button>
          <p>
            {host ? (
              <>
                <strong>Você é o anfitrião.</strong> Inicie quando a galera estiver pronta; quem entrar depois cai direto na partida.
              </>
            ) : (
              <>
                Aguardando <strong>{players.find((p) => p.isHost)?.name ?? meta?.owner ?? "o anfitrião"}</strong> iniciar a
                partida…
              </>
            )}
          </p>
          {host && (
            <button
              type="button"
              className={`${styles.primary} ${styles.startButton}`}
              disabled={starting}
              onClick={() => {
                setStarting(true);
                onStart();
                setTimeout(() => setStarting(false), 3000);
              }}
            >
              {starting ? "Iniciando…" : "Iniciar partida"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
