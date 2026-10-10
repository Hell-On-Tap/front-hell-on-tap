"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BACKGROUNDS,
  centerCrop,
  clampCrop,
  drawCrop,
  exportCrop,
  fitCrop,
  hasTransparency,
  initialCrop,
  leavesGaps,
  MAX_ZOOM,
  minZoom,
  openImage,
  zoomAt,
  type Crop,
} from "@/lib/image-crop";
import fieldStyles from "../auth/AuthDialog.module.css";
import styles from "./ImageCropper.module.css";

type Props = {
  file: File;
  /** tamanho final (px) — também define a proporção do quadro */
  width: number;
  height: number;
  title: string;
  /** enquadramento anterior, para reabrir do mesmo jeito */
  initial?: Crop;
  onCancel: () => void;
  onConfirm: (result: { blob: Blob; crop: Crop }) => void | Promise<void>;
};

/**
 * Janela de enquadramento: arrastar para posicionar, roda/pinça/controle para
 * aproximar e, quando há transparência ou sobra, escolher o fundo.
 */
export default function ImageCropper({ file, width, height, title, initial, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const out = { width, height };

  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // abre a imagem
  useEffect(() => {
    let alive = true;
    let opened: ImageBitmap | null = null;
    openImage(file)
      .then((bmp) => {
        opened = bmp;
        if (!alive) return bmp.close();
        const alpha = hasTransparency(bmp);
        setBitmap(bmp);
        setTransparent(alpha);
        setCrop(initial ? clampCrop(bmp, out, initial) : initialCrop(bmp, out));
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
      opened?.close();
    };
    // a janela é montada de novo para cada arquivo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // redesenha a prévia
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && bitmap && crop) drawCrop(ctx, bitmap, out, crop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitmap, crop, width, height]);

  /** posição do ponteiro em pixels da saída */
  function toOut(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * width, y: ((clientY - rect.top) / rect.height) * height };
  }

  // roda do mouse: precisa de listener não passivo para não rolar a página
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const ax = ((e.clientX - rect.left) / rect.width) * width;
      const ay = ((e.clientY - rect.top) / rect.height) * height;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setCrop((c) => (c ? zoomAt(bitmap, out, c, c.zoom * factor, ax, ay) : c));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitmap, width, height]);

  // arrastar (1 dedo/mouse) e pinça (2 dedos)
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!bitmap) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toOut(e.clientX, e.clientY));
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev || !bitmap || !crop) return;
    const next = toOut(e.clientX, e.clientY);

    if (map.size === 1) {
      map.set(e.pointerId, next);
      setCrop(clampCrop(bitmap, out, { ...crop, x: crop.x + next.x - prev.x, y: crop.y + next.y - prev.y }));
      return;
    }
    const [other] = [...map.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    map.set(e.pointerId, next);
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(next.x - other.x, next.y - other.y);
    if (before < 1) return;
    const mid = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };
    const pan = { dx: (next.x - prev.x) / 2, dy: (next.y - prev.y) / 2 };
    const zoomed = zoomAt(bitmap, out, crop, crop.zoom * (after / before), mid.x, mid.y);
    setCrop(clampCrop(bitmap, out, { ...zoomed, x: zoomed.x + pan.dx, y: zoomed.y + pan.dy }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!bitmap || !crop) return;
    const step = e.shiftKey ? 60 : 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setCrop(clampCrop(bitmap, out, { ...crop, x: crop.x + dx, y: crop.y + dy }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setCrop(zoomAt(bitmap, out, crop, crop.zoom * 1.1));
    } else if (e.key === "-") {
      e.preventDefault();
      setCrop(zoomAt(bitmap, out, crop, crop.zoom / 1.1));
    }
  }

  async function confirm() {
    if (!bitmap || !crop) return;
    setBusy(true);
    setError("");
    try {
      const blob = await exportCrop(bitmap, out, crop);
      await onConfirm({ blob, crop });
    } catch (err) {
      setError((err as Error).message || "Não foi possível preparar a imagem.");
      setBusy(false);
    }
  }

  const low = bitmap ? minZoom(bitmap, out) : 1;
  const gaps = bitmap && crop ? leavesGaps(bitmap, out, crop.zoom) : false;
  const showBackgrounds = transparent || gaps;
  const customColor = crop?.background && /^#[0-9a-f]{6}$/i.test(crop.background) && !BACKGROUNDS.some((b) => b.id === crop.background)
    ? crop.background
    : null;
  const setBackground = (background: string | null) => setCrop((c) => (c ? { ...c, background } : c));

  const tooSmall = bitmap && (bitmap.width < width / 2 || bitmap.height < height / 2);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="crop-title"
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) onCancel();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.head}>
          <h2 id="crop-title">{title}</h2>
          <button type="button" className={styles.close} onClick={onCancel} disabled={busy} aria-label="Fechar">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 2h3l3 3 3-3h3v3l-3 3 3 3v3h-3l-3-3-3 3H2v-3l3-3-3-3z" />
            </svg>
          </button>
        </header>

        <div
          className={styles.stage}
          data-checker={!crop?.background || undefined}
          style={{ aspectRatio: `${width} / ${height}`, maxWidth: width === height ? "320px" : undefined }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            tabIndex={0}
            aria-label="Prévia do enquadramento. Arraste para mover, use as setas para ajustar e + ou − para o zoom."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          />
          {!bitmap && !error && <span className={styles.loading}>Carregando…</span>}
          <span className={styles.grid} aria-hidden="true" />
        </div>

        <p className={fieldStyles.hint}>Arraste para posicionar. Role o mouse ou faça pinça para aproximar.</p>

        <div className={styles.zoom}>
          <button
            type="button"
            className={styles.step}
            aria-label="Afastar"
            disabled={!bitmap || !crop}
            onClick={() => bitmap && crop && setCrop(zoomAt(bitmap, out, crop, crop.zoom / 1.15))}
          >
            −
          </button>
          <input
            type="range"
            aria-label="Zoom"
            min={low}
            max={MAX_ZOOM}
            step="any"
            value={crop?.zoom ?? 1}
            disabled={!bitmap || !crop}
            onChange={(e) => bitmap && crop && setCrop(zoomAt(bitmap, out, crop, Number(e.target.value)))}
          />
          <button
            type="button"
            className={styles.step}
            aria-label="Aproximar"
            disabled={!bitmap || !crop}
            onClick={() => bitmap && crop && setCrop(zoomAt(bitmap, out, crop, crop.zoom * 1.15))}
          >
            +
          </button>
        </div>

        <div className={styles.quick}>
          <button
            type="button"
            className={styles.chip}
            disabled={!bitmap || !crop}
            onClick={() => bitmap && crop && setCrop(initialCrop(bitmap, out, crop.background))}
          >
            Preencher
          </button>
          <button
            type="button"
            className={styles.chip}
            disabled={!bitmap || !crop || low >= 0.999}
            onClick={() => bitmap && crop && setCrop(fitCrop(bitmap, out, crop.background))}
          >
            Mostrar inteira
          </button>
          <button
            type="button"
            className={styles.chip}
            disabled={!bitmap || !crop}
            onClick={() => bitmap && crop && setCrop(centerCrop(bitmap, out, crop))}
          >
            Centralizar
          </button>
        </div>

        {showBackgrounds && crop && (
          <fieldset className={styles.backgrounds}>
            <legend>
              Fundo
              <small>{transparent ? "A imagem tem partes transparentes." : "Sobrou espaço em volta da imagem."}</small>
            </legend>
            <div className={styles.swatches} role="radiogroup" aria-label="Fundo">
              <button
                type="button"
                role="radio"
                aria-checked={crop.background === null}
                className={`${styles.swatch} ${styles.none}`}
                title="Transparente"
                aria-label="Transparente"
                onClick={() => setBackground(null)}
              />
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={crop.background === b.id}
                  className={styles.swatch}
                  style={{ background: b.css }}
                  title={b.label}
                  aria-label={b.label}
                  onClick={() => setBackground(b.id)}
                />
              ))}
              <label
                className={`${styles.swatch} ${styles.custom}`}
                title="Outra cor"
                aria-checked={!!customColor}
                role="radio"
                style={customColor ? { background: customColor } : undefined}
              >
                <span aria-hidden="true">+</span>
                <input
                  type="color"
                  aria-label="Escolher outra cor"
                  value={customColor ?? "#8e0b0b"}
                  onChange={(e) => setBackground(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
        )}

        {tooSmall && !error && (
          <p className={fieldStyles.hint}>Essa imagem é pequena ({bitmap.width}×{bitmap.height}); ela pode ficar borrada.</p>
        )}
        {error && (
          <p className={fieldStyles.formError} role="alert">
            {error}
          </p>
        )}

        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={fieldStyles.submit} onClick={confirm} disabled={busy || !bitmap || !crop}>
            {busy ? "Aplicando…" : "Aplicar"}
          </button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
