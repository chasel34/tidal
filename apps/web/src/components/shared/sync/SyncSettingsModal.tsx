"use client";

// 组合同步 settings surface (ADR 0007). One Modal that renders the disconnected
// / first-sync / connected screens plus the dialogs and the OAuth waiting
// overlay, all driven by useSync. Shared by the pc and mobile routes.

import type { CSSProperties, ReactNode } from "react";
import {
  normalizeCore,
  summarizeCore,
  SYNC_SURFACE_LABEL,
  type CoreSummary,
  type PortfolioCore,
} from "@tidal/core";
import type { Palette } from "@/lib/theme";
import { Modal } from "@/components/shared/ui/Modal";
import { MSheet } from "@/components/mobile/ui/MSheet";
import { tidalBtn } from "@/components/shared/ui/styles";
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

function Btn({
  P,
  variant,
  onClick,
  children,
  disabled,
}: {
  P: Palette;
  variant?: "primary" | "danger";
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...tidalBtn(P, variant), opacity: disabled ? 0.45 : 1 }}
    >
      {children}
    </button>
  );
}

function Heading({ P, title, desc }: { P: Palette; title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 16, color: P.text, fontWeight: 500 }}>{title}</div>
      {desc && (
        <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, marginTop: 6 }}>{desc}</div>
      )}
    </div>
  );
}

function Bullet({ P, children }: { P: Palette; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
      <span style={{ color: P.subtle, marginTop: 1 }}>·</span>
      <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function InfoBox({
  P,
  tone = "muted",
  children,
}: {
  P: Palette;
  tone?: Tone;
  children: ReactNode;
}) {
  const c = toneColor(tone, P);
  const soft =
    tone === "error"
      ? P.isDark
        ? "rgba(255,107,107,0.10)"
        : "rgba(207,58,51,0.06)"
      : P.isDark
        ? "rgba(255,255,255,0.03)"
        : "rgba(40,30,20,0.03)";
  return (
    <div
      style={{
        fontSize: 12,
        color: tone === "muted" ? P.muted : c,
        lineHeight: 1.55,
        padding: "9px 11px",
        borderRadius: 10,
        background: soft,
        border: tone === "muted" ? `1px solid ${P.lineSoft}` : "1px solid transparent",
      }}
    >
      {children}
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
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
        <span style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>
          {kind === "local" ? "本机" : "云端"}
        </span>
        {source && (
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
            marginTop: 11,
            paddingTop: 9,
            borderTop: `1px solid ${P.lineSoft}`,
          }}
        >
          {kind === "local" ? "最近修改 " + at : "最近同步 " + at}
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

const SYNCED_ITEMS: [string, string][] = [
  ["持仓", "标的、数量、成本"],
  ["自选", "关注列表"],
  ["现金", "现金余额"],
];
const NOT_SYNCED_ITEMS: [string, string][] = [
  ["AI API Key", "仅保存在本设备"],
  ["主题 / 周期 / 排序", "各设备本地偏好"],
  ["价格提醒 / 菜单栏偏好", "各设备本地偏好"],
  ["行情缓存 / 派生数据", "随时重新计算"],
];

// ---- status banner ----------------------------------------------------------

function statusMeta(status: SyncStatus, failKind: FailKind | null): { tone: Tone; text: string } {
  switch (status) {
    case "synced":
      return { tone: "ok", text: "已同步" };
    case "pending":
      return { tone: "warn", text: "有本机更改，等待同步" };
    case "syncing":
      return { tone: "info", text: "正在同步…" };
    case "reauth":
      return { tone: "error", text: "Google 授权已过期，需要重新登录" };
    case "conflict":
      return { tone: "error", text: "发现同步冲突：本机与云端都发生了更改" };
    case "failed":
      if (failKind === "badCloud") return { tone: "error", text: "云端同步数据无法识别" };
      if (failKind === "localWrite") return { tone: "error", text: "无法保存到本机" };
      return { tone: "error", text: "同步失败，可稍后重试" };
    default:
      return { tone: "ok", text: "已连接" };
  }
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
        desc="连接后，可在网页端、移动网页与菜单栏客户端之间同步你的持仓、自选与现金。"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <Bullet P={P}>只访问 Tidal 自己的 Google Drive 应用数据区，不读取你的 Drive 文件列表。</Bullet>
        <Bullet P={P}>同步文件不会出现在你的 Drive 文件列表里。</Bullet>
        <Bullet P={P}>AI API Key 不会同步，仅保存在本设备。</Bullet>
      </div>
      {errorMsg && <InfoBox P={P} tone="error">{errorMsg}</InfoBox>}
      <div style={actionRow}>
        <Btn P={P} onClick={() => openDialog({ type: "content" })}>
          查看同步内容
        </Btn>
        <Btn P={P} variant="primary" onClick={() => void connect()}>
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

  if (fsCase === "A") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Heading P={P} title="这是第一次同步" desc="将本机配置上传到 Google Drive 应用数据区。之后其它设备即可取得这份配置。" />
        <SummaryCard P={P} kind="local" summary={local} emphasize />
        <InfoBox P={P}>推荐：本机有数据、云端为空 — 上传本机。</InfoBox>
        <div style={actionRow}>
          <Btn P={P} onClick={() => void firstSync("later")}>稍后再说</Btn>
          <Btn P={P} variant="primary" onClick={() => void firstSync("upload")}>上传本机数据</Btn>
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
          <Btn P={P} variant="primary" onClick={() => void firstSync("finish")}>完成</Btn>
        </div>
      </div>
    );
  }
  if (fsCase === "C") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Heading P={P} title="云端有可恢复的配置" desc="本机当前为空。可以从云端恢复这份配置到本设备。" />
        <SummaryCard P={P} kind="cloud" summary={cloud ?? local} source={source ? SYNC_SURFACE_LABEL[source] : null} emphasize />
        <InfoBox P={P}>推荐：本机为空、云端有数据 — 从云端恢复。</InfoBox>
        <div style={actionRow}>
          <Btn P={P} onClick={() => void firstSync("later")}>稍后决定</Btn>
          <Btn P={P} variant="primary" onClick={() => void firstSync("restore")}>从云端恢复</Btn>
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
        <SummaryCard P={P} kind="cloud" summary={cloud ?? local} />
      </div>
      <div style={actionRow}>
        <Btn P={P} onClick={() => void firstSync("later")}>稍后决定</Btn>
        <Btn P={P} onClick={() => openDialog({ type: "confirm", kind: "restoreOverwrite" })}>使用云端覆盖本机</Btn>
        <Btn P={P} variant="primary" onClick={() => openDialog({ type: "confirm", kind: "uploadOverwrite" })}>使用本机覆盖云端</Btn>
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
  const reauthLogin = useSync((s) => s.reauthLogin);
  const openDialog = useSync((s) => s.openDialog);

  const meta = statusMeta(status, failKind);
  const c = toneColor(meta.tone, P);
  const soft =
    meta.tone === "ok"
      ? P.isDark
        ? "rgba(55,201,140,0.10)"
        : "rgba(15,157,99,0.06)"
      : meta.tone === "error"
        ? P.isDark
          ? "rgba(255,107,107,0.10)"
          : "rgba(207,58,51,0.055)"
        : meta.tone === "warn"
          ? P.isDark
            ? "rgba(224,173,98,0.10)"
            : "rgba(169,120,31,0.06)"
          : P.isDark
            ? "rgba(185,166,255,0.10)"
            : "rgba(91,79,212,0.06)";

  const kv: [string, string][] = [
    ["最近同步时间", status === "syncing" ? "同步中…" : timeLabel(lastSyncAt)],
    ["最近同步来源", source ? SYNC_SURFACE_LABEL[source] : "—"],
    ["本机未同步更改", status === "pending" || status === "conflict" ? "有" : "无"],
  ];

  const action = () => {
    if (status === "pending" || status === "failed")
      return <Btn P={P} variant="primary" onClick={() => void syncNow()}>{status === "failed" ? "重试" : "立即同步"}</Btn>;
    if (status === "reauth")
      return <Btn P={P} variant="primary" onClick={() => void reauthLogin()}>重新登录</Btn>;
    if (status === "conflict")
      return <Btn P={P} variant="primary" onClick={() => openDialog({ type: "conflict" })}>处理冲突</Btn>;
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          background: soft,
          borderRadius: 12,
          padding: "11px 13px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: c, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{meta.text}</span>
        {action()}
      </div>

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

      <div style={{ border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden" }}>
        <OpRow P={P} label="立即同步" onClick={() => void syncNow()} disabled={status === "syncing"} />
        <OpRow P={P} label="从云端恢复" onClick={() => openDialog({ type: "confirm", kind: "restoreOverwrite" })} disabled={status === "syncing"} />
        <OpRow P={P} label="上传本机覆盖云端" onClick={() => openDialog({ type: "confirm", kind: "uploadOverwrite" })} disabled={status === "syncing"} />
        <OpRow P={P} label="断开连接" danger last onClick={() => openDialog({ type: "disconnect" })} />
      </div>

      <InfoBox P={P}>
        {isMobile ? "移动网页" : "网页端"}不承诺后台同步：打开页面时拉取云端，更改后稍候自动上传。
      </InfoBox>
    </div>
  );
}

function OpRow({
  P,
  label,
  onClick,
  danger,
  disabled,
  last,
}: {
  P: Palette;
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
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: P.subtle }}>›</span>
    </button>
  );
}

// ---- dialogs ----------------------------------------------------------------

function confirmMeta(kind: ConfirmKind): {
  title: string;
  keep?: string;
  over?: string;
  confirm: string;
  warn?: string;
  danger?: boolean;
} {
  switch (kind) {
    case "uploadOverwrite":
      return { title: "用本机数据覆盖云端？", keep: "本机", over: "云端", confirm: "覆盖云端" };
    case "restoreOverwrite":
      return { title: "用云端数据覆盖本机？", keep: "云端", over: "本机", confirm: "覆盖本机" };
    case "emptyOverwrite":
      return { title: "用本机（空）覆盖云端？", keep: "本机（空白配置）", over: "云端", confirm: "覆盖云端", warn: "云端现有配置将被清空，且无法找回。" };
    case "badCloudOverwrite":
      return { title: "用本机数据覆盖云端？", keep: "本机", over: "云端（已损坏）", confirm: "覆盖云端", warn: "云端数据已无法识别，将被本机配置整体替换。" };
    case "deleteCloud":
      return { title: "删除云端同步数据？", confirm: "删除并断开", danger: true };
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

  if (dialog.type === "content") {
    const Item = ({ ok, k, d }: { ok: boolean; k: string; d: string }) => (
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "7px 0" }}>
        <span style={{ color: ok ? toneColor("ok", P) : P.subtle, fontSize: 13 }}>{ok ? "✓" : "—"}</span>
        <span style={{ fontSize: 13, color: P.text }}>{k}</span>
        <span style={{ fontSize: 12, color: P.subtle }}>{d}</span>
      </div>
    );
    return (
      <div>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6 }}>会同步</div>
        <div style={{ marginBottom: 16 }}>
          {SYNCED_ITEMS.map(([k, d]) => <Item key={k} ok k={k} d={d} />)}
        </div>
        <div style={{ fontSize: 11, color: P.subtle, letterSpacing: "0.06em", marginBottom: 6 }}>不会同步</div>
        <div>{NOT_SYNCED_ITEMS.map(([k, d]) => <Item key={k} ok={false} k={k} d={d} />)}</div>
        <div style={actionRow}>
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
        <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, marginBottom: 14 }}>
          这台设备和云端都发生了更改，需要选择保留哪一份。第一版为整体覆盖，暂不做逐项合并。
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <SummaryCard P={P} kind="local" summary={local} />
          <SummaryCard P={P} kind="cloud" summary={cloud} source={source ? SYNC_SURFACE_LABEL[source] : null} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Btn P={P} variant="primary" onClick={() => void resolveConflict("local")}>保留本机，覆盖云端</Btn>
          <Btn P={P} onClick={() => void resolveConflict("cloud")}>使用云端，覆盖本机</Btn>
          <Btn P={P} onClick={closeDialog}>先不处理</Btn>
        </div>
      </div>
    );
  }

  if (dialog.type === "disconnect") {
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 16 }}>
          <Bullet P={P}>断开后，本机数据仍会完整保留。</Bullet>
          <Bullet P={P}>不会删除 Google Drive 中已同步的数据。</Bullet>
          <Bullet P={P}>之后可以重新连接并继续同步。</Bullet>
        </div>
        <div style={actionRow}>
          <Btn P={P} onClick={closeDialog}>取消</Btn>
          <Btn P={P} variant="danger" onClick={disconnect}>断开连接</Btn>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${P.lineSoft}` }}>
          <button
            onClick={() => openDialog({ type: "confirm", kind: "deleteCloud" })}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              color: toneColor("error", P),
              fontSize: 12.5,
            }}
          >
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
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 14 }}>
          <Bullet P={P}>删除后，其他设备将无法再从云端恢复这份配置。</Bullet>
          <Bullet P={P}>本机数据仍会完整保留。</Bullet>
          <Bullet P={P}>同时会断开与 Google Drive 的连接。</Bullet>
        </div>
      ) : (
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderBottom: `1px solid ${P.lineSoft}` }}>
            <span style={{ color: toneColor("ok", P) }}>✓</span>
            <span style={{ fontSize: 13, color: P.muted }}>将保留</span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: P.text, fontWeight: 500 }}>{meta.keep}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px" }}>
            <span style={{ color: toneColor("error", P) }}>✕</span>
            <span style={{ fontSize: 13, color: P.muted }}>将覆盖</span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: P.text, fontWeight: 500 }}>{meta.over}</span>
          </div>
        </div>
      )}
      {meta.warn && (
        <div style={{ marginBottom: 12 }}>
          <InfoBox P={P} tone="error">{meta.warn}</InfoBox>
        </div>
      )}
      <InfoBox P={P}>此操作为整体配置覆盖，不会同步你的 AI API Key。</InfoBox>
      <div style={actionRow}>
        <Btn P={P} onClick={closeDialog}>取消</Btn>
        <Btn P={P} variant={meta.danger ? "danger" : "primary"} onClick={() => void confirm(dialog.kind)}>
          {meta.confirm}
        </Btn>
      </div>
    </div>
  );
}

// ---- account header (connected) --------------------------------------------

function AccountHeader({ P }: { P: Palette }) {
  const account = useSync((s) => s.account);
  if (!account) return null;
  const initial = (account.name || account.email || "G").charAt(0).toUpperCase();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
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
        }}
      >
        {initial}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: P.text, fontWeight: 500 }}>{account.name}</div>
        <div style={{ fontSize: 12, color: P.subtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {account.email}
        </div>
      </div>
    </div>
  );
}

// ---- root -------------------------------------------------------------------

function SyncBody({ P, isMobile }: { P: Palette; isMobile?: boolean }) {
  const screen = useSync((s) => s.screen);
  const dialog = useSync((s) => s.dialog);
  const oauth = useSync((s) => s.oauth);
  const cancelOauth = useSync((s) => s.cancelOauth);

  if (oauth) {
    return (
      <div style={{ textAlign: "center", padding: "12px 8px" }}>
        <div style={{ fontSize: 15, color: P.text, fontWeight: 500 }}>正在等待 Google 授权…</div>
        <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, margin: "8px 0 20px" }}>
          请在弹出的 Google 窗口中完成登录与授权。授权仅用于访问 Tidal 的应用数据区。
        </div>
        <Btn P={P} onClick={cancelOauth}>取消</Btn>
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

/** pc / desktop presentation — centered modal. */
export function SyncSettingsModal({ P, onClose }: { P: Palette; onClose: () => void }) {
  return (
    <Modal P={P} title="Google Drive 同步" onClose={onClose} width={460}>
      <SyncBody P={P} />
    </Modal>
  );
}

/** mobile presentation — bottom sheet, matching the app's other mobile panels. */
export function SyncSettingsSheet({ P, onClose }: { P: Palette; onClose: () => void }) {
  return (
    <MSheet P={P} title="Google Drive 同步" onClose={onClose}>
      <SyncBody P={P} isMobile />
    </MSheet>
  );
}
