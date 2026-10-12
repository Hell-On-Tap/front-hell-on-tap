"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import {
  createRoom,
  DEFAULT_MAP,
  DEFAULT_RULES,
  MODES,
  RULE_LIMITS,
  type GameMode,
  type MatchRules,
  listMaps,
  MAPS,
  mapPreview,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PRIVACY,
  ROOMS_CHANGED,
  type Privacy,
  type RoomSettings,
} from "@/lib/game-api";
import { playPath } from "@/lib/home-data";
import styles from "./Rooms.module.css";

const ORDER: Privacy[] = ["public", "friends", "private"];
const MODE_ORDER: GameMode[] = ["deathmatch", "competitive"];

/** Campos de economia e tempo do 5x5 (o servidor confere os limites). */
const RULE_FIELDS: { key: Exclude<keyof MatchRules, "friendlyFire">; label: string; unit: string; hint?: string }[] = [
  { key: "maxRounds", label: "Rodadas", unit: "", hint: "30 = MR15 (vence quem fizer 16); troca de lado no meio" },
  { key: "startMoney", label: "Dinheiro inicial", unit: "$" },
  { key: "maxMoney", label: "Dinheiro máximo", unit: "$" },
  { key: "roundTime", label: "Tempo da rodada", unit: "s" },
  { key: "freezeTime", label: "Congelamento", unit: "s", hint: "parado no começo da rodada, comprando" },
  { key: "buyTime", label: "Tempo de compra", unit: "s", hint: "depois do congelamento" },
  { key: "c4Timer", label: "Tempo da C4", unit: "s" },
  { key: "killReward", label: "Prêmio por abate", unit: "$" },
  { key: "winReward", label: "Prêmio de vitória", unit: "$" },
  { key: "bombReward", label: "Prêmio da bomba", unit: "$", hint: "explodiu ou desarmou" },
  { key: "lossBonus", label: "Bônus de derrota", unit: "$", hint: "+$500 a cada derrota seguida" },
  { key: "lossBonusMax", label: "Bônus de derrota máx.", unit: "$" },
];

/** Economia e tempo do 5x5: números do CS 1.6 por padrão, o dono muda. */
function RulesFields({ value, onChange, idPrefix }: { value: MatchRules; onChange: (next: MatchRules) => void; idPrefix: string }) {
  const changed = (Object.keys(DEFAULT_RULES) as (keyof MatchRules)[]).some((k) => value[k] !== DEFAULT_RULES[k]);
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>ECONOMIA E TEMPO (5X5)</legend>
      <div className={styles.rulesGrid}>
        {RULE_FIELDS.map((f) => {
          const [min, max] = RULE_LIMITS[f.key];
          return (
            <label key={f.key} className={styles.rule} title={f.hint}>
              <span>
                {f.label}
                {f.unit && <small> ({f.unit})</small>}
              </span>
              <input
                id={`${idPrefix}-${f.key}`}
                className={styles.input}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                step={1}
                value={value[f.key]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) onChange({ ...value, [f.key]: n });
                }}
                onBlur={() => onChange({ ...value, [f.key]: Math.min(max, Math.max(min, Math.round(value[f.key]))) })}
              />
            </label>
          );
        })}
      </div>
      <div className={styles.rulesFoot}>
        <label className={styles.check}>
          <input type="checkbox" checked={value.friendlyFire} onChange={(e) => onChange({ ...value, friendlyFire: e.target.checked })} />
          Fogo amigo (35% do dano; matar aliado custa $3300)
        </label>
        <button type="button" className={styles.smallGhost} disabled={!changed} onClick={() => onChange({ ...DEFAULT_RULES })}>
          Padrão do CS
        </button>
      </div>
      <p className={styles.rulesNote}>
        No jogo, o dono também muda tudo pelo console (mp_startmoney, mp_roundtime, mp_freezetime, mp_buytime, mp_c4timer, mp_maxrounds,
        mp_restartgame) e libera os comandos de treino com <code>sv_cheats 1</code>.
      </p>
    </fieldset>
  );
}

/** Ícone de cada privacidade (globo, dupla, cadeado). */
export function PrivacyIcon({ privacy }: { privacy: Privacy }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {privacy === "public" ? (
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm4.9 6h-2a11 11 0 0 0-.8-3.6A5 5 0 0 1 12.9 7zM8 3.1c.5.8 1 2.2 1.1 3.9H6.9C7 5.3 7.5 3.9 8 3.1zM5.9 3.4A11 11 0 0 0 5.1 7h-2a5 5 0 0 1 2.8-3.6zM3.1 9h2c.1 1.4.4 2.6.8 3.6A5 5 0 0 1 3.1 9zm3.8 0h2.2c-.1 1.7-.6 3.1-1.1 3.9-.5-.8-1-2.2-1.1-3.9zm3.2 3.6c.4-1 .7-2.2.8-3.6h2a5 5 0 0 1-2.8 3.6z" />
      ) : privacy === "friends" ? (
        <path d="M5.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm5.5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM1 13c0-2.2 2-3.8 4.5-3.8S10 10.8 10 13v1H1zm10-3.6c2.2 0 4 1.3 4 3.3V14h-3.6v-1c0-1.4-.6-2.6-1.6-3.4z" />
      ) : (
        <path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" />
      )}
    </svg>
  );
}

export function PrivacyBadge({ privacy }: { privacy: Privacy }) {
  return (
    <span className={styles.privacy} data-privacy={privacy}>
      <PrivacyIcon privacy={privacy} />
      {PRIVACY[privacy].label}
    </span>
  );
}

/** Nome, privacidade e limite de jogadores (criar e configurar usam os mesmos campos). */
export function RoomSettingsFields({
  value,
  onChange,
  idPrefix,
  minPlayers = MIN_PLAYERS,
}: {
  value: RoomSettings;
  onChange: (next: RoomSettings) => void;
  idPrefix: string;
  /** não dá para baixar o limite abaixo de quem já está na sala */
  minPlayers?: number;
}) {
  const min = Math.max(MIN_PLAYERS, minPlayers);
  // mapas do servidor do jogo (os .bsp da pasta maps/ dele)
  const [maps, setMaps] = useState(MAPS);
  useEffect(() => {
    let alive = true;
    void listMaps().then((list) => alive && setMaps(list));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${idPrefix}-name`}>
          NOME DA SALA
        </label>
        <input
          id={`${idPrefix}-name`}
          className={styles.input}
          value={value.name}
          maxLength={32}
          required
          autoComplete="off"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>

      <fieldset className={styles.field}>
        <legend className={styles.label}>MODO</legend>
        <div className={styles.privacyOptions} data-count="2">
          {MODE_ORDER.map((m) => (
            <label key={m} className={styles.privacyOption}>
              <input type="radio" name={`${idPrefix}-mode`} value={m} checked={value.mode === m} onChange={() => onChange({ ...value, mode: m })} />
              <strong>{MODES[m].label}</strong>
              <span>{MODES[m].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>QUEM PODE ENTRAR</legend>
        <div className={styles.privacyOptions}>
          {ORDER.map((p) => (
            <label key={p} className={styles.privacyOption}>
              <input
                type="radio"
                name={`${idPrefix}-privacy`}
                value={p}
                checked={value.privacy === p}
                onChange={() => onChange({ ...value, privacy: p })}
              />
              <strong>
                <PrivacyIcon privacy={p} />
                {PRIVACY[p].label}
              </strong>
              <span>{PRIVACY[p].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>MAPA</legend>
        <div className={styles.mapOptions}>
          {maps.map((m) => (
            <label key={m.id} className={styles.mapOption}>
              <input
                type="radio"
                name={`${idPrefix}-map`}
                value={m.id}
                checked={value.map === m.id}
                onChange={() => onChange({ ...value, map: m.id })}
              />
              {mapPreview(m.id) ? (
                // eslint-disable-next-line @next/next/no-img-element -- prévia em pixel art, sem otimização
                <img src={mapPreview(m.id)!} alt="" width={160} height={96} />
              ) : (
                <span className={styles.mapBlank} aria-hidden="true">
                  {m.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <strong>{m.name}</strong>
              <span>{m.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <span className={styles.label} id={`${idPrefix}-max-label`}>
          MÁXIMO DE JOGADORES
        </span>
        <div className={styles.stepper} role="group" aria-labelledby={`${idPrefix}-max-label`}>
          <button
            type="button"
            aria-label="Menos jogadores"
            disabled={value.maxPlayers <= min}
            onClick={() => onChange({ ...value, maxPlayers: Math.max(min, value.maxPlayers - 1) })}
          >
            −
          </button>
          <output aria-live="polite">{value.maxPlayers}</output>
          <button
            type="button"
            aria-label="Mais jogadores"
            disabled={value.maxPlayers >= MAX_PLAYERS}
            onClick={() => onChange({ ...value, maxPlayers: Math.min(MAX_PLAYERS, value.maxPlayers + 1) })}
          >
            +
          </button>
          <small>
            de {min} a {MAX_PLAYERS}
          </small>
        </div>
      </div>

      {value.mode === "competitive" && (
        <RulesFields value={value.rules} onChange={(rules) => onChange({ ...value, rules })} idPrefix={idPrefix} />
      )}
    </div>
  );
}

/** Botão "Criar sala" + diálogo. Ao criar, abre a sala de espera em /jogar. */
export function CreateRoomButton({
  token,
  nickname,
  className,
  mode = "deathmatch",
}: {
  token: string;
  nickname: string;
  className?: string;
  /** modo já marcado ao abrir (o lobby passa o modo escolhido) */
  mode?: GameMode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // o botão aparece mais de uma vez na página (topo e lista de salas): ids únicos
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [settings, setSettings] = useState<RoomSettings>({
    name: "",
    privacy: "public",
    maxPlayers: MAX_PLAYERS,
    map: mode === "competitive" ? "de_dust" : DEFAULT_MAP,
    mode,
    rules: { ...DEFAULT_RULES },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open() {
    // o 5x5 precisa de mapa com bombsite (o Dust é o padrão)
    setSettings((s) => ({ ...s, name: s.name || `Sala de ${nickname}`, mode, map: s.mode === mode ? s.map : mode === "competitive" ? "de_dust" : DEFAULT_MAP }));
    setError("");
    dialogRef.current?.showModal();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings.name.trim()) {
      setError("Dê um nome para a sala.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { rules, ...rest } = settings;
      const room = await createRoom(token, { ...rest, name: settings.name.trim(), ...(settings.mode === "competitive" ? { rules } : {}) });
      window.dispatchEvent(new Event(ROOMS_CHANGED));
      // diálogo modal aberto deixaria a próxima página sem cliques (o Next guarda a página anterior)
      dialogRef.current?.close();
      setBusy(false);
      router.push(playPath("online", room.code));
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Não foi possível criar a sala.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className ?? styles.primary} onClick={open}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z" />
        </svg>
        Criar sala
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={`${uid}-title`}
        onClick={(e) => e.target === e.currentTarget && !busy && dialogRef.current?.close()}
      >
        <form className={styles.dialogPanel} onSubmit={submit} noValidate>
          <div className={styles.dialogHead}>
            <div>
              <h2 id={`${uid}-title`}>Criar sala</h2>
              <p>{MODES[settings.mode].label} online. Você é o dono: convida os amigos e inicia a partida.</p>
            </div>
            <button type="button" className={styles.close} aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
              ×
            </button>
          </div>
          <RoomSettingsFields value={settings} onChange={setSettings} idPrefix={`${uid}-room`} />
          <p className={styles.msgError} role="alert">
            {error}
          </p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.ghost} onClick={() => dialogRef.current?.close()} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Criando…" : "Criar e entrar"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
