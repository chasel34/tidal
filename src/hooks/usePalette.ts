"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { tidalPalette, type Palette } from "@/lib/theme";

export function usePalette(): Palette {
  const { theme } = useStore();
  return useMemo(() => tidalPalette(theme), [theme]);
}
