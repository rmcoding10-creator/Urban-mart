import React, { useState } from 'react';
import { X, Clock, Banknote, DollarSign, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { CashierShift, User } from '../../types';
import { db } from '../../services/db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface ShiftModalProps {
  user: User;
  activeShift?: CashierShift;
  onShiftUpdated: () => void;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  user,
  activeShift,
  onShiftUpdated,
  onClose,
}) => {
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [declaredCash, setDeclaredCash] = useState<number>(
    activeShift ? (activeShift.openingFloat || 0) + (activeShift.totalCashSales || 0) : 0
  );
  const [closingNotes, setClosingNotes] = useState<string>('Standard shift handover at register');
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);

  const handleOpenShift = () => {
    db.openShift(user, openingFloat);
    onShiftUpdated();
    onClose();
  };

  const handleCloseShift = () => {
    if (!activeShift) return;
    db.closeShift(activeShift.id, declaredCash, closingNotes, user);
    onShiftUpdated();
    onClose();
  };

  const expectedCashInDrawer = activeShift
    ? (activeShift.openingFloat || 0) + (activeShift.totalCashSales || 0)
    : 0;
  const cashVariance = declaredCash - expectedCashInDrawer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Cashier Shift & Till Management</h3>
              <p className="text-[11px] text-slate-400">{user.counterName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!activeShift ? (
            /* OPEN SHIFT SCREEN */
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
                <p className="font-semibold mb-1">No Active Shift Found</p>
                <p>
                  Please enter the opening cash drawer float (denominations received from supervisor)
                  before processing customer bills.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Opening Cash Drawer Float (₹)
                </label>
                <div className="relative">
                  <Banknote className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 text-lg font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {[1000, 2000, 3000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOpeningFloat(amt)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleOpenShift}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Open Register Shift Now
              </button>
            </div>
          ) : (
            /* ACTIVE SHIFT SUMMARY & CLOSE */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5" /> Shift Active
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Started at: {formatDateTime(activeShift.openedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500">Total Invoices</span>
                  <p className="text-xl font-bold text-slate-900">{activeShift.totalBillsCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Opening Float</span>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {formatCurrency(activeShift.openingFloat)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Cash Collected</span>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    {formatCurrency(activeShift.totalCashSales)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">UPI Sales</span>
                  <p className="text-base font-bold text-blue-700 mt-0.5">
                    {formatCurrency(activeShift.totalUpiSales)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Card Sales</span>
                  <p className="text-base font-bold text-purple-700 mt-0.5">
                    {formatCurrency(activeShift.totalCardSales)}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900">Expected Physical Cash in Drawer</span>
                  <p className="text-xs text-amber-700">Opening float + cash sales</p>
                </div>
                <div className="text-lg font-extrabold text-amber-950">
                  {formatCurrency(expectedCashInDrawer)}
                </div>
              </div>

              {!isClosingConfirm ? (
                <div className="pt-2 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Keep Shift Running
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsClosingConfirm(true)}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
                  >
                    Close Shift & Handover
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">
                    Reconciliation Handover
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Physical Cash Counted in Drawer (₹)
                    </label>
                    <input
                      type="number"
                      value={declaredCash}
                      onChange={(e) => setDeclaredCash(Number(e.target.value))}
                      className="w-full text-base font-bold px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 bg-slate-100 rounded-lg font-semibold">
                    <span>Variance (Difference):</span>
                    <span
                      className={
                        cashVariance === 0
                          ? 'text-emerald-700'
                          : cashVariance > 0
                          ? 'text-blue-700'
                          : 'text-rose-700'
                      }
                    >
                      {cashVariance === 0
                        ? 'Exact Match (₹0.00)'
                        : cashVariance > 0
                        ? `Surplus: +${formatCurrency(cashVariance)}`
                        : `Shortage: ${formatCurrency(cashVariance)}`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsClosingConfirm(false)}
                      className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseShift}
                      className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                    >
                      Confirm Closing Shift
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
