"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AuthError } from "@/lib/auth-api";
import { normalizeLayout, PROFILE_SECTIONS, updateProfile, type ProfileSection, type ProfileSectionId } from "@/lib/profile-api";
import { setOrganizing, useOrganizing } from "@/lib/profile-organize";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./ProfileSections.module.css";

const DEFAULT_LAYOUT = normalizeLayout([]);
/** distância da borda da tela que faz a página rolar durante o arraste */
const EDGE = 90;
/** deslizar das outras seções e o "assentar" ao soltar */
const SLIDE = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
const SETTLE = "transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1.25), box-shadow 260ms";
/** seção levantada: inclina um pouco, como uma carta na mão */
const LIFT = "scale(1.02) rotate(-0.6deg)";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = {
  profileId: string;
  layout: ProfileSection[];
  /** seções visíveis, já montadas no servidor */
  sections: Partial<Record<ProfileSectionId, ReactNode>>;
};

/**
 * Seções do perfil na ordem escolhida. No modo "Organizar" (só o dono), cada
 * seção vira um bloco que se arrasta pela barra do topo (mouse ou dedo), com
 * setas para o teclado e uma chave para ocultar.
 */
export default function ProfileSections({ profileId, layout, sections }: Props) {
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();
  const isOwner = hydrated && session.user?.id === profileId;
  const editing = useOrganizing() && isOwner;

  const layoutKey = JSON.stringify(layout);
  // rascunho da ordem; "base" = layout em que ele foi criado (se o perfil mudar, o rascunho vale menos)
  const [draft, setDraft] = useState<{
    base: string;
    items: ProfileSection[];
  } | null>(null);
  const items = draft && draft.base === layoutKey ? draft.items : layout;

  const [dragging, setDragging] = useState<ProfileSectionId | null>(null);
  const [focusAfter, setFocusAfter] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  // arraste em andamento: elemento, onde foi pego e onde está o ponteiro
  const drag = useRef<{
    id: ProfileSectionId;
    el: HTMLElement;
    grab: number;
    y: number;
  } | null>(null);
  // posições antes de reordenar, para as outras seções deslizarem (FLIP)
  const flip = useRef<Map<string, number> | null>(null);
  // ordem atual para o arraste (eventos fora do render)
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // saiu da página no meio da organização: desliga o modo
  useEffect(() => () => setOrganizing(false), []);

  function update(fn: (current: ProfileSection[]) => ProfileSection[]) {
    setDraft((prev) => ({
      base: layoutKey,
      items: fn(prev && prev.base === layoutKey ? prev.items : layout),
    }));
  }

  /** Guarda onde cada seção está na tela antes de mudar a ordem. */
  function snapshot() {
    const list = listRef.current;
    if (!list || reducedMotion()) return;
    const map = new Map<string, number>();
    for (const li of Array.from(list.children) as HTMLElement[]) map.set(li.dataset.id!, li.getBoundingClientRect().top);
    flip.current = map;
  }

  /** Põe a seção arrastada debaixo do ponteiro e o encaixe tracejado no lugar dela. */
  function positionDragged() {
    const d = drag.current;
    const list = listRef.current;
    if (!d || !list) return;
    const listTop = list.getBoundingClientRect().top;
    const dy = d.y - d.grab - listTop - d.el.offsetTop;
    d.el.style.transform = `translateY(${dy}px) ${LIFT}`;
    const slot = slotRef.current;
    if (slot) {
      slot.style.top = `${d.el.offsetTop}px`;
      slot.style.height = `${d.el.offsetHeight}px`;
    }
  }

  // depois de reordenar: as outras seções saem de onde estavam e deslizam até o lugar novo
  useLayoutEffect(() => {
    const before = flip.current;
    flip.current = null;
    const list = listRef.current;
    if (before && list) {
      for (const li of Array.from(list.children) as HTMLElement[]) {
        const id = li.dataset.id!;
        if (id === drag.current?.id || !before.has(id)) continue;
        li.style.transition = "none";
        li.style.transform = "";
        const delta = before.get(id)! - li.getBoundingClientRect().top;
        if (!delta) continue;
        li.style.transform = `translateY(${delta}px)`;
        void li.offsetHeight; // aplica a posição antiga antes de animar
        li.style.transition = SLIDE;
        li.style.transform = "";
      }
    }
    positionDragged();
  }, [items]);

  function moveTo(id: ProfileSectionId, target: number) {
    snapshot();
    update((current) => {
      const from = current.findIndex((s) => s.id === id);
      if (from < 0 || target < 0 || target >= current.length || from === target) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function move(id: ProfileSectionId, delta: -1 | 1) {
    const target = items.findIndex((s) => s.id === id) + delta;
    if (target < 0 || target >= items.length) return;
    moveTo(id, target);
    setFocusAfter(`${id}:${delta < 0 ? "up" : "down"}`);
    setAnnounce(`${PROFILE_SECTIONS[id].label}: posição ${target + 1} de ${items.length}.`);
  }

  function toggle(id: ProfileSectionId) {
    update((current) => current.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }

  function cancel() {
    setDraft(null);
    setError("");
    setOrganizing(false);
  }

  async function save() {
    if (!session.token) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile(session.token, { layout: items });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Não foi possível salvar. Tente de novo.");
      setSaving(false);
      return;
    }
    setSaving(false);
    // o rascunho segue na tela até o servidor mandar o perfil novo
    setOrganizing(false);
    router.refresh();
  }

  // depois de mover pelas setas, o foco segue a seção
  useEffect(() => {
    if (!focusAfter) return;
    const list = listRef.current;
    const [id, dir] = focusAfter.split(":");
    const btn = list?.querySelector<HTMLButtonElement>(`[data-move="${id}:${dir}"]`);
    (btn && !btn.disabled
      ? btn
      : list?.querySelector<HTMLButtonElement>(`[data-move="${id}:${dir === "up" ? "down" : "up"}"]`)
    )?.focus();
  }, [focusAfter, items]);

  // Esc cancela
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !dragging && cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, dragging]);

  /** Arraste com mouse ou dedo pela barra da seção. */
  function startDrag(e: React.PointerEvent, id: ProfileSectionId) {
    if (e.button !== 0 || drag.current || (e.target as HTMLElement).closest("button, input, label")) return;
    const el = (e.currentTarget as HTMLElement).closest("li");
    const list = listRef.current;
    if (!el || !list) return;
    e.preventDefault();
    el.style.transition = "none";
    // distância do ponteiro ao topo da seção: ela fica "presa" no mesmo ponto da mão
    drag.current = {
      id,
      el,
      grab: e.clientY - list.getBoundingClientRect().top - el.offsetTop,
      y: e.clientY,
    };
    setDragging(id);
    positionDragged();
    let frame = 0;

    // nova posição: onde está a mão, comparada ao meio das outras seções na
    // ordem natural (sem contar as animações), para não ficar trocando à toa
    const place = () => {
      const d = drag.current;
      if (!d) return;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const hand = d.y - list.getBoundingClientRect().top;
      let cursor = 0;
      let target = 0;
      for (const s of itemsRef.current) {
        if (s.id === id) continue;
        const li = list.querySelector<HTMLElement>(`[data-id="${s.id}"]`);
        if (!li) continue;
        if (hand > cursor + li.offsetHeight / 2) target++;
        cursor += li.offsetHeight + gap;
      }
      if (itemsRef.current.findIndex((s) => s.id === id) !== target) moveTo(id, target);
    };

    // a cada quadro: rola perto da borda e mantém a seção debaixo do ponteiro
    const tick = () => {
      const d = drag.current;
      if (!d) return;
      const y = d.y;
      const speed = y < EDGE ? -(EDGE - y) / 4 : y > window.innerHeight - EDGE ? (y - window.innerHeight + EDGE) / 4 : 0;
      if (speed) {
        window.scrollBy(0, speed);
        place();
      }
      positionDragged();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onMove = (ev: PointerEvent) => {
      if (drag.current) drag.current.y = ev.clientY;
      place();
      positionDragged();
    };
    const onUp = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      drag.current = null;
      // solta: a seção assenta no encaixe com um pequeno quique
      el.dataset.settling = "true";
      el.style.transition = reducedMotion() ? "none" : SETTLE;
      el.style.transform = "";
      const done = () => {
        delete el.dataset.settling;
        el.style.transition = "";
      };
      if (reducedMotion()) done();
      else el.addEventListener("transitionend", done, { once: true });
      setDragging(null);
      const pos = itemsRef.current.findIndex((s) => s.id === id);
      setAnnounce(`${PROFILE_SECTIONS[id].label}: posição ${pos + 1} de ${itemsRef.current.length}.`);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  if (!editing) {
    return (
      <div id="profile-sections">
        {items
          .filter((s) => s.visible)
          .map((s) => (
            <Fragment key={s.id}>{sections[s.id]}</Fragment>
          ))}
      </div>
    );
  }

  const isDefault = JSON.stringify(items) === JSON.stringify(DEFAULT_LAYOUT);

  return (
    <div id="profile-sections" className={styles.board} data-dragging={!!dragging}>
      <div className={styles.bar} role="toolbar" aria-label="Organizar perfil">
        <p className={styles.barText}>
          <strong>Organizando o perfil</strong>
          <span>Arraste as seções pela barra ou use as setas.</span>
        </p>
        <div className={styles.barActions}>
          <button
            type="button"
            className={styles.reset}
            onClick={() => update(() => DEFAULT_LAYOUT)}
            disabled={isDefault || saving}
          >
            Restaurar padrão
          </button>
          <button type="button" className={styles.cancel} onClick={cancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className={styles.save} onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar ordem"}
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.listWrap}>
        {/* encaixe tracejado: onde a seção arrastada vai cair */}
        <div ref={slotRef} className={styles.slot} hidden={!dragging} aria-hidden="true" />
        <ol ref={listRef} className={styles.list} aria-label="Seções do perfil, de cima para baixo">
          {items.map((section, i) => {
            const info = PROFILE_SECTIONS[section.id];
            const content = sections[section.id];
            return (
              <li
                key={section.id}
                data-id={section.id}
                className={styles.item}
                data-hidden={!section.visible}
                data-dragging={dragging === section.id}
              >
                <div className={styles.head} onPointerDown={(e) => startDrag(e, section.id)} title="Arraste para mudar a ordem">
                  <span className={styles.grip} aria-hidden="true">
                    <svg viewBox="0 0 10 16">
                      <path d="M1 1h3v3H1zM6 1h3v3H6zM1 6.5h3v3H1zM6 6.5h3v3H6zM1 12h3v3H1zM6 12h3v3H6z" />
                    </svg>
                  </span>
                  <span className={styles.pos} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={styles.label}>
                    {info.label}
                    {!section.visible && <span className={styles.badge}>Oculta</span>}
                  </span>

                  <label className={styles.toggle} title={section.visible ? "Ocultar do perfil" : "Mostrar no perfil"}>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={section.visible}
                      onChange={() => toggle(section.id)}
                      aria-label={`Mostrar ${info.label} no perfil`}
                    />
                    <span className={styles.track} aria-hidden="true" />
                    <span className={styles.toggleText}>{section.visible ? "Visível" : "Oculta"}</span>
                  </label>

                  <div className={styles.arrows}>
                    <button
                      type="button"
                      data-move={`${section.id}:up`}
                      onClick={() => move(section.id, -1)}
                      disabled={i === 0}
                      aria-label={`Subir ${info.label}`}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 3l6 7H2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      data-move={`${section.id}:down`}
                      onClick={() => move(section.id, 1)}
                      disabled={i === items.length - 1}
                      aria-label={`Descer ${info.label}`}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 13L2 6h12z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* prévia da seção; sem cliques nela enquanto organiza */}
                <div className={styles.body} inert>
                  {content ?? (
                    <p className={styles.placeholder}>
                      {section.visible ? "Aparece aqui depois de salvar." : `${info.hint} Oculta: ninguém vê esta seção.`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className={styles.sr} role="status" aria-live="polite">
        {announce}
      </p>
      {items.every((s) => !s.visible) && <p className={styles.warn}>Com tudo oculto, o perfil mostra só o topo.</p>}
    </div>
  );
}
