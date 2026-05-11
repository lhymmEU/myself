"use client";

import { WishlistDashboard } from "@/components/wishlist/wishlist-dashboard";

export function DashboardGameView() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <WishlistDashboard />
    </div>
  );
}
