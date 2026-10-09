export const GAME_URL = process.env.NEXT_PUBLIC_GAME_URL ?? "http://localhost:3000";

/**
 * Conta obrigatória: não existe partida como visitante.
 * Todo "jogar" passa pelo login; depois de autenticado, o front leva ao jogo com o token.
 */
export const PLAY_HREF = "#entrar";

export type GameMode = {
  key: string;
  name: string;
  description: string;
  detail: string;
  available: boolean;
  href?: string;
};

export const MODES: GameMode[] = [
  {
    key: "1",
    name: "Mata-mata online",
    description: "Crie uma sala, mande o link e jogue com até 10 amigos.",
    detail: "Respawn em 2,5 s, 25 armas liberadas e headshot causando 4× o dano.",
    available: true,
    href: PLAY_HREF,
  },
  {
    key: "2",
    name: "Treino com bots",
    description: "Aqueça a mira contra bots, sem precisar de sala.",
    detail: "Roda no seu navegador e pausa quando você abre o menu.",
    available: true,
    href: PLAY_HREF,
  },
  {
    key: "3",
    name: "Competitivo 5v5",
    description: "Dois times, uma vida por rodada, economia e bomba.",
    detail: "Em desenvolvimento. Chega depois dos times e das rodadas.",
    available: false,
  },
];

export const HUD_STATS = [
  { icon: "✚", value: "10", label: "jogadores por sala" },
  { icon: "◈", value: "25", label: "armas no arsenal" },
  { icon: "☗", value: "9", label: "personagens" },
];

// Dados de exemplo até a API expor o placar real.
export const SAMPLE_SCOREBOARD = [
  { name: "jairo", frags: 142, deaths: 61, hs: 58, ping: 12 },
  { name: "thiagox47", frags: 128, deaths: 70, hs: 49, ping: 18 },
  { name: "igor", frags: 117, deaths: 66, hs: 41, ping: 9 },
  { name: "doomguy_pe", frags: 96, deaths: 88, hs: 33, ping: 34 },
  { name: "awp_ou_nada", frags: 81, deaths: 79, hs: 62, ping: 27 },
  { name: "chopp_gelado", frags: 64, deaths: 95, hs: 22, ping: 41 },
];
