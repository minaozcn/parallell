import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { THEMES } from "@/constants/cosmetics";
import { fetchMe } from "@/api/account";

type ThemeState = { themeStyle: string | null; setThemeStyle: (style: string | null) => void };

// Context: bir değeri tüm bileşen ağacına "yaymanın" yolu. Her ekrana prop olarak taşımak zorunda kalmayız.
const ThemeContext = createContext<ThemeState>({ themeStyle: null, setThemeStyle: () => {} });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeStyle, setThemeStyle] = useState<string | null>(null);

  // Açılışta kullanıcının taktığı temayı sunucudan öğren
  useEffect(() => {
    fetchMe()
      .then((me) => setThemeStyle(me.equipped.theme))
      .catch(() => {}); // sunucuya ulaşılamazsa sistem temasıyla devam
  }, []);

  return <ThemeContext.Provider value={{ themeStyle, setThemeStyle }}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);

// Takılı bir tema varsa onu, yoksa telefonun açık/koyu ayarını kullan
export function usePalette() {
  const scheme = useColorScheme();
  const { themeStyle } = useAppTheme();
  const theme = themeStyle ? THEMES[themeStyle] : undefined;
  if (theme) return { colors: theme.palette, isDark: theme.isDark };
  const isDark = scheme === "dark";
  return { colors: Colors[isDark ? "dark" : "light"], isDark };
}
