import type { Palette } from "./theme";

// Mağazadaki her ürünün "style" anahtarının uygulamadaki görsel karşılığı.
export const BORDER_COLORS: Record<string, string> = {
  glow: "#F2C9B0",
};

export const FRAME_COLORS: Record<string, string> = {
  peach: "#E8B9A0",
};

export const THEMES: Record<string, { palette: Palette; isDark: boolean }> = {
  night: {
    isDark: true,
    palette: {
      background: "#141A2E",
      text: "#E8ECF8",
      muted: "#8D96B3",
      card: "#1F2742",
      buttonBackground: "#F8E8D8",
      buttonText: "#3D3530",
    },
  },
};
