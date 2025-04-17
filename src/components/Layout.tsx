
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDaysIcon, FolderIcon, SettingsIcon } from "lucide-react";
import { appService } from "@/lib/appService";
import { initDemoData } from "@/lib/db";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  // Initialize app and demo data
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize app service
        appService.init();
        
        // Initialize demo data (will only run if database is empty)
        await initDemoData();
      } catch (error) {
        console.error("Error initializing app:", error);
      }
    };
    
    initApp();
    
    // Check for theme preference in localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme === 'dark' || 
          (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>
      
      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="container flex justify-around max-w-md mx-auto">
          <NavButton
            to="/"
            icon={<CalendarDaysIcon size={24} />}
            label="Aujourd'hui"
            isActive={location.pathname === '/'}
          />
          <NavButton
            to="/projects"
            icon={<FolderIcon size={24} />}
            label="Projets"
            isActive={location.pathname === '/projects'}
          />
          <NavButton
            to="/settings"
            icon={<SettingsIcon size={24} />}
            label="Paramètres"
            isActive={location.pathname === '/settings'}
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavButton = ({ to, icon, label, isActive }: NavButtonProps) => {
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center py-3 px-2 ${
        isActive 
          ? 'text-focus-orange' 
          : 'text-gray-600 dark:text-gray-400'
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
};

export default Layout;
