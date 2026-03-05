import { MindMapCanvas } from "@/components/mind-map/mind-map-canvas";

export default function MindMapPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h1 className="text-lg font-bold tracking-tight">Mind Map</h1>
        <p className="text-xs text-muted-foreground">
          Freeform canvas for organizing your thoughts
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <MindMapCanvas />
      </div>
    </div>
  );
}
