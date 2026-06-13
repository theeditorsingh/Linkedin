import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <main className="flex-1 pb-20 overflow-hidden">{children}</main>
      <BottomNav />
    </div>
  );
}
