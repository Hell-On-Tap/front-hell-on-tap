"use client";

import { useEffect, useState } from "react";
import { useFriends } from "@/components/lobby/use-friends";
import { AuthError } from "@/lib/auth-api";
import { DEFAULT_MAP, DEFAULT_RULES, getRoom, inviteToRoom, mapInfo, MODES, updateRoom, type GameRoom, type RoomSettings } from "@/lib/game-api";
import type { GameTeam, Skin } from "@/lib/game-bridge";
import { PrivacyBadge, RoomSettingsFields } from "./RoomSettings";
import SkinPicker from "./SkinPicker";
import styles from "./Rooms.module.css";

/** O que o jogo conta sobre a sala (mensagem `hot:room`). */
export type LiveRoom = {
  code: string;
  isHost: boolean;
  started: boolean;
  /** `team` só no 5x5 (t = Terroristas, ct = Contra-Terroristas) */
  players: { id: string; name: string; skin: string; isHost: boolean; you: boolean; team?: string }[];
};

type Props = {
  token: string;
  code: string;
  live: LiveRoom | null;
  skins: Skin[];
  mySkin: string;
  onSkin: (skin: string) => void;
  onTeam: (team: GameTeam) => void;
  teamError: string | null;
  onStart: () => void;
  onLeave: () => void;
  /** a sala sumiu do servidor */
  onGone: (message: string) => void;
};

/** Sala de espera no site, por cima do jogo: quem está, personagem, convites e "Iniciar". */
export default function WaitingRoom({ token, code, live, skins, mySkin, onSkin, onTeam, teamError, onStart, onLeave, onGone }: Props) {
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
  const me = players.find((player) => player.you);
  const myTeam = me?.team === "t" || me?.team === "ct" ? me.team : undefined;
  const max = meta?.maxPlayers ?? 10;
  const owner = meta?.mine ?? false;
  const host = live?.isHost ?? false;
  const skinOf = (id: string) => skins.find((s) => s.id === id);
  const skinForTeam = (team: GameTeam, id: string) => {
    const allowed = team === "t"
      ? ["cs_terror", "cs_leet", "cs_arctic", "cs_guerilla"]
      : ["cs_urban", "cs_gsg9", "cs_sas", "cs_gign"];
    return skinOf(allowed.includes(id) ? id : allowed[0]);
  };
  const inRoom = new Set(players.map((p) => p.name.replace(/ \(reconectando\)$/, "").toLowerCase()));
  const friendList = [...friends.data.friends]
    .filter((f) => !inRoom.has(f.nickname.toLowerCase()))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.nickname.localeCompare(b.nickname));

  function openSettings() {
    if (!meta) return;
    setDraft({
      name: meta.name,
      privacy: meta.privacy,
      maxPlayers: meta.maxPlayers,
      map: meta.map ?? DEFAULT_MAP,
      mode: meta.mode ?? "deathmatch",
      rules: { ...DEFAULT_RULES, ...meta.rules },
    });
    setEditing(true);
    setMessage(null);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      // regras só no 5x5 (o servidor não deixa mudar modo e regras depois que a partida começa)
      const { rules, ...rest } = draft;
      const room = await updateRoom(token, code, { ...rest, name: draft.name.trim(), ...(draft.mode === "competitive" ? { rules } : {}) });
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

  function renderPlayer(p: LiveRoom["players"][number], team?: GameTeam) {
    const skin = team ? skinForTeam(team, p.skin) : skinOf(p.skin);
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
  }

  return (
    <div className={styles.waiting} role="region" aria-label="Sala de espera">
      <div className={styles.waitingShell}>
        <header className={styles.waitingHead}>
          <div className={styles.waitingTitle}>
            <span className={styles.eyebrow}>{MODES[meta?.mode ?? "deathmatch"].label.toUpperCase()} ONLINE · SALA DE ESPERA</span>
            <h1>{meta?.name ?? "Sala"}</h1>
            <div className={styles.waitingTags}>
              {meta && <PrivacyBadge privacy={meta.privacy} />}
              <span>
                Código <span className={styles.code}>{code}</span>
              </span>
              {meta && <span>· Mapa: {mapInfo(meta.map).name}</span>}
              {meta?.mode === "competitive" && meta.rules && (
                <span>
                  · {meta.rules.maxRounds} rodadas · ${meta.rules.startMoney} inicial · rodada de {Math.round(meta.rules.roundTime)} s
                </span>
              )}
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
            {meta?.mode === "competitive" && (
              <section className={styles.card} aria-labelledby="wr-players">
                <div className={styles.cardHead}>
                  <h2 id="wr-players">ESCOLHA SUA EQUIPE</h2>
                  <span>{players.length}/{max}</span>
                </div>
                {teamError && <p className={styles.msgError} role="alert">{teamError}</p>}
                <div className={styles.teamGrid}>
                  {([
                    { id: "t", label: "TERRORISTAS" },
                    { id: "ct", label: "CONTRA-TERRORISTAS" },
                  ] as const).map(({ id, label }) => {
                    const members = players.filter((player) => player.team === id);
                    const onThisTeam = myTeam === id;
                    const full = members.length >= 5;
                    const cannotJoin = (!onThisTeam && (full || players.length >= max && !myTeam));
                    return (
                      <section key={id} className={styles.teamCard} data-team={id} aria-label={label}>
                        <div className={styles.teamHead}>
                          <div>
                            <h3>{label}</h3>
                            <span>{members.length}/5 JOGADORES</span>
                          </div>
                          <button
                            type="button"
                            className={onThisTeam ? styles.smallGhost : styles.small}
                            disabled={onThisTeam || cannotJoin}
                            onClick={() => onTeam(id)}
                          >
                            {onThisTeam ? "SEU TIME" : "ENTRAR"}
                          </button>
                        </div>
                        <ul className={styles.teamPlayers}>
                          {members.map((player) => renderPlayer(player, id))}
                          {Array.from({ length: Math.max(0, 5 - members.length) }, (_, index) => (
                            <li key={`${id}-slot-${index}`} className={styles.slot}>VAGA LIVRE</li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </section>
            )}
            {meta?.mode !== "competitive" && (
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
                          {[p.team === "t" ? "TR" : p.team === "ct" ? "CT" : "", p.isHost && "ANFITRIÃO", p.you && "VOCÊ"].filter(Boolean).join(" · ") ||
                            skin?.label}
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
            )}

            <SkinPicker skins={skins} value={mySkin} onChange={onSkin} team={meta?.mode === "competitive" ? myTeam : undefined} />
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
