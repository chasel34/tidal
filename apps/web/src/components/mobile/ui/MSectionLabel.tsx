"use client";

import { ReactNode } from "react";
import type { Palette } from "@/lib/theme";

interface MSectionLabelProps {
  P: Palette;
  children: ReactNode;
  action?: ReactNode;
}

export function MSectionLabel({ P, children, action }: MSectionLabelProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 4px 10px", paddingTop: 4 }}>
      <span style={{ fontSize: 13, color: P.subtle, letterSpacing: "0.04em", fontWeight: 600 }}>{children}</span>
      {action && <span>{action}</span>}
    </div>
  );
}
