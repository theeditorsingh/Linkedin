import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa]">
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
