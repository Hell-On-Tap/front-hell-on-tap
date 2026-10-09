"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo animado do topo da home. Vídeo mudo: os navegadores permitem autoplay sem interação.
 * Fica por cima da imagem estática (que aparece enquanto o vídeo carrega).
 */
export default function HeroVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // o React não envia o atributo "muted" no HTML do servidor; garante aqui
    video.muted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    void video.play().catch(() => {
      /* sem autoplay (ex.: economia de bateria): fica a imagem estática */
    });
  }, []);

  return (
    <video ref={ref} className={className} autoPlay muted loop playsInline preload="auto" aria-hidden="true">
      <source src="/background-hero-mobile.mp4" type="video/mp4" media="(max-width: 640px)" />
      <source src="/background-hero.mp4" type="video/mp4" />
    </video>
  );
}
