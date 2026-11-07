import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { PageHeaderProvider } from "../../context/PageHeaderContext";
import NewOrderNotifier from "../orders/NewOrderNotifier";

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <PageHeaderProvider>
      <div className="flex h-screen bg-page text-stone-800 overflow-hidden">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onToggleMenu={() => setMobileMenuOpen((v) => !v)} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      {/* Chuông báo và toast thông báo khi có đơn mới toàn hệ thống */}
      <NewOrderNotifier />
    </PageHeaderProvider>
  );
}