import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginModal } from './components/common/LoginModal';
import { POSBillingScreen } from './components/pos/POSBillingScreen';
import { GRNInwardScreen } from './components/grn/GRNInwardScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ShoppingCart, PackageCheck, ShieldAlert, ArrowRight } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, quickLoginAs } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900">
      {/* Top Navbar */}
      <Navbar onOpenLoginModal={() => setShowLoginModal(true)} />

      {/* Main View Router */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!currentUser ? (
          /* Profile Selector Landing if not signed in */
          <div className="flex-1 flex items-center justify-center p-6 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="max-w-xl w-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-3xl mx-auto shadow-xl">
                UM
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">URBAN MART SUPERMARKET</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Enterprise Supermarket Management System • Ghansoli Branch
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 text-left">
                <button
                  type="button"
                  onClick={() => quickLoginAs('cashier')}
                  className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-emerald-500 transition-all group flex flex-col justify-between h-40 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-emerald-400">
                      Billing POS
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Counter 01 Cashier</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('grn')}
                  className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-purple-500 transition-all group flex flex-col justify-between h-40 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-purple-400">
                      GRN Inward
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Depot Receiving Gate</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('admin')}
                  className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-blue-500 transition-all group flex flex-col justify-between h-40 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-blue-400">
                      Main Admin
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Owner Control Center</p>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="text-xs text-blue-400 hover:underline font-semibold"
                >
                  Or enter username and PIN password manually →
                </button>
              </div>
            </div>
          </div>
        ) : currentUser.role === 'cashier' ? (
          <POSBillingScreen currentUser={currentUser} />
        ) : currentUser.role === 'grn' ? (
          <GRNInwardScreen currentUser={currentUser} />
        ) : (
          <AdminDashboard currentUser={currentUser} />
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
