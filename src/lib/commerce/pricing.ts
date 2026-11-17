/**
 * Deterministic pricing engine (Blueprint §3 & §6 "AI Quotation Assistant").
 * Pure: no I/O, integer paise everywhere. AI may *propose* lines; only this computes money.
 *
 *   contribution = net sales − procurement/branding − variable fulfilment − partner remuneration
 */

export type Channel = "associate" | "franchise" | "enterprise" | "direct";

export type PricingLineInput = {
  productId: string;
  quantity: number;
  /** Approved selling price per unit, excl. GST. */
  unitPricePaise: number;
  /** Landed cost per unit; null → estimated at DEFAULT_COST_RATIO_BPS of price. */
  unitCostPaise: number | null;
  gstRateBps: number;
};

export type PricingPolicy = {
  /** Freight, payment and claims, as share of net sales. Blueprint: 7%. */
  variableCostBps: number;
  /** Minimum acceptable contribution after variable costs. Blueprint: 12–15%. */
  minContributionBps: number;
  /** Used when landed cost is unknown. Blueprint illustration: 70%. */
  defaultCostRatioBps: number;
  freightGstRateBps: number;
};

export const DEFAULT_POLICY: PricingPolicy = {
  variableCostBps: 700,
  minContributionBps: 1200,
  defaultCostRatioBps: 7000,
  freightGstRateBps: 1800,
};

export type PartnerTerms = { commissionBps: number; serviceFeeBps: number } | null;

export type PricedLine = PricingLineInput & {
  unitCostPaise: number;
  costEstimated: boolean;
  lineNetPaise: number;
  lineGstPaise: number;
  lineCostPaise: number;
};

export type PricingResult = {
  lines: PricedLine[];
  subtotalPaise: number;
  freightPaise: number;
  gstPaise: number;
  totalPaise: number;
  costPaise: number;
  variableCostPaise: number;
  /** Partner commission + service fee, on the eligible base (net goods value excl. GST and freight). */
  commissionPaise: number;
  contributionPaise: number;
  contributionBps: number;
  belowMinimum: boolean;
  anyCostEstimated: boolean;
};

const pct = (amount: number, bps: number) => Math.round((amount * bps) / 10_000);

export function priceQuote(
  input: { lines: PricingLineInput[]; freightPaise?: number; channel: Channel; partner: PartnerTerms },
  policy: PricingPolicy = DEFAULT_POLICY,
): PricingResult {
  if (input.lines.length === 0) throw new Error("A quote needs at least one line");
  if (input.channel !== "direct" && !input.partner)
    throw new Error(`Channel "${input.channel}" requires partner terms`);

  const lines: PricedLine[] = input.lines.map((l) => {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new Error("Quantity must be a positive integer");
    if (!Number.isInteger(l.unitPricePaise) || l.unitPricePaise <= 0) throw new Error("Price must be positive paise");
    const costEstimated = l.unitCostPaise == null;
    const unitCostPaise = l.unitCostPaise ?? pct(l.unitPricePaise, policy.defaultCostRatioBps);
    const lineNetPaise = l.unitPricePaise * l.quantity;
    return {
      ...l,
      unitCostPaise,
      costEstimated,
      lineNetPaise,
      lineGstPaise: pct(lineNetPaise, l.gstRateBps),
      lineCostPaise: unitCostPaise * l.quantity,
    };
  });

  const subtotalPaise = lines.reduce((a, l) => a + l.lineNetPaise, 0);
  const freightPaise = input.freightPaise ?? 0;
  const gstPaise = lines.reduce((a, l) => a + l.lineGstPaise, 0) + pct(freightPaise, policy.freightGstRateBps);
  const totalPaise = subtotalPaise + freightPaise + gstPaise;
  const costPaise = lines.reduce((a, l) => a + l.lineCostPaise, 0);
  const variableCostPaise = pct(subtotalPaise, policy.variableCostBps);

  const remunerationBps =
    input.channel === "direct" || !input.partner
      ? 0
      : input.partner.commissionBps + input.partner.serviceFeeBps;
  const commissionPaise = pct(subtotalPaise, remunerationBps);

  const contributionPaise = subtotalPaise - costPaise - variableCostPaise - commissionPaise;
  const contributionBps = Math.round((contributionPaise * 10_000) / subtotalPaise);

  return {
    lines,
    subtotalPaise,
    freightPaise,
    gstPaise,
    totalPaise,
    costPaise,
    variableCostPaise,
    commissionPaise,
    contributionPaise,
    contributionBps,
    belowMinimum: contributionBps < policy.minContributionBps,
    anyCostEstimated: lines.some((l) => l.costEstimated),
  };
}

/** Advance required before production on custom corporate orders (Blueprint §7). */
export const ADVANCE_BPS = 5000;
export const advanceDue = (totalPaise: number) => pct(totalPaise, ADVANCE_BPS);

export function formatINR(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}
