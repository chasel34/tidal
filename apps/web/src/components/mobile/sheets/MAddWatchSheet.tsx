"use client";

import { useState } from "react";
import { typeLabel, useStore } from "@/store/useStore";
import { useSearch } from "@/hooks/useSearch";
import { cFmtPct, cMove } from "@/lib/format";
import { MSheet } from "@/components/mobile/ui/MSheet";
import { MSearchField } from "@/components/mobile/ui/MSearchField";
import type { Palette } from "@/lib/theme";

interface MAddWatchSheetProps {
  P: Palette;
  onClose: () => void;
}

export function MAddWatchSheet({ P, onClose }: MAddWatchSheetProps) {
  const watch = useStore((state) => state.watch);
  const quotes = useStore((state) => state.quotes);
  const theme = useStore((state) => state.theme);
  const addWatch = useStore((state) => state.addWatch);
  const [query, setQuery] = useState("");
  const { results, loading } = useSearch(query);

  const watchCodes = new Set(watch.map((w) => w.code));

  return (
    <MSheet P={P} title="添加自选" sub="搜索名称 / 代码 / 板块" onClose={onClose}>
      <MSearchField P={P} value={query} onChange={setQuery} placeholder="搜索..." autoFocus />
      <div style={{ marginTop: 12 }}>
        {loading && <div style={{ color: P.subtle, fontSize: 13, textAlign: "center", padding: 20 }}>搜索中...</div>}
        {!loading && query && results.length === 0 && (
          <div style={{ color: P.subtle, fontSize: 13, textAlign: "center", padding: 20 }}>无结果</div>
        )}
        {results.map((r) => {
          const inWatch = watchCodes.has(r.code);
          const q = quotes[r.code];
          const todayPct = q?.changePercent ?? 0;
          return (
            <div key={r.code} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${P.lineSoft}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: P.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>{r.code} · {r.market} · {typeLabel(r)}</div>
              </div>
              {q && (
                <div style={{ textAlign: "right", marginRight: 12 }}>
                  <div style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: P.text }}>{q.price.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: cMove(todayPct, theme) }}>{cFmtPct(todayPct)}</div>
                </div>
              )}
              <button
                onClick={() => { if (!inWatch) addWatch(r); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  cursor: inWatch ? "default" : "pointer",
                  background: inWatch ? P.chipBg : P.accent,
                  color: inWatch ? P.muted : "#fff",
                }}
              >
                {inWatch ? "已添加" : "＋ 关注"}
              </button>
            </div>
          );
        })}
      </div>
    </MSheet>
  );
}
