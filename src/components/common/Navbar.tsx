import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  PackageCheck,
  ShieldAlert,
  Volume2,
  VolumeX,
  Clock,
  LogOut,
  User as UserIcon,
  Store,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { soundFx } from '../../utils/audio';

interface NavbarProps {
  onOpenLoginModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLoginModal }) => {
  const { currentUser, quickLoginAs, logout } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setSoundEnabled(next);
    if (next) soundFx.playScanBeep();
  };

  return (
    <header className="h-[60px] bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white select-none shrink-0 shadow-md">
      {/* Brand & Store Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl tracking-tighter text-white shadow-xs">
          UM
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-sm tracking-tight text-white uppercase flex items-center gap-1.5">
              <span>URBAN MART</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                CRM & POS
              </span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Ghansoli Hub • Sector 8</p>
        </div>
      </div>

      {/* Profile Switcher Pills (Direct Evaluation & Profile Switching) */}
      <div className="hidden md:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => quickLoginAs('cashier')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentUser?.role === 'cashier'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Billing / POS Counter</span>
        </button>

        <button
          type="button"
          onClick={() => quickLoginAs('grn')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentUser?.role === 'grn'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>GRN / Inward Counter</span>
        </button>

        <button
          type="button"
          onClick={() => quickLoginAs('admin')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentUser?.role === 'admin'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Main Admin / Owner</span>
        </button>
      </div>

      {/* Right Controls: Clock, Sound, User info */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-[11px] font-mono text-slate-300 border border-slate-700/60">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{currentTime || '08:00:00 AM'}</span>
        </div>

        {/* Laser Audio Beep Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className={`p-2 rounded-lg border transition-colors ${
            soundEnabled
              ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title={soundEnabled ? 'Barcode Scan Sound: ON' : 'Barcode Scan Sound: OFF'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Current User Card & Switch Account */}
        {currentUser ? (
          <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-2 py-1.5 rounded-xl border border-slate-700 text-xs">
            <div className="text-right">
              <span className="font-bold text-white block leading-tight">{currentUser.fullName}</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                {currentUser.role} • {currentUser.counterName.split(' ')[0]}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
              title="Switch user / credential login"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
