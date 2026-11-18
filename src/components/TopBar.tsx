import React from 'react';
import type { User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

export type AppSection = 'home' | 'board' | 'campaigns' | 'compendium';

interface TopBarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  hasActiveCampaign: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onNavigate,
  user,
  onSignIn,
  onSignOut,
  hasActiveCampaign,
}) => {
  return (
    <header className="w-full border-b border-stone-800/80 bg-[#0d1017]/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          onClick={() => onNavigate('home')}
          className="font-display text-lg font-bold tracking-wide text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Crónicas del Abismo
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-300">
          <button
            onClick={() => onNavigate('home')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'home'
                ? 'border-amber-400 text-stone-100'
                : 'border-transparent hover:text-stone-100 hover:border-stone-600'
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => onNavigate('board')}
            disabled={!hasActiveCampaign}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              !hasActiveCampaign
                ? 'border-transparent text-stone-600 cursor-not-allowed'
                : activeSection === 'board'
                ? 'border-amber-400 text-stone-100 cursor-pointer'
                : 'border-transparent hover:text-stone-100 hover:border-stone-600 cursor-pointer'
            }`}
          >
            Tablero TV
          </button>
          <button
            onClick={() => onNavigate('campaigns')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'campaigns'
                ? 'border-amber-400 text-stone-100'
                : 'border-transparent hover:text-stone-100 hover:border-stone-600'
            }`}
          >
            Campañas
          </button>
          <button
            onClick={() => onNavigate('compendium')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'compendium'
                ? 'border-amber-400 text-stone-100'
                : 'border-transparent hover:text-stone-100 hover:border-stone-600'
            }`}
          >
            Razas y Magia
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              onClick={onSignOut}
              title={user.email ?? 'Cuenta conectada'}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-200 bg-[#181d29] hover:bg-[#222838] border border-stone-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              Cerrar Sesión
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Guardar en Nube
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
