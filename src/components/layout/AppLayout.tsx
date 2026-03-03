import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopNav, getActiveTab, TabType } from './TopNav';

export function AppLayout() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(() => getActiveTab(location.pathname));

  // Update active tab when route changes
  const currentTab = getActiveTab(location.pathname);
  if (currentTab !== activeTab) {
    setActiveTab(currentTab);
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar activeTab={activeTab} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
