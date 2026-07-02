// 组合同步 settings pane (ADR 0007) — the menubar surface of the design bundle
// (design/project/sync). The heavy lifting (OAuth loopback + Drive REST) lives
// in the main process; this renderer only reflects MenubarSyncState and calls
// the sync actions, wrapping destructive ones in a confirm dialog.
//
// Engine syncs 组合核心 only; preferences and the AI key stay local, so the
// "查看同步内容" copy lists them under 不会同步.

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Cloud,
  CloudDownload,
  CloudUpload,
  EyeOff,
  FileWarning,
  GitMerge,
  HardDrive,
  KeyRound,
  Link2Off,
  LogIn,
  Minus,
  MonitorSmartphone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Unlink,
  X,
  type LucideIcon,
} from "lucide-react";
import { SYNC_SURFACE_LABEL } from "@tidal/core";
import { cFmtMoney } from "@shared/format";
import type { CoreCounts, MenubarSyncAction, MenubarSyncState, MenubarSyncStatus } from "@shared/sync";
import type { Palette } from "@shared/theme";
import { usePalette } from "@/hooks/usePalette";
import { useConfig } from "@/store/useMenubarStore";
import { Card } from "./Controls";

// ---- tone helpers -----------------------------------------------------------

type Tone = "ok" | "warn" | "info" | "error" | "muted";

function toneColor(tone: Tone, P: Palette): string {
  switch (tone) {
    case "ok":
      return P.isDark ? "#37c98c" : "#0f9d63";
    case "warn":
      return P.isDark ? "#e0ad62" : "#a9781f";
    case "error":
      return P.isDark ? "#ff6b6b" : "#cf3a33";
    case "info":
      return P.accent;
    default:
      return P.subtle;
  }
}

function toneSoft(tone: Tone, P: Palette): string {
  switch (tone) {
    case "ok":
      return P.isDark ? "rgba(55,201,140,0.10)" : "rgba(15,157,99,0.06)";
    case "error":
      return P.isDark ? "rgba(255,107,107,0.10)" : "rgba(207,58,51,0.055)";
    case "warn":
      return P.isDark ? "rgba(224,173,98,0.10)" : "rgba(169,120,31,0.06)";
    case "info":
      return P.isDark ? "rgba(185,166,255,0.10)" : "rgba(91,79,212,0.06)";
    default:
      return P.isDark ? "rgba(255,255,255,0.03)" : "rgba(40,30,20,0.03)";
  }
}

function money(n: number): string {
  return cFmtMoney(n, { dec: 0 });
}

function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (Date.now() - d.getTime() < 60_000) return "刚刚";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

// ---- primitives -------------------------------------------------------------

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";

function Btn({
  P,
  variant = "secondary",
  onClick,
  children,
  icon: IconCmp,
  disabled,
}: {
  P: Palette;
  variant?: BtnVariant;
  onClick?: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontFamily: "inherit",
    fontSize: 12.5,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    borderRadius: 999,
    padding: "8px 15px",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    opacity: disabled ? 0.45 : 1,
    border: "1px solid transparent",
  };
  let sty: CSSProperties;
  if (variant === "primary") sty = { ...base, background: P.accent, color: "#fff", fontWeight: 500 };
  else if (variant === "danger")
    sty = { ...base, background: "transparent", color: toneColor("error", P), border: `1px solid ${P.line}` };
  else if (variant === "ghost") sty = { ...base, background: "transparent", color: P.muted, padding: "8px 10px" };
  else sty = { ...base, background: "transparent", color: P.text, border: `1px solid ${P.line}` };
  const iconColor =
    variant === "primary" ? "#fff" : variant === "danger" ? toneColor("error", P) : P.muted;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={sty}>
      {IconCmp && <IconCmp size={13} color={iconColor} />}
      {children}
    </button>
  );
}

function Bullet({ P, icon: IconCmp, children }: { P: Palette; icon: LucideIcon; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}>
        <IconCmp size={14} color={P.subtle} />
      </span>
      <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function InfoBox({
  P,
  tone = "muted",
  icon: IconCmp = Sparkles,
  children,
}: {
  P: Palette;
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const c = toneColor(tone, P);
  const muted = tone === "muted";
  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        padding: "9px 11px",
        borderRadius: 9,
        background: toneSoft(tone, P),
        border: muted ? `1px solid ${P.lineSoft}` : "1px solid transparent",
      }}
    >
      <IconCmp size={14} color={muted ? P.subtle : c} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ fontSize: 11.5, color: muted ? P.muted : c, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function SummaryCard({
  P,
  kind,
  counts,
  at,
  source,
  emphasize,
}: {
  P: Palette;
  kind: "local" | "cloud";
  counts: CoreCounts;
  at?: string;
  source?: string | null;
  emphasize?: boolean;
}) {
  const isLocal = kind === "local";
  const IconCmp = isLocal ? MonitorSmartphone : Cloud;
  const empty = counts.holdings === 0 && counts.watch === 0;
  const metrics = [
    ["持仓", empty ? "—" : `${counts.holdings} 只`],
    ["自选", empty ? "—" : `${counts.watch} 只`],
    ["现金", empty ? "—" : money(counts.cash)],
  ];
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${emphasize ? P.accent : P.line}`,
        background: emphasize ? P.accentSoft : P.panelAlt,
        borderRadius: 10,
        padding: "12px 13px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
        <IconCmp size={14} color={emphasize ? P.accent : P.muted} />
        <span style={{ fontSize: 12.5, color: P.text, fontWeight: 500 }}>{isLocal ? "本机" : "云端"}</span>
        {!isLocal && source && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              color: P.subtle,
              background: P.chipBg,
              padding: "2px 7px",
              borderRadius: 6,
            }}
          >
            来自 {source}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: P.subtle, marginBottom: 3 }}>{label}</div>
            <div
              style={{
                fontSize: 12.5,
                color: P.text,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      {at && (
        <div
          style={{
            fontSize: 10.5,
            color: P.subtle,
            marginTop: 11,
            paddingTop: 9,
            borderTop: `1px solid ${P.lineSoft}`,
          }}
        >
          {isLocal ? "最近修改 " + at : "最近同步 " + at}
        </div>
      )}
    </div>
  );
}

function OpRow({
  P,
  icon: IconCmp,
  label,
  onClick,
  danger,
  disabled,
  last,
}: {
  P: Palette;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  last?: boolean;
}) {
  const color = danger ? toneColor("error", P) : P.text;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        textAlign: "left",
        padding: "10px 13px",
        background: "transparent",
        border: "none",
        borderBottom: last ? "none" : `1px solid ${P.lineSoft}`,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        color,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <IconCmp size={14} color={danger ? color : P.muted} />
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={14} color={P.subtle} />
    </button>
  );
}

// ---- status ------------------------------------------------------------------

function statusShort(status: MenubarSyncStatus): { tone: Tone; label: string } {
  switch (status) {
    case "synced":
      return { tone: "ok", label: "已同步" };
    case "pending":
      return { tone: "warn", label: "等待同步" };
    case "syncing":
      return { tone: "info", label: "正在同步…" };
    case "reauth":
      return { tone: "error", label: "需要重新登录" };
    case "conflict":
      return { tone: "error", label: "发现冲突" };
    case "failed":
      return { tone: "error", label: "同步失败" };
    default:
      return { tone: "ok", label: "已连接" };
  }
}

function StatusInline({ P, status }: { P: Palette; status: MenubarSyncStatus }) {
  const { tone, label } = statusShort(status);
  const c = toneColor(tone, P);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: c, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ---- content lists ----------------------------------------------------------

const SYNCED_ITEMS: [string, string][] = [
  ["持仓", "标的、数量、成本"],
  ["自选", "关注列表与分组"],
  ["现金", "现金余额"],
];
const NOT_SYNCED_ITEMS: [string, string][] = [
  ["AI API Key", "仅保存在本设备"],
  ["主题 / 周期 / 排序偏好", "各设备本地偏好"],
  ["菜单栏偏好 / 提醒规则", "各设备本地偏好"],
  ["行情缓存 / 派生数据", "随时可重新计算"],
  ["截图 / 临时状态", "会话级临时数据"],
];

// ---- dialogs ----------------------------------------------------------------

type DialogState =
  | { type: "content" }
  | { type: "conflict" }
  | { type: "disconnect" }
  | { type: "confirm"; kind: ConfirmKind };

type ConfirmKind = "uploadOverwrite" | "restoreOverwrite" | "badCloudOverwrite" | "deleteCloud";

function confirmMeta(kind: ConfirmKind): {
  title: string;
  icon: LucideIcon;
  keep?: string;
  over?: string;
  confirm: string;
  warn?: string;
  danger?: boolean;
  action: MenubarSyncAction;
} {
  switch (kind) {
    case "uploadOverwrite":
      return { title: "用本机数据覆盖云端？", icon: CloudUpload, keep: "本机", over: "云端", confirm: "覆盖云端", action: "uploadOverwrite" };
    case "restoreOverwrite":
      return { title: "用云端数据覆盖本机？", icon: CloudDownload, keep: "云端", over: "本机", confirm: "覆盖本机", action: "restoreOverwrite" };
    case "badCloudOverwrite":
      return { title: "用本机数据覆盖云端？", icon: CloudUpload, keep: "本机", over: "云端（已损坏）", confirm: "覆盖云端", warn: "云端数据已无法识别，将被本机配置整体替换。", action: "uploadOverwrite" };
    case "deleteCloud":
      return { title: "删除云端同步数据？", icon: Trash2, confirm: "删除并断开", danger: true, action: "deleteCloud" };
  }
}

function Dialog({
  P,
  title,
  onClose,
  children,
}: {
  P: Palette;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: P.overlay,
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: "100%",
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          background: P.panel,
          border: `1px solid ${P.line}`,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: P.isDark ? "0 24px 70px rgba(0,0,0,0.62)" : "0 24px 70px rgba(40,30,20,0.20)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            padding: "12px 16px",
            borderBottom: `1px solid ${P.line}`,
          }}
        >
          <span style={{ fontSize: 13.5, color: P.text, fontWeight: 500 }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: P.muted, cursor: "pointer", lineHeight: 1, padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 16, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

const dlgFooter: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 };

// ---- pane -------------------------------------------------------------------

export function SyncPane() {
  const P = usePalette();
  const config = useConfig();
  const [s, setS] = useState<MenubarSyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    let active = true;
    void window.tidal.getSyncState().then((st) => {
      if (active) setS(st);
    });
    const unsub = window.tidal.onSyncChanged((st) => setS(st));
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Dev-only handle for driving sync screens/dialogs in E2E/CDP checks. Only
  // active under electron-vite dev; never present in packaged builds.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __syncTest?: unknown };
    w.__syncTest = { setState: setS, setDialog };
    return () => {
      delete w.__syncTest;
    };
  }, []);

  const run = async (action: MenubarSyncAction) => {
    setBusy(true);
    setDialog(null);
    try {
      setS(await window.tidal.runSyncAction(action));
    } finally {
      setBusy(false);
    }
  };

  if (!s) return null;

  if (!s.configured) {
    return (
      <Card P={P}>
        <div style={{ padding: 16, fontSize: 13, color: P.muted, lineHeight: 1.6 }}>
          未配置 Google 客户端（client id / secret）。需要在启动前提供菜单栏的 Desktop OAuth 凭据。
        </div>
      </Card>
    );
  }

  const locking = busy || s.status === "syncing";
  const localCounts: CoreCounts = {
    holdings: config.holdings.length,
    watch: config.watch.length,
    cash: config.cash,
  };
  const sourceLabel = s.source ? SYNC_SURFACE_LABEL[s.source] : null;

  // -- disconnected --
  if (!s.connected) {
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, color: P.text, fontWeight: 500 }}>未连接 Google Drive</div>
            <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.55, marginTop: 6 }}>
              连接后，可在菜单栏客户端、网页端与移动网页之间同步你的 Tidal 配置。
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <Bullet P={P} icon={ShieldCheck}>只访问 Tidal 自己的 Google Drive 应用数据区，不读取你的 Drive 文件列表。</Bullet>
            <Bullet P={P} icon={EyeOff}>同步文件不会出现在你的 Drive 文件列表里。</Bullet>
            <Bullet P={P} icon={KeyRound}>AI API Key 不会同步，仅保存在本设备。</Bullet>
          </div>
          {s.errorMsg && (
            <InfoBox P={P} tone="error" icon={TriangleAlert}>
              {s.errorMsg}
            </InfoBox>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 2 }}>
            <Btn P={P} onClick={() => setDialog({ type: "content" })}>查看同步内容</Btn>
            <Btn P={P} variant="primary" icon={Cloud} disabled={locking} onClick={() => void run("connect")}>
              {locking ? "连接中…" : "连接 Google Drive"}
            </Btn>
          </div>
        </div>
        {dialog && <SyncDialog P={P} dialog={dialog} s={s} localCounts={localCounts} sourceLabel={sourceLabel} onClose={() => setDialog(null)} run={run} busy={busy} />}
      </>
    );
  }

  const initial = (s.account?.name || s.account?.email || "G").charAt(0).toUpperCase();

  const kv: [string, string][] = [
    ["最近同步时间", s.status === "syncing" ? "同步中…" : timeLabel(s.lastSyncAt)],
    ["最近同步来源", sourceLabel ?? "—"],
    ["本机未同步更改", s.hasLocalChanges ? "有" : "无"],
  ];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* account row */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: P.accentSoft,
              color: P.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: P.text, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.account?.name ?? "Google 账户"}
            </div>
            <div style={{ fontSize: 11.5, color: P.subtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.account?.email ?? ""}
            </div>
          </div>
          <StatusInline P={P} status={s.status} />
        </div>

        <StatusBanner P={P} s={s} busy={busy} run={run} openDialog={setDialog} />

        {/* detail table */}
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 10, overflow: "hidden" }}>
          {kv.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 13px",
                borderBottom: i < kv.length - 1 ? `1px solid ${P.lineSoft}` : "none",
              }}
            >
              <span style={{ fontSize: 12.5, color: P.muted }}>{k}</span>
              <span style={{ fontSize: 12.5, color: v === "有" ? toneColor("warn", P) : P.text, fontVariantNumeric: "tabular-nums" }}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* operations */}
        <div>
          <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", margin: "0 0 8px 2px", textTransform: "uppercase" }}>
            操作
          </div>
          <div style={{ border: `1px solid ${P.line}`, borderRadius: 10, overflow: "hidden" }}>
            <OpRow P={P} icon={RefreshCw} label="立即同步" disabled={locking} onClick={() => void run("syncNow")} />
            <OpRow P={P} icon={CloudDownload} label="从云端恢复" disabled={locking} onClick={() => setDialog({ type: "confirm", kind: "restoreOverwrite" })} />
            <OpRow P={P} icon={CloudUpload} label="上传本机覆盖云端" disabled={locking} onClick={() => setDialog({ type: "confirm", kind: "uploadOverwrite" })} />
            <OpRow P={P} icon={Unlink} label="断开连接" danger last onClick={() => setDialog({ type: "disconnect" })} />
          </div>
        </div>

        <InfoBox P={P} icon={Clock}>菜单栏客户端会在启动时同步，并定时检查云端变化。</InfoBox>
      </div>
      {dialog && <SyncDialog P={P} dialog={dialog} s={s} localCounts={localCounts} sourceLabel={sourceLabel} onClose={() => setDialog(null)} run={run} busy={busy} />}
    </>
  );
}

// Recovery banner — only for states needing an action the account row can't
// provide (reauth / conflict / failed). Everyday states show no banner.
function StatusBanner({
  P,
  s,
  busy,
  run,
  openDialog,
}: {
  P: Palette;
  s: MenubarSyncState;
  busy: boolean;
  run: (action: MenubarSyncAction) => void;
  openDialog: (d: DialogState) => void;
}) {
  const wrap = (icon: LucideIcon, text: string, actions: ReactNode) => {
    const c = toneColor("error", P);
    const I = icon;
    return (
      <div
        style={{
          background: toneSoft("error", P),
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          <I size={15} color={c} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: c, fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
      </div>
    );
  };

  if (s.status === "reauth")
    return wrap(
      KeyRound,
      "Google 授权已过期，需要重新登录",
      <Btn P={P} variant="primary" icon={LogIn} disabled={busy} onClick={() => run("connect")}>重新登录</Btn>,
    );
  if (s.status === "conflict")
    return wrap(
      GitMerge,
      "发现同步冲突：本机与云端都发生了更改",
      <Btn P={P} variant="primary" icon={ArrowRightLeft} onClick={() => openDialog({ type: "conflict" })}>处理冲突</Btn>,
    );
  if (s.status === "failed") {
    if (s.failKind === "badCloud")
      return wrap(
        FileWarning,
        "云端同步数据无法识别",
        <>
          <Btn P={P} disabled={busy} onClick={() => run("syncNow")}>重试</Btn>
          <Btn P={P} variant="danger" onClick={() => openDialog({ type: "confirm", kind: "badCloudOverwrite" })}>用本机覆盖云端</Btn>
        </>,
      );
    return wrap(
      TriangleAlert,
      "同步失败，可稍后重试",
      <Btn P={P} variant="primary" icon={RefreshCw} disabled={busy} onClick={() => run("syncNow")}>重试</Btn>,
    );
  }
  return null;
}

function SyncDialog({
  P,
  dialog,
  s,
  localCounts,
  sourceLabel,
  onClose,
  run,
  busy,
}: {
  P: Palette;
  dialog: DialogState;
  s: MenubarSyncState;
  localCounts: CoreCounts;
  sourceLabel: string | null;
  onClose: () => void;
  run: (action: MenubarSyncAction) => void;
  busy: boolean;
}) {
  if (dialog.type === "content") {
    const Item = ({ ok, k, d }: { ok: boolean; k: string; d: string }) => (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0" }}>
        {ok ? (
          <Check size={14} color={toneColor("ok", P)} style={{ marginTop: 1, flexShrink: 0 }} />
        ) : (
          <Minus size={14} color={P.subtle} style={{ marginTop: 1, flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: P.text }}>{k}</span>
          <span style={{ fontSize: 11, color: P.subtle, marginLeft: 8 }}>{d}</span>
        </div>
      </div>
    );
    return (
      <Dialog P={P} title="同步内容" onClose={onClose}>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>会同步</div>
        <div style={{ marginBottom: 16 }}>{SYNCED_ITEMS.map(([k, d]) => <Item key={k} ok k={k} d={d} />)}</div>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>不会同步</div>
        <div>{NOT_SYNCED_ITEMS.map(([k, d]) => <Item key={k} ok={false} k={k} d={d} />)}</div>
        <div style={dlgFooter}>
          <Btn P={P} onClick={onClose}>知道了</Btn>
        </div>
      </Dialog>
    );
  }

  if (dialog.type === "conflict") {
    return (
      <Dialog P={P} title="处理同步冲突" onClose={onClose}>
        <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.55, marginBottom: 16 }}>
          这台设备和云端都发生了更改，需要选择保留哪一份。第一版为整体覆盖，暂不做逐项合并。
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <SummaryCard P={P} kind="local" counts={localCounts} />
          <SummaryCard P={P} kind="cloud" counts={s.cloudPreview ?? { holdings: 0, watch: 0, cash: 0 }} source={sourceLabel} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Btn P={P} variant="primary" icon={CloudUpload} disabled={busy} onClick={() => run("uploadOverwrite")}>保留本机，覆盖云端</Btn>
          <Btn P={P} icon={CloudDownload} disabled={busy} onClick={() => run("restoreOverwrite")}>使用云端，覆盖本机</Btn>
          <Btn P={P} variant="ghost" onClick={onClose}>先不处理</Btn>
        </div>
      </Dialog>
    );
  }

  if (dialog.type === "disconnect") {
    return (
      <Dialog P={P} title="断开连接" onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <Bullet P={P} icon={HardDrive}>断开后，本机数据仍会完整保留。</Bullet>
          <Bullet P={P} icon={Cloud}>不会删除 Google Drive 中已同步的数据。</Bullet>
          <Bullet P={P} icon={RotateCcw}>之后可以重新连接并继续同步。</Bullet>
        </div>
        <div style={dlgFooter}>
          <Btn P={P} onClick={onClose}>取消</Btn>
          <Btn P={P} variant="danger" icon={Unlink} disabled={busy} onClick={() => run("disconnect")}>断开连接</Btn>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${P.lineSoft}` }}>
          <button
            onClick={() => run("deleteCloud")}
            disabled={busy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "transparent",
              border: "none",
              cursor: busy ? "default" : "pointer",
              fontFamily: "inherit",
              padding: 0,
              color: toneColor("error", P),
              fontSize: 11.5,
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Trash2 size={13} color={toneColor("error", P)} />
            删除云端同步数据并断开连接
          </button>
        </div>
      </Dialog>
    );
  }

  // confirm
  const meta = confirmMeta(dialog.kind);
  return (
    <Dialog P={P} title={meta.title} onClose={onClose}>
      {dialog.kind === "deleteCloud" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <Bullet P={P} icon={Cloud}>删除后，其他设备将无法再从云端恢复这份配置。</Bullet>
          <Bullet P={P} icon={HardDrive}>本机数据仍会完整保留。</Bullet>
          <Bullet P={P} icon={Link2Off}>同时会断开与 Google Drive 的连接。</Bullet>
        </div>
      ) : (
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: `1px solid ${P.lineSoft}` }}>
            <CircleCheck size={16} color={toneColor("ok", P)} />
            <span style={{ fontSize: 12.5, color: P.muted }}>将保留</span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: P.text, fontWeight: 500 }}>{meta.keep}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px" }}>
            <CircleX size={16} color={toneColor("error", P)} />
            <span style={{ fontSize: 12.5, color: P.muted }}>将覆盖</span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: P.text, fontWeight: 500 }}>{meta.over}</span>
          </div>
        </div>
      )}
      {meta.warn && (
        <div style={{ marginBottom: 12 }}>
          <InfoBox P={P} tone="error" icon={TriangleAlert}>{meta.warn}</InfoBox>
        </div>
      )}
      <InfoBox P={P} icon={KeyRound}>此操作为整体配置覆盖，不会同步你的 AI API Key。</InfoBox>
      <div style={dlgFooter}>
        <Btn P={P} onClick={onClose}>取消</Btn>
        <Btn P={P} variant={meta.danger ? "danger" : "primary"} icon={meta.icon} disabled={busy} onClick={() => run(meta.action)}>
          {meta.confirm}
        </Btn>
      </div>
    </Dialog>
  );
}
