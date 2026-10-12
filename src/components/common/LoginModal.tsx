import React, { useState } from 'react';
import { X, Lock, User, ShoppingCart, PackageCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface LoginModalProps {
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login, quickLoginAs } = useAuth();
  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(username, pin);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  const handleQuickSelect = (role: UserRole) => {
    quickLoginAs(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg">
              UM
            </div>
            <div>
              <h2 className="font-extrabold text-base">URBAN MART Authenticator</h2>
              <p className="text-xs text-slate-400">Three Central Counter Profiles</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Select Profile Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              1-Click Fast Profile Switcher
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('cashier')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">
                      Billing / POS Counter
                    </p>
                    <p className="text-[11px] text-slate-500">
                      User: <strong>cashier</strong> (Pooja Patil) • Fast Barcode & Cash Drawer
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('grn')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 group-hover:text-purple-800">
                      GRN / Stock Inward Counter
                    </p>
                    <p className="text-[11px] text-slate-500">
                      User: <strong>grn</strong> (Amit Shinde) • Vendor Invoice & Stock Inward
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('admin')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 group-hover:text-blue-800">
                      Main Admin / Store Owner
                    </p>
                    <p className="text-[11px] text-slate-500">
                      User: <strong>admin</strong> (Rajesh Sharma) • Full Control & Stock Ledger
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Or Sign In with Credentials
            </span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          {/* Credential login form */}
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, cashier, or grn"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">PIN / Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter secret PIN..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer mt-2"
            >
              Sign In to Counter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
