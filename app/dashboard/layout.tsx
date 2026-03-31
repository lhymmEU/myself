import { Sidebar } from "@/components/layout/sidebar";
import { ContentHeader } from "@/components/layout/content-header";
import { SWRProvider } from "@/lib/swr/provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <ContentHeader />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SWRProvider>
  );
}
