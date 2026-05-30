import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Bell,
  Download,
  Info,
  PanelTop,
  Search,
  SlidersHorizontal,
  SunMoon,
  Upload,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { cFmtCompact, cFmtMoney, cFmtNum, cFmtPct } from "@shared/format";
import { moveColor } from "@shared/theme";
import { typeLabel, unitLabel } from "@shared/portfolio";
import type {
  Instrument,
  MenubarConfig,
  MenubarMode,
  PriceAlert,
  SearchResultDTO,
  ThemeMode,
} from "@shared/types";
import { Card, CalmSwitch, GhostButton, GroupLabel, PrimaryButton, Row, Segmented, SelectBox } from "./Controls";
import { usePalette } from "@/hooks/usePalette";
import { useQuotes } from "@/hooks/useQuotes";
import { useConfig, useMenubarStore, usePortfolioDerived, useResolvedTheme } from "@/store/useMenubarStore";

type Pane = "general" | "appearance" | "menubar" | "notify" | "portfolio" | "about";

const PANES: { id: Pane; label: string; icon: ReactNode }[] = [
  { id: "general", label: "通用", icon: <SlidersHorizontal size={16} /> },
  { id: "appearance", label: "外观", icon: <SunMoon size={16} /> },
  { id: "menubar", label: "菜单栏", icon: <PanelTop size={16} /> },
  { id: "notify", label: "通知提醒", icon: <Bell size={16} /> },
  { id: "portfolio", label: "持仓与自选", icon: <Wallet size={16} /> },
  { id: "about", label: "关于", icon: <Info size={16} /> },
];

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function SearchPicker({
  onPick,
  exclude = [],
}: {
  onPick: (inst: Instrument) => void;
  exclude?: string[];
}) {
  const P = usePalette();
  const theme = useResolvedTheme();
  const config = useConfig();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const move = (value: number) => moveColor(value, theme, config.conv);
  const excludeSig = exclude.join("|");
  const excluded = useMemo(
    () => new Set(excludeSig ? excludeSig.split("|") : []),
    [excludeSig],
  );

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      const found = await window.tidal.search(q).catch(() => []);
      if (alive) {
        setResults(found.filter((item) => !excluded.has(item.code)).slice(0, 8));
        setLoading(false);
      }
    };
    const t = setTimeout(run, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, excluded]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: P.isDark ? "#16161a" : "#faf9f5",
          border: `1px solid ${P.line}`,
          borderRadius: 10,
          padding: "0 12px",
        }}
      >
        <Search size={15} color={P.subtle} />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="搜索 名称 / 代码"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            padding: "10px 0",
            color: P.text,
            outline: "none",
            fontSize: 13,
          }}
        />
      </div>
      {q && (
        <div style={{ marginTop: 8, border: `1px solid ${P.line}`, borderRadius: 10, overflow: "hidden" }}>
          {loading && <div style={{ padding: 12, color: P.subtle, fontSize: 12 }}>搜索中…</div>}
          {!loading && results.length === 0 && <div style={{ padding: 12, color: P.subtle, fontSize: 12 }}>没有匹配标的</div>}
          {!loading &&
            results.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  onPick(item);
                  setQ("");
                  setResults([]);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  width: "100%",
                  padding: "9px 10px",
                  border: "none",
                  borderBottom: `1px solid ${P.lineSoft}`,
                  background: P.panel,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>
                  <span style={{ color: P.text, fontSize: 13 }}>{item.name}</span>
                  <span style={{ color: P.subtle, fontSize: 11, marginLeft: 6 }}>{item.code}</span>
                </span>
                <span style={{ color: move(0), fontSize: 12 }}>{typeLabel(item)}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function PortfolioPane() {
  const P = usePalette();
  const config = useConfig();
  const theme = useResolvedTheme();
  const { holdingsFull, watchFull } = usePortfolioDerived();
  const [draft, setDraft] = useState<{ inst: Instrument; shares: string; cost: string } | null>(null);
  const move = (value: number) => moveColor(value, theme, config.conv);
  const patch = useMenubarStore((state) => state.patchConfig);

  const saveHolding = async () => {
    if (!draft) return;
    const shares = Number(draft.shares);
    const cost = Number(draft.cost);
    if (!(shares > 0) || !(cost > 0)) return;
    const next = config.holdings.some((h) => h.instrument.code === draft.inst.code)
      ? config.holdings.map((h) => (h.instrument.code === draft.inst.code ? { instrument: draft.inst, shares, cost } : h))
      : [...config.holdings, { instrument: draft.inst, shares, cost }];
    await patch({ holdings: next });
    setDraft(null);
  };

  return (
    <>
      <GroupLabel P={P}>持仓</GroupLabel>
      <Card P={P} style={{ marginBottom: 18 }}>
        {holdingsFull.length === 0 && <div style={{ padding: 16, color: P.subtle, fontSize: 12.5, textAlign: "center" }}>暂无持仓</div>}
        {holdingsFull.map((h) => (
          <div key={h.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${P.lineSoft}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: P.text }}>{h.name}</div>
              <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>
                {h.code} · {h.shares} {unitLabel(h)} · 成本 ¥{cFmtNum(h.cost)}
              </div>
            </div>
            <span style={{ fontSize: 12.5, color: P.muted }}>{cFmtCompact(h.marketValue)}</span>
            <span style={{ fontSize: 12.5, color: move(h.todayPct), width: 56, textAlign: "right" }}>{cFmtPct(h.todayPct)}</span>
            <button
              onClick={() => setDraft({ inst: h, shares: String(h.shares), cost: String(h.cost) })}
              style={{ border: "none", background: "transparent", color: P.accent, cursor: "pointer", fontSize: 12 }}
            >
              编辑
            </button>
            <button
              onClick={() => void patch({ holdings: config.holdings.filter((item) => item.instrument.code !== h.code) })}
              style={{ border: "none", background: "transparent", color: P.subtle, cursor: "pointer", display: "flex" }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <div style={{ padding: 14 }}>
          <SearchPicker onPick={(inst) => setDraft({ inst, shares: "", cost: "" })} />
          {draft && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <label style={{ fontSize: 12, color: P.muted }}>
                数量
                <input value={draft.shares} onChange={(e) => setDraft({ ...draft, shares: e.target.value.replace(/[^0-9.]/g, "") })} style={inputStyle(P)} />
              </label>
              <label style={{ fontSize: 12, color: P.muted }}>
                成本价
                <input value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value.replace(/[^0-9.]/g, "") })} style={inputStyle(P)} />
              </label>
              <PrimaryButton P={P} onClick={saveHolding}>
                保存
              </PrimaryButton>
            </div>
          )}
        </div>
      </Card>

      <GroupLabel P={P}>自选</GroupLabel>
      <Card P={P}>
        {watchFull.length === 0 && <div style={{ padding: 16, color: P.subtle, fontSize: 12.5, textAlign: "center" }}>暂无自选</div>}
        {watchFull.map((w) => (
          <div key={w.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${P.lineSoft}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: P.text }}>{w.name}</div>
              <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>{w.code} · {typeLabel(w)}</div>
            </div>
            <span style={{ fontSize: 12.5, color: P.muted }}>¥{cFmtNum(w.price)}</span>
            <span style={{ fontSize: 12.5, color: move(w.todayPct), width: 56, textAlign: "right" }}>{cFmtPct(w.todayPct)}</span>
            <button
              onClick={() => void patch({ watch: config.watch.filter((item) => item.code !== w.code) })}
              style={{ border: "none", background: "transparent", color: P.subtle, cursor: "pointer", display: "flex" }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <div style={{ padding: 14 }}>
          <SearchPicker
            exclude={config.watch.map((w) => w.code)}
            onPick={(inst) => void patch({ watch: [inst, ...config.watch] })}
          />
        </div>
      </Card>
    </>
  );
}

function inputStyle(P: ReturnType<typeof usePalette>): CSSProperties {
  return {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 5,
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    color: P.text,
    outline: "none",
  };
}

function NotifyPane() {
  const P = usePalette();
  const config = useConfig();
  const patch = useMenubarStore((state) => state.patchConfig);
  const known = useMemo(() => {
    const map = new Map<string, Instrument>();
    config.holdings.forEach((h) => map.set(h.instrument.code, h.instrument));
    config.watch.forEach((w) => map.set(w.code, w));
    return map;
  }, [config.holdings, config.watch]);
  const [picked, setPicked] = useState<Instrument | null>(null);
  const [price, setPrice] = useState("");

  const setAlert = (alert: PriceAlert, patchAlert: Partial<PriceAlert>) => {
    void patch({ alerts: config.alerts.map((a) => (a.id === alert.id ? { ...a, ...patchAlert } : a)) });
  };
  const addAlert = () => {
    if (!picked || !(Number(price) > 0)) return;
    void patch({
      alerts: [{ id: id(), code: picked.code, dir: "above", price: Number(price), on: true }, ...config.alerts],
    });
    setPicked(null);
    setPrice("");
  };

  return (
    <>
      <Card P={P} style={{ marginBottom: 18 }}>
        <Row label="允许通知" sub="价格触发提醒时推送到通知中心" P={P} last>
          <CalmSwitch checked={config.notify} onChange={(notify) => void patch({ notify })} P={P} />
        </Row>
      </Card>
      <GroupLabel P={P}>价格提醒</GroupLabel>
      <Card P={P} style={{ opacity: config.notify ? 1 : 0.5 }}>
        {config.alerts.length === 0 && <div style={{ padding: 16, color: P.subtle, fontSize: 12.5, textAlign: "center" }}>暂无提醒</div>}
        {config.alerts.map((alert) => {
          const inst = known.get(alert.code);
          return (
            <div key={alert.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${P.lineSoft}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: P.text }}>{inst?.name ?? alert.code}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>{alert.code}</div>
              </div>
              <Segmented P={P} value={alert.dir} onChange={(dir) => setAlert(alert, { dir })} options={[{ value: "above", label: "涨破" }, { value: "below", label: "跌破" }]} />
              <span style={{ fontSize: 12.5, color: P.muted }}>{cFmtMoney(alert.price)}</span>
              <CalmSwitch checked={alert.on} onChange={(on) => setAlert(alert, { on })} P={P} />
              <button onClick={() => void patch({ alerts: config.alerts.filter((a) => a.id !== alert.id) })} style={{ border: "none", background: "transparent", color: P.subtle, cursor: "pointer", display: "flex" }}>
                <X size={15} />
              </button>
            </div>
          );
        })}
        <div style={{ padding: 14 }}>
          <SearchPicker onPick={setPicked} />
          {picked && (
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
              <label style={{ fontSize: 12, color: P.muted }}>
                {picked.name} 阈值
                <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} style={inputStyle(P)} />
              </label>
              <PrimaryButton P={P} onClick={addAlert} disabled={!(Number(price) > 0)}>
                添加
              </PrimaryButton>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

export function SettingsApp() {
  const P = usePalette();
  const config = useConfig();
  const theme = useResolvedTheme();
  const patch = useMenubarStore((state) => state.patchConfig);
  const setConfig = useMenubarStore((state) => state.setConfig);
  const { holdingsFull, summary } = usePortfolioDerived();
  const [pane, setPane] = useState<Pane>("appearance");
  const [msg, setMsg] = useState<string | null>(null);
  useQuotes();
  const move = (value: number) => moveColor(value, theme, config.conv);
  const cur = PANES.find((p) => p.id === pane)!;

  const exportConfig = async () => {
    const result = await window.tidal.exportConfig(config);
    setMsg(result.canceled ? null : "已导出菜单栏数据");
  };
  const importConfig = async () => {
    const result = await window.tidal.importConfig(config);
    if (result.config) {
      setConfig(result.config);
      setMsg("已导入数据");
    } else if (result.message) {
      setMsg(result.message);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: P.isDark ? "#1d1d21" : "#fbfaf6",
        color: P.text,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 212, flexShrink: 0, display: "flex", flexDirection: "column", background: P.isDark ? "rgba(255,255,255,0.025)" : "rgba(40,30,20,0.022)", borderRight: `1px solid ${P.lineSoft}` }}>
        <div style={{ display: "flex", gap: 8, padding: "13px 14px 12px", WebkitAppRegion: "drag" } as CSSProperties}>
          <button onClick={() => void window.tidal.closeSettings()} style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.12)", padding: 0, cursor: "pointer", WebkitAppRegion: "no-drag" } as CSSProperties} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.12)" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", border: "0.5px solid rgba(0,0,0,0.12)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px 14px" }}>
          <Waves size={30} color={P.accent} />
          <div>
            <div style={{ fontSize: 13.5, color: P.text, fontWeight: 500 }}>Tidal</div>
            <div style={{ fontSize: 11, color: P.subtle, marginTop: 1 }}>菜单栏看板</div>
          </div>
        </div>
        <div style={{ padding: "0 10px", overflowY: "auto", flex: 1 }}>
          {PANES.map((p) => {
            const active = pane === p.id;
            return (
              <button key={p.id} onClick={() => setPane(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 9px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 1, background: active ? P.accentSoft : "transparent", color: active ? P.accent : P.text }}>
                <span style={{ color: active ? P.accent : P.subtle, display: "flex" }}>{p.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 26px 10px", fontSize: 17, color: P.text, fontWeight: 500, WebkitAppRegion: "drag" } as CSSProperties}>
          {cur.label}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 26px 26px" }}>
          {pane === "appearance" && (
            <>
              <Card P={P} style={{ marginBottom: 18 }}>
                <Row label="外观主题" sub="弹窗与设置窗口的明暗风格" P={P}>
                  <Segmented<ThemeMode> P={P} value={config.theme} onChange={(theme) => void patch({ theme })} options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }, { value: "auto", label: "跟随系统" }]} />
                </Row>
                <Row label="涨跌配色" sub="A 股习惯红涨绿跌；可切换为国际惯例" P={P} last>
                  <Segmented P={P} value={config.conv} onChange={(conv) => void patch({ conv })} options={[{ value: "redUp", label: "红涨绿跌" }, { value: "greenUp", label: "绿涨红跌" }]} />
                </Row>
              </Card>
              <GroupLabel P={P}>预览</GroupLabel>
              <Card P={P}>
                {[{ n: "上涨示例", c: "000001", v: 0.85 }, { n: "下跌示例", c: "000002", v: -1.42 }].map((r, i) => (
                  <Row key={r.c} label={r.n} sub={r.c} P={P} last={i === 1}>
                    <span style={{ fontSize: 14, color: move(r.v), fontVariantNumeric: "tabular-nums" }}>{cFmtPct(r.v)}</span>
                  </Row>
                ))}
              </Card>
            </>
          )}

          {pane === "menubar" && (
            <>
              <GroupLabel P={P}>菜单栏图标</GroupLabel>
              <Card P={P} style={{ marginBottom: 18 }}>
                <Row label="显示内容" sub="顶栏图标旁随实时数据更新" P={P} last>
                  <Segmented<MenubarMode> P={P} value={config.menubarMode} onChange={(menubarMode) => void patch({ menubarMode })} options={[{ value: "icon", label: "仅图标" }, { value: "percent", label: "今日涨跌" }, { value: "total", label: "总资产" }]} />
                </Row>
              </Card>
              <GroupLabel P={P}>弹窗内容</GroupLabel>
              <Card P={P}>
                {[
                  ["trend", "资产走势小图", "可切换 1W / 1M / 3M / 1Y"],
                  ["holdings", "持仓列表", "按市值排序的迷你列表"],
                  ["watch", "自选列表", ""],
                  ["indices", "大盘指数", "上证 / 深证 / 创业板 / 沪深300 / 科创50"],
                  ["actions", "快捷操作栏", "打开主看板 / 刷新 / 设置"],
                ].map(([key, label, sub], index, arr) => (
                  <Row key={key} label={label} sub={sub} P={P} last={index === arr.length - 1}>
                    <CalmSwitch checked={config.sections[key as keyof MenubarConfig["sections"]]} onChange={() => void patch({ sections: { ...config.sections, [key]: !config.sections[key as keyof MenubarConfig["sections"]] } })} P={P} />
                  </Row>
                ))}
              </Card>
            </>
          )}

          {pane === "general" && (
            <>
              <Card P={P} style={{ marginBottom: 18 }}>
                <Row label="开机时自动启动" sub="登录后在后台常驻菜单栏" P={P}>
                  <CalmSwitch
                    checked={config.launchAtLogin}
                    onChange={async (launchAtLogin) => {
                      const actual = await window.tidal.setLaunchAtLogin(launchAtLogin);
                      await patch({ launchAtLogin: actual });
                    }}
                    P={P}
                  />
                </Row>
                <Row label="刷新频率" sub="行情自动刷新的间隔" P={P}>
                  <SelectBox<number> P={P} value={config.refreshSec} onChange={(refreshSec) => void patch({ refreshSec })} options={[{ value: 15, label: "15 秒" }, { value: 30, label: "30 秒" }, { value: 60, label: "1 分钟" }, { value: 300, label: "5 分钟" }, { value: 0, label: "仅手动" }]} />
                </Row>
                <Row label="数据来源" sub="行情来自 stock-sdk，基金档案来自 fund.eastmoney.com" P={P} last>
                  <span style={{ fontSize: 12.5, color: P.subtle }}>实时</span>
                </Row>
              </Card>
              <GroupLabel P={P}>备份</GroupLabel>
              <Card P={P}>
                <Row label="导出数据" sub="菜单栏配置、持仓、自选、提醒与偏好" P={P}>
                  <GhostButton P={P} onClick={exportConfig}>
                    <Download size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                    导出
                  </GhostButton>
                </Row>
                <Row label="导入数据" sub="支持菜单栏 JSON 和当前 web store JSON" P={P} last>
                  <GhostButton P={P} onClick={importConfig}>
                    <Upload size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                    选择文件
                  </GhostButton>
                </Row>
              </Card>
              {msg && <div style={{ margin: "10px 4px 0", fontSize: 11.5, color: P.subtle }}>{msg}</div>}
            </>
          )}

          {pane === "notify" && <NotifyPane />}
          {pane === "portfolio" && <PortfolioPane />}

          {pane === "about" && (
            <Card P={P}>
              <div style={{ padding: "26px 16px", textAlign: "center" }}>
                <Waves size={44} color={P.accent} />
                <div style={{ fontSize: 16, color: P.text, fontWeight: 500, marginTop: 12 }}>Tidal</div>
                <div style={{ fontSize: 12.5, color: P.subtle, marginTop: 4 }}>菜单栏资产看板</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
                  <div style={{ background: P.panelAlt, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: P.subtle }}>总资产</div>
                    <div style={{ fontSize: 16, color: P.text, marginTop: 4 }}>{cFmtMoney(summary.totalAssets, { dec: 0 })}</div>
                  </div>
                  <div style={{ background: P.panelAlt, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: P.subtle }}>持仓</div>
                    <div style={{ fontSize: 16, color: P.text, marginTop: 4 }}>{holdingsFull.length} 只</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
