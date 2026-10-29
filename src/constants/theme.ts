export type Palette = {
  background: string;
  text: string;
  muted: string;
  card: string;
  buttonBackground: string;
  buttonText: string;
};

export const Colors: { light: Palette; dark: Palette } = {
  light: {
    background: "#FFFBF7",
    text: "#3D3530",
    muted: "#8C7F76",
    card: "#F7EEE6",
    buttonBackground: "#F2C9B0",
    buttonText: "#3D3530",
  },
  dark: {
    background: "#1A1715",
    text: "#F8E8D8",
    muted: "#A89A90",
    card: "#26211E",
    buttonBackground: "#F8E8D8",
    buttonText: "#3D3530",
  },
};
