import { MindMapCanvas } from "@/components/mind-map/mind-map-canvas";

export default function MindMapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mind Map</h1>
        <p className="text-muted-foreground">Organize every aspect of your life</p>
      </div>
      <div className="h-[calc(100vh-160px)] rounded-lg border border-border overflow-hidden">
        <MindMapCanvas />
      </div>
    </div>
  );
}
