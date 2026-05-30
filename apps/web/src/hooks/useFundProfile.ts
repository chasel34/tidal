"use client";

import { useQuery } from "@tanstack/react-query";
import { fundProfileOptions } from "@/lib/query-options";
import type { FundProfile } from "@/lib/types";

export interface FundProfileView {
  profile: FundProfile | null;
  loading: boolean;
}

/** Load the static-ish profile (asset allocation, manager, top holdings, NAV
 *  history) for a 场外基金 when its detail panel is open. */
export function useFundProfile(code: string | null): FundProfileView {
  const enabled = !!code;

  const { data, isLoading } = useQuery({
    ...fundProfileOptions(code ?? ""),
    enabled,
  });

  return {
    profile: enabled ? (data ?? null) : null,
    loading: enabled && isLoading,
  };
}
