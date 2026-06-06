import {
  derivePortfolio as deriveCorePortfolio,
  type PortfolioDerivation,
  type PortfolioDerivationInput,
} from "@tidal/core";

export type { PortfolioDerivation, PortfolioDerivationInput };
export { typeLabel, unitLabel } from "@tidal/core";

export function derivePortfolio(input: PortfolioDerivationInput): PortfolioDerivation {
  const derived = deriveCorePortfolio(input);
  return {
    ...derived,
    holdingsFull: derived.sortedHoldings,
  };
}
