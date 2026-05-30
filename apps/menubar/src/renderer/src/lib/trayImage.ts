// Renders the macOS menu-bar item (Lucide "Waves" glyph + optional colored
// label) to a transparent PNG so the percentage can keep its 红涨绿跌 color —
// something `tray.setTitle` cannot do natively. The bitmap is handed to the
// main process, which wraps it in a nativeImage.

import type { TrayImageBitmap } from "@shared/ipc";
import { cFmtMoney, cFmtPct } from "@shared/format";
import { moveColor } from "@shared/theme";
import type { MenubarConfig, ResolvedTheme } from "@shared/types";

// Lucide 1.16 "Waves" path data (viewBox 0 0 24 24), three stacked wave lines.
const WAVES_PATHS = [
  "M2 5q2.5 2 5 0t5 0 5 0 5 0",
  "M2 12q2.5 2 5 0t5 0 5 0 5 0",
  "M2 19q2.5 2 5 0t5 0 5 0 5 0",
];

const TRAY_FONT = '500 12.5px -apple-system, "SF Pro Text", "PingFang SC", system-ui, sans-serif';
const ICON_SIZE = 15;
const BAR_HEIGHT = 22;
const GAP = 5;

function wavesSvg(color: string): string {
  const paths = WAVES_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="2.2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  );
}

// Cache decoded glyphs per color — the icon only changes when the menu-bar
// appearance flips, so the steady-state path skips the SVG decode entirely.
const iconCache = new Map<string, Promise<HTMLImageElement>>();
function loadIcon(color: string): Promise<HTMLImageElement> {
  let icon = iconCache.get(color);
  if (!icon) {
    icon = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(wavesSvg(color));
    });
    iconCache.set(color, icon);
  }
  return icon;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measureLabel(label: string): number {
  if (!label) return 0;
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) measureCtx.font = TRAY_FONT;
  }
  return measureCtx ? Math.ceil(measureCtx.measureText(label).width) : label.length * 8;
}

export interface TrayDescriptor {
  /** Text drawn after the icon; empty string renders icon-only. */
  label: string;
  iconColor: string;
  labelColor: string;
  tooltip: string;
}

// Pure mapping from app state to what the menu-bar item should show. The menu
// bar follows the *system* appearance, not the in-app theme.
export function describeTray(opts: {
  mode: MenubarConfig["menubarMode"];
  conv: MenubarConfig["conv"];
  hasPortfolio: boolean;
  systemTheme: ResolvedTheme;
  todayPct: number;
  todayDelta: number;
  totalAssets: number;
}): TrayDescriptor {
  const iconColor = opts.systemTheme === "dark" ? "rgba(240,240,245,0.92)" : "rgba(30,28,24,0.88)";
  let label = "";
  let labelColor = iconColor;
  if (opts.hasPortfolio) {
    if (opts.mode === "percent") {
      label = cFmtPct(opts.todayPct);
      labelColor = moveColor(opts.todayDelta, opts.systemTheme, opts.conv);
    } else if (opts.mode === "total") {
      label = cFmtMoney(opts.totalAssets, { dec: 0 });
    }
  }
  return { label, iconColor, labelColor, tooltip: label ? `Tidal ${label}` : "Tidal 菜单栏看板" };
}

export async function renderTrayImage(descriptor: TrayDescriptor): Promise<TrayImageBitmap | null> {
  if (typeof document === "undefined") return null;
  try {
    const scaleFactor = Math.max(1, Math.round(window.devicePixelRatio || 2));
    const textWidth = measureLabel(descriptor.label);
    const width = ICON_SIZE + (descriptor.label ? GAP + textWidth : 0);

    const icon = await loadIcon(descriptor.iconColor);

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scaleFactor);
    canvas.height = Math.ceil(BAR_HEIGHT * scaleFactor);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scaleFactor, scaleFactor);
    ctx.clearRect(0, 0, width, BAR_HEIGHT);
    ctx.drawImage(icon, 0, (BAR_HEIGHT - ICON_SIZE) / 2, ICON_SIZE, ICON_SIZE);
    if (descriptor.label) {
      ctx.font = TRAY_FONT;
      ctx.fillStyle = descriptor.labelColor;
      ctx.textBaseline = "middle";
      ctx.fillText(descriptor.label, ICON_SIZE + GAP, BAR_HEIGHT / 2 + 0.5);
    }

    return { dataURL: canvas.toDataURL("image/png"), width, height: BAR_HEIGHT, scaleFactor };
  } catch {
    return null;
  }
}
