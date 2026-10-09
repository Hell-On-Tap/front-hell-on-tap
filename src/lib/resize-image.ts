/**
 * Reduz e recorta a imagem no navegador antes de enviar (preenche o quadro,
 * cortando o excesso no centro). Fotos de celular de vários MB viram poucas
 * centenas de KB, dentro do limite de 2 MB da API.
 */
export async function resizeImage(file: File, width: number, height: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível abrir essa imagem. Tente PNG, JPG ou WEBP.");
  }

  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  // WEBP é menor; navegadores que não geram WEBP devolvem PNG, aí usamos JPG
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Não foi possível preparar a imagem.");
  return jpeg;
}
