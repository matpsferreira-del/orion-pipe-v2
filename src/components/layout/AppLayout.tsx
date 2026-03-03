import { useState } from "react";
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopNav, getActiveTab, TabType } from './TopNav';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(() => getActiveTab(location.pathname));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const currentTab = getActiveTab(location.pathname);
  if (currentTab !== activeTab) {
    setActiveTab(currentTab);
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMenuToggle={() => setMobileMenuOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && <AppSidebar activeTab={activeTab} />}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      {isMobile && (
        <MobileNav
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </div>
  );
}
