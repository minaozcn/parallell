import type { Palette } from "./theme";

// Bir kenarlık/çerçevenin nasıl çizileceği:
//   solid    → tek renk
//   gradient → renk geçişi
//   animated → kenar boyunca sürekli dönen renk geçişi (en dikkat çekici)
export type FrameLook =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; colors: [string, string, ...string[]] }
  | { kind: "animated"; colors: [string, string, ...string[]]; glow: string };

const AURORA: FrameLook = {
  kind: "animated",
  colors: ["#7F5AF0", "#2CB1BC", "#7CF5C8", "#FF7AB6", "#7F5AF0"],
  glow: "#9B7BFF",
};

// Fotoğraf kenarlıkları (mağazadaki "style" anahtarına göre)
export const BORDERS: Record<string, FrameLook> = {
  glow: { kind: "solid", color: "#F2C9B0" },
  sage: { kind: "solid", color: "#B7C9A8" },
  ink: { kind: "solid", color: "#2B3A55" },
  lavender: { kind: "gradient", colors: ["#C8B6E2", "#F2C9B0"] },
  golden: { kind: "gradient", colors: ["#F6D365", "#FDA085"] },
  aurora: AURORA,
};

// Profil çerçeveleri
export const FRAMES: Record<string, FrameLook> = {
  peach: { kind: "solid", color: "#E8B9A0" },
  cream: { kind: "solid", color: "#EADBC8" },
  ocean: { kind: "gradient", colors: ["#89F7FE", "#66A6FF"] },
  rose: { kind: "gradient", colors: ["#F7CAC9", "#92A8D1"] },
  ember: { kind: "gradient", colors: ["#F83600", "#F9D423"] },
  aurora: AURORA,
};

export const THEMES: Record<string, { palette: Palette; isDark: boolean }> = {
  night: {
    isDark: true,
    palette: { background: "#141A2E", text: "#E8ECF8", muted: "#8D96B3", card: "#1F2742", buttonBackground: "#F8E8D8", buttonText: "#3D3530" },
  },
  sakura: {
    isDark: false,
    palette: { background: "#FFF5F7", text: "#4A3540", muted: "#A88A96", card: "#FBE4EA", buttonBackground: "#F4B6C6", buttonText: "#4A3540" },
  },
  forest: {
    isDark: true,
    palette: { background: "#16201A", text: "#E3EEDF", muted: "#8FA593", card: "#213027", buttonBackground: "#B7C9A8", buttonText: "#16201A" },
  },
};
