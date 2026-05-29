"use client";

import { useEffect, useState } from "react";
import { apiFundProfile } from "@/lib/api-client";
import type { FundProfile } from "@/lib/types";

export interface FundProfileView {
  profile: FundProfile | null;
  loading: boolean;
}

/** Load the static-ish profile (asset allocation, manager, top holdings, NAV
 *  history) for a 场外基金 when its detail panel is open. */
export function useFundProfile(code: string | null): FundProfileView {
  const [profile, setProfile] = useState<FundProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    apiFundProfile(code)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return { profile, loading };
}
