import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { navItems } from '../../config/navItems.js';
import { useAuth } from '../../context/AuthContext.jsx';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-bg-base bg-gradient-radial-glow">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 left-0 z-40 h-screen flex flex-col bg-bg-deep/80 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${
            collapsed ? 'w-[72px]' : 'w-[72px] lg:w-64'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-white" />
            </div>
            {!collapsed && (
              <div className="hidden lg:block">
                <h1 className="font-bold text-lg leading-tight bg-gradient-accent bg-clip-text text-transparent">
                  FINNOVA
                </h1>
                <p className="text-[10px] text-gray-500 tracking-widest uppercase">
                  Finance Planner
                </p>
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''} ${
                    collapsed ? 'justify-center px-0' : ''
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && (
                  <span className="hidden lg:inline flex-1 text-sm font-medium">{item.label}</span>
                )}
                {!collapsed && item.comingSoon && (
                  <span className="hidden lg:inline text-[9px] px-1.5 py-0.5 rounded-full bg-accent-start/20 text-accent-start border border-accent-start/30">
                    Soon
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mx-3 mb-3 p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* User profile */}
          <div className="border-t border-white/10 p-4">
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center font-semibold text-sm shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <>
                  <div className="hidden lg:block flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="hidden lg:block p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 ml-[72px] lg:ml-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;