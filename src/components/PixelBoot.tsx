"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PixelBoot.module.css";

/*
 * Abertura "pixels se formando":
 *  1. blocos grandes da cena surgem em ordem aleatória;
 *  2. os pixels vão diminuindo até a imagem ficar nítida;
 *  3. a camada some e revela a página (que tem a mesma imagem por baixo).
 * Duração total ≈ --boot em globals.css (1300 ms).
 */
const BLOCK = 48;
const REVEAL_MS = 480;
const STEPS = [32, 20, 12, 7, 4, 2];
const STEP_MS = 95;
const FADE_MS = 220;
// versão pequena da arte, gerada pelo otimizador de imagens do Next
const SRC = "/_next/image?url=%2Fbackground.png&w=640&q=75";

export default function PixelBoot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"run" | "fade" | "done">("run");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTimeout(() => setPhase("done"), 0);
      return;
    }

    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const mobile = w <= 640;
    const img = new Image();
    let ready = false;
    img.onload = () => (ready = true);
    img.src = SRC;

    // desenha a cena na resolução 1/size e amplia sem suavizar = pixels grandes
    const small = document.createElement("canvas");
    const sctx = small.getContext("2d")!;
    function renderSmall(size: number) {
      const sw = Math.max(1, Math.ceil(w / size));
      const sh = Math.max(1, Math.ceil(h / size));
      small.width = sw;
      small.height = sh;
      sctx.fillStyle = "#3a0505";
      sctx.fillRect(0, 0, sw, sh);
      if (ready) {
        // mesmo enquadramento do topo da home (object-fit: cover)
        const [px, py] = mobile ? [0.82, 0.5] : [0.7, 0.6];
        const scale = Math.max(sw / img.width, sh / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        sctx.drawImage(img, (sw - dw) * px, (sh - dh) * py, dw, dh);
      } else {
        // imagem ainda não chegou: ruído vermelho no lugar
        for (let y = 0; y < sh; y++)
          for (let x = 0; x < sw; x++) {
            const v = 40 + Math.random() * 110;
            sctx.fillStyle = `rgb(${v},${v * 0.08},${v * 0.06})`;
            sctx.fillRect(x, y, 1, 1);
          }
      }
      // mesmo escurecimento do topo da home
      const g = mobile
        ? sctx.createLinearGradient(0, 0, 0, sh)
        : sctx.createLinearGradient(0, 0, sw, 0);
      if (mobile) {
        g.addColorStop(0, "rgba(26,1,1,0.55)");
        g.addColorStop(0.45, "rgba(26,1,1,0.7)");
        g.addColorStop(1, "rgba(20,0,0,0.9)");
      } else {
        g.addColorStop(0, "rgba(26,1,1,0.82)");
        g.addColorStop(0.38, "rgba(26,1,1,0.55)");
        g.addColorStop(0.68, "rgba(26,1,1,0.1)");
        g.addColorStop(1, "rgba(26,1,1,0)");
      }
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, sw, sh);
      return { sw, sh };
    }

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#240303";
    ctx.fillRect(0, 0, w, h);

    // ordem aleatória dos blocos da fase 1
    const cols = Math.ceil(w / BLOCK);
    const rows = Math.ceil(h / BLOCK);
    const order = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    let raf = 0;
    let drawn = 0;
    let lastStep = -1;
    let blockData: Uint8ClampedArray | null = null;
    const start = performance.now();

    function frame(now: number) {
      const t = now - start;
      if (t < REVEAL_MS) {
        // fase 1: blocos surgindo
        if (!blockData || (ready && drawn === 0)) {
          renderSmall(BLOCK);
          blockData = sctx.getImageData(0, 0, cols, rows).data;
        }
        const target = Math.floor((t / REVEAL_MS) * order.length);
        for (; drawn < target; drawn++) {
          const i = order[drawn];
          const x = i % cols;
          const y = Math.floor(i / cols);
          const k = (y * cols + x) * 4;
          ctx!.fillStyle = `rgb(${blockData[k]},${blockData[k + 1]},${blockData[k + 2]})`;
          ctx!.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
        }
        raf = requestAnimationFrame(frame);
        return;
      }
      // fase 2: resolução aumentando
      const step = Math.floor((t - REVEAL_MS) / STEP_MS);
      if (step < STEPS.length) {
        if (step !== lastStep) {
          lastStep = step;
          const { sw, sh } = renderSmall(STEPS[step]);
          ctx!.drawImage(small, 0, 0, sw, sh, 0, 0, sw * STEPS[step], sh * STEPS[step]);
        }
        raf = requestAnimationFrame(frame);
        return;
      }
      // fase 3: some
      setPhase("fade");
      setTimeout(() => setPhase("done"), FADE_MS);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (phase === "done") return null;

  return (
    <div className={styles.boot} data-phase={phase} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
