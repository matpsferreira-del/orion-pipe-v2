import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopNav, getActiveTab, TabType } from './TopNav';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(() => getActiveTab(location.pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Update active tab when route changes
  const currentTab = getActiveTab(location.pathname);
  if (currentTab !== activeTab) {
    setActiveTab(currentTab);
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-left">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <AppSidebar
          activeTab={activeTab}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-auto w-full text-left">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
