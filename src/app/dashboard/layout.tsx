import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Bitlance Call Analytics",
  description: "View and manage call analytics",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto pt-16 md:pt-0 bg-slate-50 dark:bg-slate-950">
        {children}
      </div>
    </div>
  );
}
