import React, { useState } from 'react';
import { X, Sliders, AlertCircle, Check } from 'lucide-react';
import { Product, User } from '../../types';
import { db } from '../../services/db';

interface StockAdjustmentModalProps {
  product: Product;
  user: User;
  onSuccess: () => void;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  user,
  onSuccess,
  onClose,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'DAMAGE_ADJUSTMENT' | 'AUDIT_CORRECTION'>('DAMAGE_ADJUSTMENT');
  const [qtyDifference, setQtyDifference] = useState<number>(-1);
  const [reason, setReason] = useState<string>('Broken packaging / rat bite damage during stock audit');

  const newStock = product.currentStock + qtyDifference;

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyDifference === 0) {
      alert('Adjustment difference cannot be 0.');
      return;
    }

    const ok = db.adjustStock(product.id, qtyDifference, adjustmentType, reason, user);
    if (ok) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Stock Audit & Adjustment</h3>
              <p className="text-[11px] text-slate-400">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAdjust} className="p-6 space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-slate-500 font-semibold block">Current Recorded Stock</span>
              <p className="text-xl font-black text-slate-900">{product.currentStock} pcs</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold block">New Projected Stock</span>
              <p className={`text-xl font-black ${newStock < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                {newStock} pcs
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Adjustment Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as typeof adjustmentType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="DAMAGE_ADJUSTMENT">Damage / Leakage / Expiry Write-Off (-)</option>
              <option value="AUDIT_CORRECTION">Physical Audit Correction (Count Variance)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Quantity Delta (Positive + or Negative -)
            </label>
            <input
              type="number"
              required
              value={qtyDifference}
              onChange={(e) => setQtyDifference(Number(e.target.value))}
              className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Reason / Audit Notes *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" /> Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
