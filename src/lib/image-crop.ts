/**
 * Enquadramento de imagens no navegador (foto de perfil, banner, logo de clã).
 * O usuário escolhe zoom e posição; a imagem final já sai no tamanho que a API
 * guarda. Imagens com transparência (ou com sobra ao afastar o zoom) podem
 * ganhar um fundo sólido ou degradê.
 */

/** Posição da imagem no quadro final, em pixels da saída. */
export type Crop = {
  /** 1 = preenche o quadro (cover); < 1 = afastada, sobra espaço */
  zoom: number;
  /** canto superior esquerdo da imagem dentro do quadro */
  x: number;
  y: number;
  /**
   * null = mantém transparente; senão o id de um fundo de BACKGROUNDS, uma cor #rrggbb
   * ou um gradiente personalizado "grad:<ângulo>:<#de>:<#para>" (ver gradientId).
   */
  background: string | null;
};

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const solid =
  (color: string): Paint =>
  (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  };

const gradient =
  (from: string, to: string): Paint =>
  (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

/** Fundos prontos, nas cores do H.O.T. A ordem é a ordem na tela. */
export const BACKGROUNDS: { id: string; label: string; css: string; paint: Paint }[] = [
  { id: "inferno", label: "Inferno", css: "linear-gradient(160deg, #c8170e, #240303)", paint: gradient("#c8170e", "#240303") },
  { id: "brasa", label: "Brasa", css: "linear-gradient(160deg, #ffb43a, #8e0b0b)", paint: gradient("#ffb43a", "#8e0b0b") },
  { id: "#1c0202", label: "Sangue escuro", css: "#1c0202", paint: solid("#1c0202") },
  { id: "#c8170e", label: "Vermelho", css: "#c8170e", paint: solid("#c8170e") },
  { id: "#ffb43a", label: "Âmbar", css: "#ffb43a", paint: solid("#ffb43a") },
  { id: "#f2e3cf", label: "Osso", css: "#f2e3cf", paint: solid("#f2e3cf") },
  { id: "#000000", label: "Preto", css: "#000000", paint: solid("#000000") },
  { id: "#ffffff", label: "Branco", css: "#ffffff", paint: solid("#ffffff") },
];

/** Gradiente montado pela pessoa: ângulo como no CSS (0° = para cima, 90° = para a direita). */
export type CustomGradient = { angle: number; from: string; to: string };

const GRADIENT = /^grad:(\d{1,3}):(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i;
const HEX = /^#[0-9a-f]{6}$/i;

export function parseGradient(background: string | null): CustomGradient | null {
  const m = background ? GRADIENT.exec(background) : null;
  return m ? { angle: Number(m[1]) % 360, from: m[2].toLowerCase(), to: m[3].toLowerCase() } : null;
}

export function gradientId(g: CustomGradient) {
  return `grad:${Math.round(((g.angle % 360) + 360) % 360)}:${g.from.toLowerCase()}:${g.to.toLowerCase()}`;
}

/** Mesmo desenho do linear-gradient(<ângulo>deg, de, para) do CSS: a prévia e a imagem final batem. */
const angled =
  ({ angle, from, to }: CustomGradient): Paint =>
  (ctx, w, h) => {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    const g = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

function paintFor(background: string | null): Paint | null {
  if (!background) return null;
  const preset = BACKGROUNDS.find((b) => b.id === background);
  if (preset) return preset.paint;
  const grad = parseGradient(background);
  if (grad) return angled(grad);
  return HEX.test(background) ? solid(background) : null;
}

/** CSS do fundo, para as amostras e a prévia (null = transparente). */
export function backgroundCss(background: string | null): string | null {
  if (!background) return null;
  const preset = BACKGROUNDS.find((b) => b.id === background);
  if (preset) return preset.css;
  const grad = parseGradient(background);
  if (grad) return `linear-gradient(${grad.angle}deg, ${grad.from}, ${grad.to})`;
  return HEX.test(background) ? background : null;
}

// Gradientes salvos ficam neste navegador, para reusar na foto, no banner e na logo.
const SAVED_KEY = "hot:gradients";
const MAX_SAVED = 8;

export function loadSavedGradients(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((g): g is string => typeof g === "string" && !!parseGradient(g)).slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

export function storeSavedGradients(list: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
  } catch {
    /* sem armazenamento: os gradientes valem só nesta janela */
  }
}

export const MAX_ZOOM = 5;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Valida o arquivo e abre a imagem (GIF animado usa o primeiro quadro). */
export async function openImage(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Escolha uma imagem de até 15 MB.");
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível abrir essa imagem. Tente PNG, JPG ou WEBP.");
  }
}

/** A imagem tem algum pixel transparente? (amostra reduzida, rápido) */
export function hasTransparency(bitmap: ImageBitmap): boolean {
  const s = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * s));
  const h = Math.max(1, Math.round(bitmap.height * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

type Size = { width: number; height: number };

/** Escala em que a imagem cobre exatamente o quadro (zoom = 1). */
function coverScale(img: Size, out: Size) {
  return Math.max(out.width / img.width, out.height / img.height);
}

/** Menor zoom: a imagem inteira cabe no quadro. */
export function minZoom(img: Size, out: Size) {
  return Math.min(out.width / img.width, out.height / img.height) / coverScale(img, out);
}

export function drawnSize(img: Size, out: Size, zoom: number) {
  const s = coverScale(img, out) * zoom;
  return { w: img.width * s, h: img.height * s };
}

/** Sobra espaço no quadro (imagem menor que ele em algum eixo)? */
export function leavesGaps(img: Size, out: Size, zoom: number) {
  const { w, h } = drawnSize(img, out, zoom);
  return w < out.width - 0.5 || h < out.height - 0.5;
}

/**
 * Mantém a imagem no lugar: maior que o quadro → não deixa borda vazia;
 * menor que o quadro → não deixa sair dele.
 */
export function clampCrop(img: Size, out: Size, crop: Crop): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoom(img, out), crop.zoom));
  const { w, h } = drawnSize(img, out, zoom);
  const axis = (p: number, d: number, f: number) =>
    d >= f ? Math.min(0, Math.max(f - d, p)) : Math.max(0, Math.min(f - d, p));
  return { ...crop, zoom, x: axis(crop.x, w, out.width), y: axis(crop.y, h, out.height) };
}

/** Imagem centralizada preenchendo o quadro. */
export function initialCrop(img: Size, out: Size, background: string | null = null): Crop {
  const { w, h } = drawnSize(img, out, 1);
  return { zoom: 1, x: (out.width - w) / 2, y: (out.height - h) / 2, background };
}

/** Imagem inteira visível, centralizada (pode sobrar espaço). */
export function fitCrop(img: Size, out: Size, background: string | null): Crop {
  return centerCrop(img, out, { zoom: minZoom(img, out), x: 0, y: 0, background });
}

/** Centraliza sem mudar o zoom. */
export function centerCrop(img: Size, out: Size, crop: Crop): Crop {
  const { w, h } = drawnSize(img, out, crop.zoom);
  return { ...crop, x: (out.width - w) / 2, y: (out.height - h) / 2 };
}

/** Muda o zoom mantendo fixo o ponto (ax, ay) do quadro — cursor, dedos ou centro. */
export function zoomAt(img: Size, out: Size, crop: Crop, zoom: number, ax = out.width / 2, ay = out.height / 2): Crop {
  const before = drawnSize(img, out, crop.zoom);
  const z = Math.min(MAX_ZOOM, Math.max(minZoom(img, out), zoom));
  const after = drawnSize(img, out, z);
  const u = (ax - crop.x) / before.w;
  const v = (ay - crop.y) / before.h;
  return clampCrop(img, out, { ...crop, zoom: z, x: ax - u * after.w, y: ay - v * after.h });
}

/** Desenha o quadro final no canvas (já no tamanho de saída). */
export function drawCrop(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap, out: Size, crop: Crop) {
  ctx.clearRect(0, 0, out.width, out.height);
  paintFor(crop.background)?.(ctx, out.width, out.height);
  const { w, h } = drawnSize(bitmap, out, crop.zoom);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, crop.x, crop.y, w, h);
}

/** Gera o arquivo enviado para a API. Mantém a transparência quando ela fica visível. */
export async function exportCrop(bitmap: ImageBitmap, out: Size, crop: Crop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext("2d")!;
  drawCrop(ctx, bitmap, out, crop);

  const keepsAlpha = !paintFor(crop.background) && (leavesGaps(bitmap, out, crop.zoom) || hasTransparency(bitmap));
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));

  // WEBP é menor e guarda transparência; quem não gera WEBP devolve PNG
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return webp;
  // sem WEBP: PNG se houver transparência, JPG (menor) se não houver
  const fallback = await toBlob(keepsAlpha ? "image/png" : "image/jpeg");
  if (!fallback) throw new Error("Não foi possível preparar a imagem.");
  return fallback;
}
