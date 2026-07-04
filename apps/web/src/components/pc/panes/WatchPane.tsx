"use client";

import { useRef, useState } from "react";
import type { Palette } from "@/lib/theme";
import { cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { typeLabel, usePortfolioDerived, useStore } from "@/store/useStore";
import { useDailyCloses } from "@/hooks/useDailyCloses";
import { Spark } from "@/components/shared/charts/Spark";
import { ImportBanner, useImportMsg } from "@/components/shared/ui/ImportBanner";
import { SortTh } from "@/components/shared/ui/SortTh";
import { EmptyState } from "@/components/shared/ui/EmptyState";
import { tidalBtn } from "@/components/shared/ui/styles";
import { exportJSON, validateWatch } from "@/lib/io";
import type { WatchSortKey } from "@/lib/types";
import type { PaneProps } from "./types";

export function WatchPane({ P, openModal }: { P: Palette } & PaneProps) {
  const theme = useStore((state) => state.theme);
  const watch = useStore((state) => state.watch);
  const sortW = useStore((state) => state.sortW);
  const toggleSortW = useStore((state) => state.toggleSortW);
  const removeWatch = useStore((state) => state.removeWatch);
  const importWatch = useStore((state) => state.importWatch);
  const { sortedWatch } = usePortfolioDerived();
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const { importMsg, showMsg } = useImportMsg();
  const fileRef = useRef<HTMLInputElement>(null);
  const list = sortedWatch;
  const sparks = useDailyCloses(list);

  function handleExport() {
    exportJSON("watch", watch);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const items = validateWatch(raw);
      importWatch(items);
      showMsg(`已导入 ${items.length} 条自选`, true);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "导入失败", false);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const GRID = "1.5fr 1.1fr 92px 90px 64px 40px";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 6 }}>自选</div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: P.text,
              letterSpacing: "-0.02em",
            }}
          >
            {list.length} 只关注中
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleExport} style={tidalBtn(P)}>
            导出
          </button>
          <button onClick={handleImportClick} style={tidalBtn(P)}>
            导入
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            onClick={() => openModal({ type: "ocr", target: "watch" })}
            style={tidalBtn(P)}
          >
            ⎙ 截图导入
          </button>
          <button onClick={() => openModal({ type: "watch" })} style={tidalBtn(P, "primary")}>
            ＋ 添加自选
          </button>
        </div>
      </div>

      <ImportBanner P={P} msg={importMsg} />

      {list.length === 0 ? (
        <EmptyState
          P={P}
          text="自选列表是空的 · 添加你想关注的标的"
          onAction={() => openModal({ type: "watch" })}
          actionLabel="添加自选"
        />
      ) : (
        <div
          style={{
            background: P.panel,
            border: `1px solid ${P.line}`,
            borderRadius: 14,
            padding: "6px 0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 10,
              padding: "10px 22px",
            }}
          >
            <SortTh
              label="名称 / 代码"
              sortKey={"name" as WatchSortKey}
              align="left"
              P={P}
              active={sortW.key === "name"}
              dir={sortW.dir}
              onClick={toggleSortW}
            />
            <span
              style={{
                fontSize: 11,
                color: P.subtle,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              近月
            </span>
            <SortTh
              label="现价"
              sortKey={"price" as WatchSortKey}
              P={P}
              active={sortW.key === "price"}
              dir={sortW.dir}
              onClick={toggleSortW}
            />
            <SortTh
              label="今日"
              sortKey={"today" as WatchSortKey}
              P={P}
              active={sortW.key === "today"}
              dir={sortW.dir}
              onClick={toggleSortW}
            />
            <span
              style={{
                fontSize: 11,
                color: P.subtle,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              类型
            </span>
            <span />
          </div>
          {list.map((w, i) => {
            const c = cMove(w.todayPct, theme);
            const hovered = hoverCode === w.code;
            const spark = sparks[w.code];
            return (
              <div
                key={w.code}
                onMouseEnter={() => setHoverCode(w.code)}
                onMouseLeave={() => setHoverCode(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 10,
                  padding: "13px 22px",
                  alignItems: "center",
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  borderTop: i === 0 ? "none" : `1px solid ${P.lineSoft}`,
                  background: hovered ? P.hoverRow : "transparent",
                }}
              >
                <div>
                  <div style={{ color: P.text, fontSize: 14, whiteSpace: "nowrap" }}>{w.name}</div>
                  <div
                    style={{
                      color: P.subtle,
                      fontSize: 11,
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {w.code} · {w.market.toUpperCase()}
                  </div>
                </div>
                <div>
                  {spark ? <Spark data={spark} color={c} width={110} height={26} /> : null}
                </div>
                <div style={{ textAlign: "right", color: P.text }}>
                  {w.price ? "¥" + cFmtNum(w.price) : "—"}
                </div>
                <div style={{ textAlign: "right", color: c }}>{cFmtPct(w.todayPct)}</div>
                <div style={{ textAlign: "right", color: P.subtle, fontSize: 11 }}>
                  {typeLabel(w)}
                </div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => removeWatch(w.code)}
                    title="移除自选"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: hovered ? P.muted : "transparent",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 4,
                      transition: "color .12s",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
