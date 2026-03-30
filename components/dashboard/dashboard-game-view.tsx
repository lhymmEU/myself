"use client";

import { WishlistSection } from "./wishlist-section";
import { UserPanel } from "./user-panel";
import { ClawPanel } from "./claw-panel";

export function DashboardGameView() {
  return (
    <div className="space-y-6 p-8">
      <WishlistSection />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
        <UserPanel />
        <ClawPanel />
      </div>
    </div>
  );
}
