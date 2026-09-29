import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  School,
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewPayment: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewPayment,
}) => {
  const { config, currentUser, setCurrentUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const sampleUsers: { name: string; role: UserRole }[] = [
    { name: 'Encik Abdul Rahman (PK HEM)', role: 'Pentadbir' },
    { name: 'Cikgu Noraini binti Daud', role: 'Guru/Petugas' },
    { name: 'Cikgu Mohd Hafiz bin Salleh', role: 'Guru/Petugas' },
    { name: 'Puan Siti Mariam (Guru Kelas 3A)', role: 'Guru/Petugas' },
  ];

  const handleSelectUser = (u: { name: string; role: UserRole }) => {
    setCurrentUser(u);
    setUserDropdownOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard },
    { id: 'students', label: 'Senarai Murid', icon: Users },
    { id: 'transactions', label: 'Sejarah Resit', icon: Receipt },
    { id: 'reports', label: 'Laporan & Eksport', icon: FileSpreadsheet },
    ...(currentUser.role === 'Pentadbir'
      ? [
          { id: 'settings', label: 'Kadar & Tetapan', icon: Settings },
          { id: 'audit', label: 'Jejak Audit', icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800">
      {/* Top Banner with School Identity and User Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            {config.logoBase64 ? (
              <img
                src={config.logoBase64}
                alt="Logo Sekolah"
                className="w-10 h-10 object-contain rounded bg-white p-0.5"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm border border-emerald-500">
                <School className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  {config.schoolName}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium hidden sm:inline-block">
                  Tahun 3 ({config.currentSchoolYear})
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
                Sistem Rekod Pembayaran Yuran & Keperluan
              </p>
            </div>
          </div>

          {/* Quick Payment Action & User Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenNewPayment}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Rekod Bayaran</span>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 text-left transition cursor-pointer text-xs sm:text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="hidden md:block">
                  <div className="font-medium text-slate-200 leading-tight truncate max-w-[130px]">
                    {currentUser.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl py-2 z-50 border border-slate-200 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-500 font-medium">Log Masuk Sebagai Pengguna:</p>
                    <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                    <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${currentUser.role === 'Pentadbir' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      Peranan: {currentUser.role}
                    </span>
                  </div>

                  <div className="p-1">
                    <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Tukar Profil Pengguna:
                    </p>
                    {sampleUsers.map((u, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectUser(u)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                          currentUser.name === u.name
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2">{u.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            u.role === 'Pentadbir'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-[11px] text-slate-500">
                    {currentUser.role === 'Pentadbir' ? (
                      <span className="text-amber-700 font-medium">
                        ✓ Akses Penuh: Kadar Yuran, Pembatalan, MyKid Penuh, Jejak Audit.
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        ✓ Akses Petugas: Rekod bayaran & muat turun resit rasmi. MyKid disamarkan.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden sm:flex space-x-1 border-t border-slate-800/80 pt-1 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-850 border-t border-slate-800 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
