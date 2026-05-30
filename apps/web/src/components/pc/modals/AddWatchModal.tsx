"use client";

import { useEffect, useState } from "react";
import type { Palette } from "@/lib/theme";
import type { Quote, SearchResultDTO } from "@/lib/types";
import { cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { apiQuotes } from "@/lib/api-client";
import { typeLabel, useStore } from "@/store/useStore";
import { useSearch } from "@/hooks/useSearch";
import { Modal } from "@/components/shared/ui/Modal";
import { SearchField } from "@/components/shared/ui/SearchField";
import { tidalBtn } from "@/components/shared/ui/styles";

/** Fetch quotes for the visible search results. */
function useResultQuotes(results: SearchResultDTO[]): Record<string, Quote> {
  const [map, setMap] = useState<Record<string, Quote>>({});
  const sig = results.map((r) => r.code).join(",");
  useEffect(() => {
    if (!results.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMap({});
      return;
    }
    let cancelled = false;
    apiQuotes(results)
      .then((qs) => {
        if (cancelled) return;
        const m: Record<string, Quote> = {};
        for (const q of qs) m[q.code] = q;
        setMap(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return map;
}

export function AddWatchModal({
  P,
  onClose,
}: {
  P: Palette;
  onClose: () => void;
}) {
  const watch = useStore((state) => state.watch);
  const addWatch = useStore((state) => state.addWatch);
  const removeWatch = useStore((state) => state.removeWatch);
  const [q, setQ] = useState("");
  const { results, loading } = useSearch(q);
  const quotes = useResultQuotes(results);

  return (
    <Modal P={P} title="添加自选" onClose={onClose} width={480}>
      <SearchField
        P={P}
        value={q}
        onChange={setQ}
        placeholder="搜索 名称 / 代码 / 拼音"
        autoFocus
      />
      <div
        style={{
          marginTop: 14,
          maxHeight: 360,
          overflowY: "auto",
          margin: "14px -6px 0",
          padding: "0 6px",
        }}
      >
        {loading && (
          <div style={{ color: P.muted, fontSize: 13, padding: "20px 4px", textAlign: "center" }}>
            搜索中…
          </div>
        )}
        {!loading && q.trim() && results.length === 0 && (
          <div style={{ color: P.muted, fontSize: 13, padding: "20px 4px", textAlign: "center" }}>
            没有找到匹配的标的
          </div>
        )}
        {results.map((inst) => {
          const has = watch.some((w) => w.code === inst.code);
          const quote = quotes[inst.code];
          const c = cMove(quote?.changePercent ?? 0, P.isDark ? "dark" : "light");
          return (
            <div
              key={inst.code}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 88px 72px 72px",
                gap: 8,
                alignItems: "center",
                padding: "10px 6px",
                borderBottom: `1px solid ${P.lineSoft}`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: P.text }}>{inst.name}</div>
                <div style={{ fontSize: 11, color: P.subtle, marginTop: 2, letterSpacing: "0.04em" }}>
                  {inst.code} · {typeLabel(inst)}
                </div>
              </div>
              <div style={{ textAlign: "right", color: P.text, fontSize: 13 }}>
                {quote ? "¥" + cFmtNum(quote.price) : "—"}
              </div>
              <div style={{ textAlign: "right", color: c, fontSize: 13 }}>
                {quote ? cFmtPct(quote.changePercent) : "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                {has ? (
                  <button
                    onClick={() => removeWatch(inst.code)}
                    style={{ ...tidalBtn(P), padding: "5px 10px", fontSize: 12, color: P.muted }}
                  >
                    移除
                  </button>
                ) : (
                  <button
                    onClick={() => addWatch(inst)}
                    style={{ ...tidalBtn(P, "primary"), padding: "5px 12px", fontSize: 12 }}
                  >
                    ＋ 加入
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
