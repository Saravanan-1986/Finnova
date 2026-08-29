import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, User, Shield } from 'lucide-react';
import FinnovaLogo from '../FinnovaLogo.jsx';
import { personalNavItems, insuranceNavItems } from '../../config/navItems.js';
import { useAuth } from '../../context/AuthContext.jsx';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('finnova_active_section') || 'personal';
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    localStorage.setItem('finnova_active_section', section);
  };

  const currentNavItems = activeSection === 'personal' ? personalNavItems : insuranceNavItems;

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
            <FinnovaLogo size={38} className="logo-glow shrink-0" />
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

          {/* Section Switcher Toggle */}
          <div className={`px-3 mb-4 transition-all duration-200 ${collapsed ? 'flex justify-center' : ''}`}>
            {collapsed ? (
              <div className="flex flex-col gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  onClick={() => handleSectionChange('personal')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    activeSection === 'personal'
                      ? 'bg-gradient-accent text-white shadow-glow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Personal Section"
                >
                  <User size={16} />
                </button>
                <button
                  onClick={() => handleSectionChange('insurance')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    activeSection === 'insurance'
                      ? 'bg-gradient-accent text-white shadow-glow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Insurance & Schemes Section"
                >
                  <Shield size={16} />
                </button>
              </div>
            ) : (
              <div className="relative flex p-1 rounded-xl bg-white/5 border border-white/10 select-none">
                <button
                  onClick={() => handleSectionChange('personal')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 z-10 ${
                    activeSection === 'personal'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{ position: 'relative' }}
                >
                  <User size={14} className="shrink-0" />
                  <span className="hidden lg:inline">Personal</span>
                </button>
                <button
                  onClick={() => handleSectionChange('insurance')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 z-10 ${
                    activeSection === 'insurance'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{ position: 'relative' }}
                >
                  <Shield size={14} className="shrink-0" />
                  <span className="hidden lg:inline">Insurance</span>
                </button>
                {/* Highlight Background Slider */}
                <div
                  className={`absolute top-1 bottom-1 rounded-lg bg-gradient-accent transition-all duration-300 shadow-glow ${
                    activeSection === 'personal'
                      ? 'left-1 w-[calc(50%-4px)]'
                      : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
                  }`}
                  style={{ zIndex: 0 }}
                />
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {currentNavItems.map((item) => (

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