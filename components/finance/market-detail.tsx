"use client";

import { useT } from "@/lib/i18n/context";
import type { PolymarketMarket } from "@/lib/modules/finance/polymarket";

interface MarketDetailProps {
  market: PolymarketMarket | null;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function OutcomeBar({
  label,
  price,
}: {
  label: string;
  price: number;
}) {
  const pct = Math.round(price * 100);
  const isYes = label.toLowerCase() === "yes";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-amber-300">{label}</span>
        <span className="text-sm font-mono font-bold text-amber-100">
          {pct}¢
        </span>
      </div>
      <div className="w-full h-4 bg-amber-950/40 rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all ${
            isYes ? "bg-green-500/70" : "bg-red-500/70"
          }`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function MarketDetail({ market }: MarketDetailProps) {
  const t = useT();

  if (!market) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            {t("finance.marketDetail.title")}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-amber-800 text-[10px]">
          {t("finance.marketDetail.selectMarket")}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          {t("finance.marketDetail.title")}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            market.closed
              ? "bg-red-900/40 text-red-400"
              : "bg-green-900/40 text-green-400"
          }`}
        >
          {market.closed ? t("finance.marketDetail.closed") : t("finance.marketDetail.active")}
        </span>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        <div>
          <h3 className="text-sm text-amber-100 font-medium leading-snug">
            {market.question}
          </h3>
        </div>

        <div className="space-y-2">
          {market.outcomes.map((outcome, i) => (
            <OutcomeBar
              key={outcome}
              label={outcome}
              price={market.outcomePrices[i] ?? 0}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-amber-900/20 rounded p-2">
            <p className="text-[10px] text-amber-700 uppercase">{t("finance.marketDetail.volume")}</p>
            <p className="text-xs font-mono text-amber-200">
              {formatVolume(market.volume)}
            </p>
          </div>
          <div className="border border-amber-900/20 rounded p-2">
            <p className="text-[10px] text-amber-700 uppercase">{t("finance.marketDetail.endDate")}</p>
            <p className="text-xs font-mono text-amber-200">
              {formatDate(market.endDate)}
            </p>
          </div>
          {market.category && (
            <div className="border border-amber-900/20 rounded p-2">
              <p className="text-[10px] text-amber-700 uppercase">{t("finance.marketDetail.category")}</p>
              <p className="text-xs text-amber-200">{market.category}</p>
            </div>
          )}
          <div className="border border-amber-900/20 rounded p-2">
            <p className="text-[10px] text-amber-700 uppercase">{t("finance.marketDetail.slug")}</p>
            <p className="text-xs font-mono text-amber-500 truncate">
              {market.slug}
            </p>
          </div>
        </div>

        {market.description && (
          <div>
            <p className="text-[10px] text-amber-700 uppercase mb-1">
              {t("common.description")}
            </p>
            <p className="text-[11px] text-amber-400/80 leading-relaxed line-clamp-6">
              {market.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
