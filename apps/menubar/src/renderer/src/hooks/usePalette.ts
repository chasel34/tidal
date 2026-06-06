import { useMemo } from "react";
import { tidalPalette } from "@shared/theme";
import { useResolvedTheme } from "@/store/useMenubarStore";

export function usePalette() {
  const theme = useResolvedTheme();
  return useMemo(() => tidalPalette(theme), [theme]);
}
