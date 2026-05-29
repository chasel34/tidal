"use client";

import { useEffect, useMemo, useState } from "react";
import type { Palette } from "@/lib/theme";
import type { Instrument, Quote } from "@/lib/types";
import { cFmtMoney, cFmtNum, cFmtPct, cMove } from "@/lib/format";
import { apiQuotes } from "@/lib/api-client";
import { useStore } from "@/store/useStore";
import { useSearch } from "@/hooks/useSearch";
import { Modal } from "@/components/ui/Modal";
import { SearchField } from "@/components/ui/SearchField";
import { tidalBtn, tidalInput } from "@/components/ui/styles";

export function HoldingModal({
  P,
  onClose,
  editCode,
}: {
  P: Palette;
  onClose: () => void;
  editCode?: string;
}) {
  const store = useStore();
  const editing = !!editCode;
  const existing = editing
    ? store.holdings.find((h) => h.instrument.code === editCode)
    : null;

  const [q, setQ] = useState("");
  const { results, loading } = useSearch(q);
  const [picked, setPicked] = useState<Instrument | null>(
    existing ? existing.instrument : null
  );
  const [shares, setShares] = useState(existing ? String(existing.shares) : "");
  const [cost, setCost] = useState(existing ? String(existing.cost) : "");
  const [pickedQuote, setPickedQuote] = useState<Quote | null>(
    picked ? store.quotes[picked.code] ?? null : null
  );

  // fetch live price for the picked instrument
  useEffect(() => {
    if (!picked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPickedQuote(null);
      return;
    }
    const cached = store.quotes[picked.code];
    if (cached) setPickedQuote(cached);
    let cancelled = false;
    apiQuotes([picked])
      .then((qs) => {
        if (!cancelled && qs[0]) setPickedQuote(qs[0]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.code]);

  const price = pickedQuote?.price ?? 0;

  const pick = (inst: Instrument) => {
    setPicked(inst);
    if (!cost) {
      const cached = store.quotes[inst.code];
      if (cached) setCost(String(cached.price));
    }
  };

  const sharesNum = Number(shares);
  const costNum = Number(cost);
  const canSave = !!picked && sharesNum > 0 && costNum > 0;

  const save = () => {
    if (!canSave || !picked) return;
    if (editing) store.updateHolding(picked.code, sharesNum, costNum);
    else store.addHolding(picked, sharesNum, costNum);
    onClose();
  };

  const unit = picked ? store.unitLabel(picked) : "股";

  const preview = useMemo(() => {
    if (!(sharesNum > 0 && costNum > 0 && price > 0)) return null;
    const mv = sharesNum * price;
    const pct = ((price - costNum) / costNum) * 100;
    return { mv, pct };
  }, [sharesNum, costNum, price]);

  return (
    <Modal
      P={P}
      title={editing ? "编辑持仓" : "添加持仓"}
      onClose={onClose}
      width={460}
    >
      {!picked ? (
        <>
          <SearchField
            P={P}
            value={q}
            onChange={setQ}
            placeholder="搜索要买入的标的"
            autoFocus
          />
          <div style={{ marginTop: 14, maxHeight: 340, overflowY: "auto" }}>
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
            {results.map((inst) => (
              <div
                key={inst.code}
                onClick={() => pick(inst)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  gap: 8,
                  alignItems: "center",
                  padding: "11px 6px",
                  borderBottom: `1px solid ${P.lineSoft}`,
                  cursor: "pointer",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: P.text }}>{inst.name}</div>
                  <div style={{ fontSize: 11, color: P.subtle, marginTop: 2 }}>
                    {inst.code} · {store.typeLabel(inst)}
                  </div>
                </div>
                <div style={{ textAlign: "right", color: P.subtle, fontSize: 12 }}>
                  选择 →
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0 16px",
            }}
          >
            <div>
              <div style={{ fontSize: 16, color: P.text }}>{picked.name}</div>
              <div style={{ fontSize: 12, color: P.subtle, marginTop: 2 }}>
                {picked.code} · {store.typeLabel(picked)} ·{" "}
                {price > 0 ? "现价 ¥" + cFmtNum(price) : "现价 —"}
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setPicked(null)}
                style={{ ...tidalBtn(P), padding: "6px 12px", fontSize: 12 }}
              >
                换标的
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: P.muted, display: "block", marginBottom: 6 }}>
                持仓数量（{unit}）
              </label>
              <input
                value={shares}
                onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
                style={tidalInput(P)}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: P.muted, display: "block", marginBottom: 6 }}>
                成本价（¥）
              </label>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
                style={tidalInput(P)}
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
          </div>
          {preview && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                background: P.isDark ? "#16161a" : "#faf9f5",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: P.muted }}>预计市值</span>
              <span style={{ color: P.text }}>
                {cFmtMoney(preview.mv, { dec: 0 })}
                <span
                  style={{
                    color: cMove(preview.pct, P.isDark ? "dark" : "light"),
                    marginLeft: 10,
                  }}
                >
                  {cFmtPct(preview.pct)}
                </span>
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            {editing ? (
              <button
                onClick={() => {
                  store.removeHolding(picked.code);
                  onClose();
                }}
                style={tidalBtn(P, "danger")}
              >
                删除持仓
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={tidalBtn(P)}>
                取消
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                style={{
                  ...tidalBtn(P, "primary"),
                  opacity: canSave ? 1 : 0.45,
                  cursor: canSave ? "pointer" : "not-allowed",
                }}
              >
                {editing ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
