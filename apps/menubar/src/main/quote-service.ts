import {
  createQuoteNormalizer,
  type FundEstimateLike,
  type FundQuoteLike,
  type QuoteNormalizerPort,
  type QuoteRequestItem,
  type SimpleQuoteLike,
} from "@tidal/core";

import { getSdk } from "./sdk";
import type { Quote } from "@shared/types";

export type { QuoteRequestItem };

const port: QuoteNormalizerPort = {
  getSimpleQuotes: (codes) => getSdk().getSimpleQuotes(codes) as Promise<SimpleQuoteLike[]>,
  getHKQuotes: (codes) => getSdk().getHKQuotes(codes) as Promise<SimpleQuoteLike[]>,
  getUSQuotes: (codes) => getSdk().getUSQuotes(codes) as Promise<SimpleQuoteLike[]>,
  getFundQuotes: (codes) => getSdk().getFundQuotes(codes) as Promise<FundQuoteLike[]>,
  getFundEstimate: (code) => getSdk().getFundEstimate(code) as Promise<FundEstimateLike>,
};

const normalizer = createQuoteNormalizer({ port });

export async function fetchQuotes(items: QuoteRequestItem[]): Promise<Quote[]> {
  return normalizer.fetchQuotes(items);
}
