"use client";

import { useState } from "react";
import { typeLabel, usePortfolioDerived, useStore } from "@/store/useStore";
import { useSearch } from "@/hooks/useSearch";
import { cMove } from "@/lib/format";
import { MSheet } from "@/components/mobile/ui/MSheet";
import { MSearchField } from "@/components/mobile/ui/MSearchField";
import type { Palette } from "@/lib/theme";
import type { Instrument } from "@/lib/types";

interface MHoldingSheetProps {
  P: Palette;
  onClose: () => void;
  editCode?: string;
}

export function MHoldingSheet({ P, onClose, editCode }: MHoldingSheetProps) {
  const addHolding = useStore((state) => state.addHolding);
  const updateHolding = useStore((state) => state.updateHolding);
  const removeHolding = useStore((state) => state.removeHolding);
  const { holdingsFull } = usePortfolioDerived();

  const existing = editCode ? holdingsFull.find((h) => h.code === editCode) : undefined;

  const [picked, setPicked] = useState<Instrument | null>(
    existing ? { code: existing.code, name: existing.name, market: existing.market, category: existing.category, type: existing.type } : null
  );
  const [shares, setShares] = useState(existing ? existing.shares.toString() : "");
  const [cost, setCost] = useState(existing ? existing.cost.toString() : "");
  const [query, setQuery] = useState("");
  const { results, loading } = useSearch(query);

  const sharesNum = parseFloat(shares) || 0;
  const costNum = parseFloat(cost) || 0;
  const preview = sharesNum * costNum;

  const handleSave = () => {
    if (!picked || sharesNum <= 0 || costNum <= 0) return;
    if (editCode) {
      updateHolding(editCode, sharesNum, costNum);
    } else {
      addHolding(picked, sharesNum, costNum);
    }
    onClose();
  };

  const handleDelete = () => {
    if (editCode) {
      removeHolding(editCode);
      onClose();
    }
  };

  const inputStyle = {
    width: "100%",
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`,
    borderRadius: 11,
    padding: "13px 14px",
    fontSize: 17,
    color: P.text,
    outline: "none",
  } as const;

  const title = editCode ? "编辑持仓" : "添加持仓";

  return (
    <MSheet P={P} title={title} onClose={onClose}>
      {!picked ? (
        <>
          <MSearchField P={P} value={query} onChange={setQuery} placeholder="搜索名称 / 代码" autoFocus />
          <div style={{ marginTop: 12 }}>
            {loading && <div style={{ color: P.subtle, fontSize: 13, textAlign: "center", padding: 20 }}>搜索中...</div>}
            {!loading && query && results.length === 0 && (
              <div style={{ color: P.subtle, fontSize: 13, textAlign: "center", padding: 20 }}>无结果</div>
            )}
            {results.map((r) => (
              <div
                key={r.code}
                onClick={() => setPicked(r)}
                style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${P.lineSoft}`, cursor: "pointer" }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: P.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>{r.code} · {r.market} · {typeLabel(r)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Picked instrument */}
          <div style={{ background: P.chipBg, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{picked.name}</div>
              <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>{picked.code} · {typeLabel(picked)}</div>
            </div>
            {!editCode && (
              <button onClick={() => setPicked(null)} style={{ background: "none", border: "none", color: P.accent, fontSize: 13, cursor: "pointer" }}>
                更换
              </button>
            )}
          </div>

          {/* Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: P.subtle, display: "block", marginBottom: 6 }}>持有数量</label>
              <input
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: P.subtle, display: "block", marginBottom: 6 }}>成本价</label>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Preview */}
          {preview > 0 && (
            <div style={{ fontSize: 13, color: P.muted, textAlign: "center" }}>
              成本市值 ¥{preview.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={sharesNum <= 0 || costNum <= 0}
            style={{
              padding: "14px",
              borderRadius: 14,
              background: P.accent,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              opacity: (sharesNum <= 0 || costNum <= 0) ? 0.5 : 1,
            }}
          >
            保存
          </button>

          {/* Delete */}
          {editCode && (
            <button
              onClick={handleDelete}
              style={{
                padding: "12px",
                borderRadius: 14,
                background: "transparent",
                color: cMove(1, P.isDark ? "dark" : "light"),
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              删除持仓
            </button>
          )}
        </div>
      )}
    </MSheet>
  );
}
