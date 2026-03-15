"use client";

import type { RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/context";
import { Users, Blocks, Target } from "lucide-react";
import { UserPanel } from "./panels/user-panel";
import { FeaturePanel } from "./panels/feature-panel";
import { DemandPanel } from "./panels/demand-panel";

interface ProductSidebarProps {
  excalidrawAPI: RefObject<ExcalidrawImperativeAPI | null>;
}

export function ProductSidebar({ excalidrawAPI }: ProductSidebarProps) {
  const t = useT();

  return (
    <Tabs defaultValue="users" className="h-full flex flex-col">
      <TabsList className="w-full shrink-0 rounded-none border-b">
        <TabsTrigger value="users" className="gap-1">
          <Users className="w-3.5 h-3.5" />
          {t("mindMap.product.users")}
        </TabsTrigger>
        <TabsTrigger value="features" className="gap-1">
          <Blocks className="w-3.5 h-3.5" />
          {t("mindMap.product.features")}
        </TabsTrigger>
        <TabsTrigger value="demands" className="gap-1">
          <Target className="w-3.5 h-3.5" />
          {t("mindMap.product.demands")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="overflow-y-auto">
        <UserPanel excalidrawAPI={excalidrawAPI} />
      </TabsContent>
      <TabsContent value="features" className="overflow-y-auto">
        <FeaturePanel excalidrawAPI={excalidrawAPI} />
      </TabsContent>
      <TabsContent value="demands" className="overflow-y-auto">
        <DemandPanel excalidrawAPI={excalidrawAPI} />
      </TabsContent>
    </Tabs>
  );
}
