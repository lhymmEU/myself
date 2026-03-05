"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Coins, Key, Eye, EyeOff, Wallet } from "lucide-react";

interface CryptoConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function CryptoConfig({ settings, onUpdate }: CryptoConfigProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-5" />
          Crypto & Exchange Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Key className="size-4" />
            Binance API
          </h4>
          <div className="space-y-2">
            <Label htmlFor="binance-key">API Key</Label>
            <div className="relative">
              <Input
                id="binance-key"
                type={showApiKey ? "text" : "password"}
                value={settings.binance_api_key ?? ""}
                onChange={(e) => onUpdate("binance_api_key", e.target.value)}
                placeholder="Enter your Binance API key..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="binance-secret">API Secret</Label>
            <div className="relative">
              <Input
                id="binance-secret"
                type={showSecret ? "text" : "password"}
                value={settings.binance_api_secret ?? ""}
                onChange={(e) => onUpdate("binance_api_secret", e.target.value)}
                placeholder="Enter your Binance API secret..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Create a read-only API key at binance.com. Only &quot;Read&quot; permission is needed.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Wallet className="size-4" />
            Polkadot Wallets
          </h4>
          <div className="space-y-2">
            <Label htmlFor="polkadot-wallets">Wallet Addresses</Label>
            <Textarea
              id="polkadot-wallets"
              value={settings.polkadot_wallets ?? ""}
              onChange={(e) => onUpdate("polkadot_wallets", e.target.value)}
              placeholder="Enter Polkadot wallet addresses, one per line..."
              rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            One address per line. These are public addresses used for balance lookups only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
