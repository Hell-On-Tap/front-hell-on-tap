import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type Track = {
  id: string;
  title: string;
  subtitle?: string;
  artist: string;
  sourceUrl?: string;
  audio: string;
  cover?: string;
};

type Credits = {
  name: string;
  channel: string;
  youtube?: string;
};

/** Faixa que abre o site (nome da pasta em public/audios). */
export const FIRST_TRACK = "feel-good";

const AUDIO_DIR = path.join(process.cwd(), "public", "audios");
const AUDIO_EXT = [".m4a", ".mp3", ".ogg", ".opus", ".webm", ".wav"];
const COVER_EXT = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Lido no servidor. Cada subpasta de public/audios é uma faixa:
 *   audio.(m4a|mp3|ogg...)  picture.(jpg|png|webp)  credits.json
 * Para adicionar uma música, crie outra pasta com esses três arquivos.
 */
export async function getPlaylist(): Promise<Track[]> {
  // Lida no build e reaproveitada; nova música exige rebuild (ou reiniciar o dev)
  "use cache";

  let folders: string[];
  try {
    const entries = await readdir(AUDIO_DIR, { withFileTypes: true });
    folders = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }

  const tracks = (await Promise.all(folders.map(readTrack))).filter((t): t is Track => t !== null);
  // A faixa de abertura vai para o início; as demais seguem em ordem alfabética
  return tracks.sort((a, b) => Number(b.id === FIRST_TRACK) - Number(a.id === FIRST_TRACK));
}

async function readTrack(folder: string): Promise<Track | null> {
  const dir = path.join(AUDIO_DIR, folder);
  try {
    const files = await readdir(dir);
    const audio = files.find((f) => AUDIO_EXT.includes(path.extname(f).toLowerCase()));
    if (!audio) return null;
    const cover = files.find((f) => COVER_EXT.includes(path.extname(f).toLowerCase()));
    const credits = JSON.parse(await readFile(path.join(dir, "credits.json"), "utf-8")) as Credits;

    // "Música [Descrição] - Canal" vira título + subtítulo
    const match = credits.name.match(/^(.*?)\s*\[(.+?)\]\s*(?:-\s*.*)?$/);
    const url = (file: string) => `/audios/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;

    return {
      id: folder,
      title: match ? match[1] : credits.name,
      subtitle: match ? match[2] : undefined,
      artist: credits.channel,
      sourceUrl: credits.youtube,
      audio: url(audio),
      cover: cover ? url(cover) : undefined,
    };
  } catch {
    // pasta sem credits.json válido: a faixa é ignorada
    return null;
  }
}
