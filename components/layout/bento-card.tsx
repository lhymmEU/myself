"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface BentoCardProps {
  title: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
  children: React.ReactNode;
}

export function BentoCard({
  title,
  icon: Icon,
  href,
  className,
  children,
}: BentoCardProps) {
  const card = (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20 group",
        href && "cursor-pointer",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}
