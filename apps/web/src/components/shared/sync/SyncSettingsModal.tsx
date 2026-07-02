"use client";

// 组合同步 settings surface (ADR 0007). One Modal that renders the disconnected
// / first-sync / connected screens plus the dialogs and the OAuth waiting
// overlay, all driven by useSync. Shared by the pc and mobile routes.
//
// Visual language mirrors the design bundle (design/project/sync): lucide icons
// throughout, pill buttons (primary/secondary/danger/ghost), summary cards with
// a surface icon, and a recovery-only status banner — everyday states (synced /
// pending / syncing) are conveyed by the account row + detail table alone.

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Cloud,
  CloudDownload,
  CloudOff,
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
  type LucideIcon,
} from "lucide-react";
import {
  normalizeCore,
  summarizeCore,
  SYNC_SURFACE_LABEL,
  type CoreSummary,
  type PortfolioCore,
} from "@tidal/core";
import type { Palette } from "@/lib/theme";
import { useTidalStore } from "@/store/useStore";
import { useSync, type ConfirmKind, type FailKind, type SyncStatus } from "@/store/useSync";

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
  return "¥" + Math.round(n).toLocaleString("en-US");
}

function localCore(): PortfolioCore {
  const s = useTidalStore.getState();
  return normalizeCore({ holdings: s.holdings, watch: s.watch, cash: s.cash });
}

function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "刚刚";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

// ---- small pieces -----------------------------------------------------------

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";

function Btn({
  P,
  variant = "secondary",
  onClick,
  children,
  icon: IconCmp,
  full,
  disabled,
}: {
  P: Palette;
  variant?: BtnVariant;
  onClick?: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  full?: boolean;
  disabled?: boolean;
}) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    borderRadius: 999,
    padding: full ? "12px 18px" : "9px 16px",
    whiteSpace: "nowrap",
    width: full ? "100%" : "auto",
    boxSizing: "border-box",
    opacity: disabled ? 0.45 : 1,
    border: "1px solid transparent",
  };
  let sty: CSSProperties;
  if (variant === "primary") sty = { ...base, background: P.accent, color: "#fff", fontWeight: 500 };
  else if (variant === "danger")
    sty = { ...base, background: "transparent", color: toneColor("error", P), border: `1px solid ${P.line}` };
  else if (variant === "ghost")
    sty = { ...base, background: "transparent", color: P.muted, padding: full ? "12px 18px" : "9px 10px" };
  else sty = { ...base, background: "transparent", color: P.text, border: `1px solid ${P.line}` };
  const iconColor =
    variant === "primary" ? "#fff" : variant === "danger" ? toneColor("error", P) : P.muted;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={sty}>
      {IconCmp && <IconCmp size={14} color={iconColor} />}
      {children}
    </button>
  );
}

function Spinner({ P, size = 13, color }: { P: Palette; size?: number; color?: string }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-block",
        border: `2px solid ${P.isDark ? "rgba(255,255,255,0.18)" : "rgba(40,30,20,0.12)"}`,
        borderTopColor: color || P.accent,
        animation: "tidalspin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function Heading({ P, title, desc }: { P: Palette; title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 16, color: P.text, fontWeight: 500, letterSpacing: "-0.01em" }}>{title}</div>
      {desc && (
        <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, marginTop: 6 }}>{desc}</div>
      )}
    </div>
  );
}

function Bullet({ P, icon: IconCmp, children }: { P: Palette; icon: LucideIcon; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}>
        <IconCmp size={15} color={P.subtle} />
      </span>
      <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.5 }}>{children}</div>
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
        padding: "10px 12px",
        borderRadius: 11,
        background: toneSoft(tone, P),
        border: muted ? `1px solid ${P.lineSoft}` : "1px solid transparent",
      }}
    >
      <IconCmp size={15} color={muted ? P.subtle : c} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ fontSize: 12.5, color: muted ? P.muted : c, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function SummaryCard({
  P,
  kind,
  summary,
  at,
  source,
  emphasize,
}: {
  P: Palette;
  kind: "local" | "cloud";
  summary: CoreSummary;
  at?: string;
  source?: string | null;
  emphasize?: boolean;
}) {
  const isLocal = kind === "local";
  const IconCmp = isLocal ? MonitorSmartphone : Cloud;
  const empty = summary.holdings === 0 && summary.watch === 0;
  const metrics = [
    ["持仓", empty ? "—" : `${summary.holdings} 只`],
    ["自选", empty ? "—" : `${summary.watch} 只`],
    ["现金", empty ? "—" : money(summary.cash)],
  ];
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${emphasize ? P.accent : P.line}`,
        background: emphasize ? P.accentSoft : P.panelAlt,
        borderRadius: 12,
        padding: "13px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <IconCmp size={15} color={emphasize ? P.accent : P.muted} />
        <span style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>{isLocal ? "本机" : "云端"}</span>
        {!isLocal && source && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
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
            <div style={{ fontSize: 11, color: P.subtle, marginBottom: 3 }}>{label}</div>
            <div
              style={{
                fontSize: 14,
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
            fontSize: 11,
            color: P.subtle,
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${P.lineSoft}`,
          }}
        >
          {isLocal ? "最近修改 " + at : "最近同步 " + at}
        </div>
      )}
    </div>
  );
}

const actionRow: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 4,
  flexWrap: "wrap",
};

// ---- content lists ----------------------------------------------------------
// Engine syncs 组合核心 only (ADR 0007); preferences and the AI key stay local,
// so the copy lists them under 不会同步 — the panel never claims otherwise.

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

// ---- status ------------------------------------------------------------------

function statusShort(status: SyncStatus): { tone: Tone; label: string } {
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

function StatusInline({ P, status }: { P: Palette; status: SyncStatus }) {
  const { tone, label } = statusShort(status);
  const c = toneColor(tone, P);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: c, fontWeight: 500 }}
    >
      {tone === "info" ? (
        <Spinner P={P} size={11} color={c} />
      ) : (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
      )}
      {label}
    </span>
  );
}

// Recovery banner — drawn only for states that need an action the account row
// can't provide (reauth / conflict / failed). Everyday states show no banner.
function StatusBanner({
  P,
  status,
  failKind,
}: {
  P: Palette;
  status: SyncStatus;
  failKind: FailKind | null;
}) {
  const syncNow = useSync((s) => s.syncNow);
  const reauthLogin = useSync((s) => s.reauthLogin);
  const openDialog = useSync((s) => s.openDialog);

  const wrap = (icon: LucideIcon, text: string, actions: ReactNode) => {
    const c = toneColor("error", P);
    return (
      <div
        style={{
          background: toneSoft("error", P),
          borderRadius: 12,
          padding: "11px 13px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          {(() => {
            const I = icon;
            return <I size={17} color={c} style={{ flexShrink: 0 }} />;
          })()}
          <span style={{ fontSize: 13, color: c, fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
      </div>
    );
  };

  if (status === "reauth")
    return wrap(
      KeyRound,
      "Google 授权已过期，需要重新登录",
      <Btn P={P} variant="primary" icon={LogIn} onClick={() => void reauthLogin()}>
        重新登录
      </Btn>,
    );
  if (status === "conflict")
    return wrap(
      GitMerge,
      "发现同步冲突：本机与云端都发生了更改",
      <Btn P={P} variant="primary" icon={ArrowRightLeft} onClick={() => openDialog({ type: "conflict" })}>
        处理冲突
      </Btn>,
    );
  if (status === "failed") {
    if (failKind === "badCloud")
      return wrap(
        FileWarning,
        "云端同步数据无法识别",
        <>
          <Btn P={P} onClick={() => void syncNow()}>
            重试
          </Btn>
          <Btn P={P} variant="danger" onClick={() => openDialog({ type: "confirm", kind: "badCloudOverwrite" })}>
            用本机覆盖云端
          </Btn>
        </>,
      );
    if (failKind === "localWrite")
      return wrap(
        HardDrive,
        "无法保存到本机",
        <Btn P={P} variant="primary" icon={RefreshCw} onClick={() => void syncNow()}>
          重试
        </Btn>,
      );
    return wrap(
      TriangleAlert,
      "同步失败，可稍后重试",
      <Btn P={P} variant="primary" icon={RefreshCw} onClick={() => void syncNow()}>
        重试
      </Btn>,
    );
  }
  return null;
}

// ---- screens ----------------------------------------------------------------

function DisconnectedScreen({ P }: { P: Palette }) {
  const connect = useSync((s) => s.connect);
  const openDialog = useSync((s) => s.openDialog);
  const errorMsg = useSync((s) => s.errorMsg);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Heading
        P={P}
        title="未连接 Google Drive"
        desc="连接后，可在网页端、移动网页与菜单栏客户端之间同步你的 Tidal 配置。"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Bullet P={P} icon={ShieldCheck}>
          只访问 Tidal 自己的 Google Drive 应用数据区，不读取你的 Drive 文件列表。
        </Bullet>
        <Bullet P={P} icon={EyeOff}>
          同步文件不会出现在你的 Drive 文件列表里。
        </Bullet>
        <Bullet P={P} icon={KeyRound}>
          AI API Key 不会同步，仅保存在本设备。
        </Bullet>
      </div>
      {errorMsg && (
        <InfoBox P={P} tone="error" icon={TriangleAlert}>
          {errorMsg}
        </InfoBox>
      )}
      <div style={actionRow}>
        <Btn P={P} onClick={() => openDialog({ type: "content" })}>
          查看同步内容
        </Btn>
        <Btn P={P} variant="primary" icon={Cloud} onClick={() => void connect()}>
          连接 Google Drive
        </Btn>
      </div>
    </div>
  );
}

function FirstSyncScreen({ P }: { P: Palette }) {
  const fsCase = useSync((s) => s.fsCase);
  const cloudPreview = useSync((s) => s.cloudPreview);
  const source = useSync((s) => s.source);
  const firstSync = useSync((s) => s.firstSync);
  const openDialog = useSync((s) => s.openDialog);
  const local = summarizeCore(localCore());
  const cloud = cloudPreview ? summarizeCore(cloudPreview) : null;
  const sourceLabel = source ? SYNC_SURFACE_LABEL[source] : null;

  if (fsCase === "A") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Heading P={P} title="这是第一次同步" desc="将本机配置上传到 Google Drive 应用数据区。之后其它设备即可取得这份配置。" />
        <SummaryCard P={P} kind="local" summary={local} emphasize />
        <InfoBox P={P} icon={Sparkles}>推荐：本机有数据、云端为空 — 上传本机。</InfoBox>
        <div style={actionRow}>
          <Btn P={P} variant="ghost" onClick={() => void firstSync("later")}>稍后再说</Btn>
          <Btn P={P} variant="primary" icon={CloudUpload} onClick={() => void firstSync("upload")}>上传本机数据</Btn>
        </div>
      </div>
    );
  }
  if (fsCase === "B") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Heading P={P} title="已连接 Google Drive" desc="当前没有可同步的数据。开始添加持仓或自选后，更改会自动同步。" />
        <SummaryCard P={P} kind="local" summary={local} />
        <div style={actionRow}>
          <Btn P={P} onClick={() => void firstSync("syncEmpty")}>立即同步</Btn>
          <Btn P={P} variant="primary" icon={Check} onClick={() => void firstSync("finish")}>完成</Btn>
        </div>
      </div>
    );
  }
  if (fsCase === "C") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Heading P={P} title="云端有可恢复的配置" desc="本机当前为空。可以从云端恢复这份配置到本设备。" />
        <SummaryCard P={P} kind="cloud" summary={cloud ?? local} source={sourceLabel} emphasize />
        <InfoBox P={P} icon={Sparkles}>推荐：本机为空、云端有数据 — 从云端恢复。</InfoBox>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
          <Btn P={P} variant="danger" onClick={() => openDialog({ type: "confirm", kind: "emptyOverwrite" })}>保留本机空数据并覆盖云端</Btn>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn P={P} variant="ghost" onClick={() => void firstSync("later")}>稍后决定</Btn>
            <Btn P={P} variant="primary" icon={CloudDownload} onClick={() => void firstSync("restore")}>从云端恢复</Btn>
          </div>
        </div>
      </div>
    );
  }
  // D
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Heading P={P} title="两端都有数据" desc="请选择保留哪一份。第一版为整体配置覆盖，暂不做逐项合并。" />
      <div style={{ display: "flex", gap: 10 }}>
        <SummaryCard P={P} kind="local" summary={local} />
        <SummaryCard P={P} kind="cloud" summary={cloud ?? local} source={sourceLabel} />
      </div>
      <div style={actionRow}>
        <Btn P={P} variant="ghost" onClick={() => void firstSync("later")}>稍后决定</Btn>
        <Btn P={P} icon={CloudDownload} onClick={() => openDialog({ type: "confirm", kind: "restoreOverwrite" })}>使用云端覆盖本机</Btn>
        <Btn P={P} variant="primary" icon={CloudUpload} onClick={() => openDialog({ type: "confirm", kind: "uploadOverwrite" })}>使用本机覆盖云端</Btn>
      </div>
    </div>
  );
}

function ConnectedScreen({ P, isMobile }: { P: Palette; isMobile?: boolean }) {
  const status = useSync((s) => s.status);
  const failKind = useSync((s) => s.failKind);
  const lastSyncAt = useSync((s) => s.lastSyncAt);
  const source = useSync((s) => s.source);
  const syncNow = useSync((s) => s.syncNow);
  const openDialog = useSync((s) => s.openDialog);

  const kv: [string, string][] = [
    ["最近同步时间", status === "syncing" ? "同步中…" : timeLabel(lastSyncAt)],
    ["最近同步来源", source ? SYNC_SURFACE_LABEL[source] : "—"],
    ["本机未同步更改", status === "pending" || status === "conflict" ? "有" : "无"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <StatusBanner P={P} status={status} failKind={failKind} />

      <div style={{ border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden" }}>
        {kv.map(([k, v], i) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 13px",
              borderBottom: i < kv.length - 1 ? `1px solid ${P.lineSoft}` : "none",
            }}
          >
            <span style={{ fontSize: 13, color: P.muted }}>{k}</span>
            <span
              style={{
                fontSize: 13,
                color: v === "有" ? toneColor("warn", P) : P.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", margin: "0 2px 9px", textTransform: "uppercase" }}>
          操作
        </div>
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden" }}>
          <OpRow P={P} icon={RefreshCw} label="立即同步" onClick={() => void syncNow()} disabled={status === "syncing"} />
          <OpRow P={P} icon={CloudDownload} label="从云端恢复" onClick={() => openDialog({ type: "confirm", kind: "restoreOverwrite" })} disabled={status === "syncing"} />
          <OpRow P={P} icon={CloudUpload} label="上传本机覆盖云端" onClick={() => openDialog({ type: "confirm", kind: "uploadOverwrite" })} disabled={status === "syncing"} />
          <OpRow P={P} icon={Unlink} label="断开连接" danger last onClick={() => openDialog({ type: "disconnect" })} />
        </div>
      </div>

      <InfoBox P={P} icon={CloudOff}>
        {isMobile ? "移动网页" : "网页端"}不承诺后台同步：打开页面时拉取云端，更改后稍候自动上传。
      </InfoBox>
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
        padding: "11px 13px",
        background: "transparent",
        border: "none",
        borderBottom: last ? "none" : `1px solid ${P.lineSoft}`,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: 14,
        color,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <IconCmp size={15} color={danger ? color : P.muted} />
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={15} color={P.subtle} />
    </button>
  );
}

// ---- dialogs ----------------------------------------------------------------

function confirmMeta(kind: ConfirmKind): {
  title: string;
  icon: LucideIcon;
  keep?: string;
  over?: string;
  confirm: string;
  warn?: string;
  danger?: boolean;
} {
  switch (kind) {
    case "uploadOverwrite":
      return { title: "用本机数据覆盖云端？", icon: CloudUpload, keep: "本机", over: "云端", confirm: "覆盖云端" };
    case "restoreOverwrite":
      return { title: "用云端数据覆盖本机？", icon: CloudDownload, keep: "云端", over: "本机", confirm: "覆盖本机" };
    case "emptyOverwrite":
      return { title: "用本机（空）覆盖云端？", icon: CloudUpload, keep: "本机（空白配置）", over: "云端", confirm: "覆盖云端", warn: "云端现有配置将被清空，且无法找回。" };
    case "badCloudOverwrite":
      return { title: "用本机数据覆盖云端？", icon: CloudUpload, keep: "本机", over: "云端（已损坏）", confirm: "覆盖云端", warn: "云端数据已无法识别，将被本机配置整体替换。" };
    case "deleteCloud":
      return { title: "删除云端同步数据？", icon: Trash2, confirm: "删除并断开", danger: true };
  }
}

function DialogBody({ P }: { P: Palette }) {
  const dialog = useSync((s) => s.dialog);
  const closeDialog = useSync((s) => s.closeDialog);
  const resolveConflict = useSync((s) => s.resolveConflict);
  const confirm = useSync((s) => s.confirm);
  const disconnect = useSync((s) => s.disconnect);
  const openDialog = useSync((s) => s.openDialog);
  const cloudPreview = useSync((s) => s.cloudPreview);
  const source = useSync((s) => s.source);
  if (!dialog) return null;
  const sourceLabel = source ? SYNC_SURFACE_LABEL[source] : null;

  if (dialog.type === "content") {
    const Item = ({ ok, k, d }: { ok: boolean; k: string; d: string }) => (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
        {ok ? (
          <Check size={15} color={toneColor("ok", P)} style={{ marginTop: 1, flexShrink: 0 }} />
        ) : (
          <Minus size={15} color={P.subtle} style={{ marginTop: 1, flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13, color: P.text }}>{k}</span>
          <span style={{ fontSize: 11.5, color: P.subtle, marginLeft: 8 }}>{d}</span>
        </div>
      </div>
    );
    return (
      <div>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>会同步</div>
        <div style={{ marginBottom: 18 }}>
          {SYNCED_ITEMS.map(([k, d]) => <Item key={k} ok k={k} d={d} />)}
        </div>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>不会同步</div>
        <div>{NOT_SYNCED_ITEMS.map(([k, d]) => <Item key={k} ok={false} k={k} d={d} />)}</div>
        <div style={{ ...actionRow, marginTop: 20 }}>
          <Btn P={P} onClick={closeDialog}>知道了</Btn>
        </div>
      </div>
    );
  }

  if (dialog.type === "conflict") {
    const local = summarizeCore(localCore());
    const cloud = cloudPreview ? summarizeCore(cloudPreview) : local;
    return (
      <div>
        <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, marginBottom: 16 }}>
          这台设备和云端都发生了更改，需要选择保留哪一份。第一版为整体覆盖，暂不做逐项合并。
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <SummaryCard P={P} kind="local" summary={local} />
          <SummaryCard P={P} kind="cloud" summary={cloud} source={sourceLabel} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Btn P={P} variant="primary" icon={CloudUpload} full onClick={() => void resolveConflict("local")}>保留本机，覆盖云端</Btn>
          <Btn P={P} icon={CloudDownload} full onClick={() => void resolveConflict("cloud")}>使用云端，覆盖本机</Btn>
          <Btn P={P} variant="ghost" full onClick={closeDialog}>先不处理</Btn>
        </div>
        <div style={{ marginTop: 14 }}>
          <InfoBox P={P}>“先不处理”后保持冲突状态，并暂停自动上传，直到你做出选择。</InfoBox>
        </div>
      </div>
    );
  }

  if (dialog.type === "disconnect") {
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <Bullet P={P} icon={HardDrive}>断开后，本机数据仍会完整保留。</Bullet>
          <Bullet P={P} icon={Cloud}>不会删除 Google Drive 中已同步的数据。</Bullet>
          <Bullet P={P} icon={RotateCcw}>之后可以重新连接并继续同步。</Bullet>
        </div>
        <div style={actionRow}>
          <Btn P={P} onClick={closeDialog}>取消</Btn>
          <Btn P={P} variant="danger" icon={Unlink} onClick={disconnect}>断开连接</Btn>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${P.lineSoft}` }}>
          <button
            onClick={() => openDialog({ type: "confirm", kind: "deleteCloud" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              color: toneColor("error", P),
              fontSize: 12.5,
            }}
          >
            <Trash2 size={14} color={toneColor("error", P)} />
            删除云端同步数据并断开连接
          </button>
        </div>
      </div>
    );
  }

  // confirm
  const meta = confirmMeta(dialog.kind);
  return (
    <div>
      {dialog.kind === "deleteCloud" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <Bullet P={P} icon={CloudOff}>删除后，其他设备将无法再从云端恢复这份配置。</Bullet>
          <Bullet P={P} icon={HardDrive}>本机数据仍会完整保留。</Bullet>
          <Bullet P={P} icon={Link2Off}>同时会断开与 Google Drive 的连接。</Bullet>
        </div>
      ) : (
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderBottom: `1px solid ${P.lineSoft}` }}>
            <CircleCheck size={17} color={toneColor("ok", P)} />
            <span style={{ fontSize: 13, color: P.muted }}>将保留</span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: P.text, fontWeight: 500 }}>{meta.keep}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px" }}>
            <CircleX size={17} color={toneColor("error", P)} />
            <span style={{ fontSize: 13, color: P.muted }}>将覆盖</span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: P.text, fontWeight: 500 }}>{meta.over}</span>
          </div>
        </div>
      )}
      {meta.warn && (
        <div style={{ marginBottom: 14 }}>
          <InfoBox P={P} tone="error" icon={TriangleAlert}>{meta.warn}</InfoBox>
        </div>
      )}
      <InfoBox P={P} icon={KeyRound}>此操作为整体配置覆盖，不会同步你的 AI API Key。</InfoBox>
      <div style={actionRow}>
        <Btn P={P} onClick={closeDialog}>取消</Btn>
        <Btn P={P} variant={meta.danger ? "danger" : "primary"} icon={meta.icon} onClick={() => void confirm(dialog.kind)}>
          {meta.confirm}
        </Btn>
      </div>
    </div>
  );
}

// ---- account header (connected) --------------------------------------------

function AccountHeader({ P }: { P: Palette }) {
  const account = useSync((s) => s.account);
  const status = useSync((s) => s.status);
  if (!account) return null;
  const initial = (account.name || account.email || "G").charAt(0).toUpperCase();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 0 14px",
        marginBottom: 14,
        borderBottom: `1px solid ${P.lineSoft}`,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: P.accentSoft,
          color: P.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: P.text, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {account.name}
        </div>
        <div style={{ fontSize: 12, color: P.subtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {account.email}
        </div>
      </div>
      <StatusInline P={P} status={status} />
    </div>
  );
}

// ---- root -------------------------------------------------------------------

export function SyncBody({ P, isMobile }: { P: Palette; isMobile?: boolean }) {
  const screen = useSync((s) => s.screen);
  const dialog = useSync((s) => s.dialog);
  const oauth = useSync((s) => s.oauth);
  const cancelOauth = useSync((s) => s.cancelOauth);

  if (oauth) {
    return (
      <div style={{ textAlign: "center", padding: "12px 8px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Spinner P={P} size={30} />
        </div>
        <div style={{ fontSize: 15, color: P.text, fontWeight: 500 }}>正在等待 Google 授权…</div>
        <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, margin: "8px 0 20px" }}>
          请在弹出的 Google 窗口中完成登录与授权。授权仅用于访问 Tidal 的应用数据区。
        </div>
        <Btn P={P} full onClick={cancelOauth}>取消</Btn>
      </div>
    );
  }
  if (dialog) return <DialogBody P={P} />;
  return (
    <>
      {screen !== "disconnected" && <AccountHeader P={P} />}
      {screen === "disconnected" && <DisconnectedScreen P={P} />}
      {screen === "firstSync" && <FirstSyncScreen P={P} />}
      {screen === "connected" && <ConnectedScreen P={P} isMobile={isMobile} />}
    </>
  );
}

// SyncBody is consumed by the merged 设置 surfaces:
//   pc     → components/pc/modals/SettingsModal.tsx (备份与同步 tab)
//   mobile → components/mobile/sheets/MSettingsSheet.tsx (备份与同步 sub-page)
