"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PolkadotWalletBalance } from "@/lib/modules/finance/polkadot";

interface PolkadotWalletsProps {
  wallets: PolkadotWalletBalance[];
  dotPrice: number;
  loading: boolean;
  error?: string;
}

function formatUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function PolkadotWallets({
  wallets,
  dotPrice,
  loading,
  error,
}: PolkadotWalletsProps) {
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polkadot Asset Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Polkadot Asset Hub</CardTitle>
          {!loading && dotPrice > 0 && (
            <span className="text-xs font-mono text-muted-foreground">
              DOT = {formatUsd(dotPrice)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Loading...
          </p>
        ) : wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No wallets configured. Add addresses in Settings.
          </p>
        ) : (
          <div className="space-y-3">
            {wallets.map((w) => (
              <div
                key={w.address}
                className="rounded-lg border p-4 space-y-2"
              >
                <p className="text-xs font-mono text-muted-foreground">
                  {truncateAddress(w.address)}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Free</p>
                    <p className="font-mono text-sm">
                      {w.free.toFixed(4)} DOT
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reserved</p>
                    <p className="font-mono text-sm">
                      {w.reserved.toFixed(4)} DOT
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Value</p>
                    <p className="font-mono text-sm font-medium">
                      {formatUsd(w.usdValue)}
                    </p>
                  </div>
                </div>
                {w.assets && w.assets.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Asset Hub Tokens
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {w.assets.map((a) => (
                        <div
                          key={a.assetId}
                          className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1"
                        >
                          <span className="text-xs font-medium">
                            {a.symbol}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {a.balance.toLocaleString("en-US", {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {a.usdValue > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              ({formatUsd(a.usdValue)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
