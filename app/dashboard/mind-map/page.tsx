"use client";

import { MindMapCanvas } from "@/components/mind-map/mind-map-canvas";

export default function MindMapPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <MindMapCanvas />
    </div>
  );
}
