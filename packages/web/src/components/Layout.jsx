import React, { useState } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { groupId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/join');
  }

  const navItems = [
    { to: `/g/${groupId}`, label: 'Início', end: true },
    { to: `/g/${groupId}/fixtures`, label: 'Jogos' },
    { to: `/g/${groupId}/bracket`, label: 'Chave' },
    { to: `/g/${groupId}/leaderboard`, label: 'Classificação' },
    { to: `/g/${groupId}/grupos`, label: 'Grupos' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-navy-card border-b border-navy-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚽</span>
            <span className="font-bold text-pitch-light tracking-tight">Chutômetro</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-pitch text-white'
                      : 'text-muted hover:text-white hover:bg-navy-border'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm text-muted truncate max-w-[120px]">
              {user?.displayName}
            </span>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-navy-border transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav + Dropdown Menu */}
        {menuOpen && (
          <div className="border-t border-navy-border bg-navy-card px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-pitch text-white' : 'text-muted hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to={`/g/${groupId}/grupos`}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-pitch text-white' : 'text-muted hover:text-white'
                }`
              }
            >
              Grupos
            </NavLink>
            <NavLink
              to={`/g/${groupId}/admin`}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-pitch text-white' : 'text-muted hover:text-white'
                }`
              }
            >
              Admin
            </NavLink>
            <NavLink
              to={`/g/${groupId}/pre-torneio`}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors"
            >
              Pré-Torneio
            </NavLink>
            <hr className="border-navy-border" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-navy-border transition-colors"
            >
              Sair
            </button>
          </div>
        )}
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-navy-card border-t border-navy-border z-40 flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-pitch-light' : 'text-muted'
              }`
            }
          >
            {item.label === 'Início' && <span className="text-lg mb-0.5">🏠</span>}
            {item.label === 'Jogos' && <span className="text-lg mb-0.5">📅</span>}
            {item.label === 'Classificação' && <span className="text-lg mb-0.5">🏆</span>}
            {item.label === 'Chave' && <span className="text-lg mb-0.5">🏟️</span>}
            {item.label === 'Grupos' && <span className="text-lg mb-0.5">🌍</span>}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-20 sm:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
