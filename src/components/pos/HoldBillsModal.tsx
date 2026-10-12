import React from 'react';
import { X, Play, Trash2, ShoppingBag, Clock } from 'lucide-react';
import { HeldCart } from '../../types';
import { formatCurrency, formatTime } from '../../utils/formatters';

interface HoldBillsModalProps {
  heldCarts: HeldCart[];
  onResume: (cart: HeldCart) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const HoldBillsModal: React.FC<HoldBillsModalProps> = ({
  heldCarts,
  onResume,
  onDelete,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Held Customer Bills</h3>
              <p className="text-[11px] text-slate-400">{heldCarts.length} carts parked</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
          {heldCarts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No Bills Currently on Hold</p>
              <p className="text-xs mt-1">
                You can park an ongoing cart at any time using the [Hold Bill] button.
              </p>
            </div>
          ) : (
            heldCarts.map((cart) => {
              const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
              const totalAmount = cart.items.reduce((s, i) => s + i.totalAmount, 0);

              return (
                <div
                  key={cart.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 transition-all flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-100 text-amber-900 border border-amber-200">
                        {cart.tokenNumber}
                      </span>
                      <span className="font-bold text-sm text-slate-800">{cart.customerName}</span>
                      {cart.customerPhone && (
                        <span className="text-xs text-slate-500">({cart.customerPhone})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTime(cart.heldAt)}
                      </span>
                      <span>•</span>
                      <span>{cart.items.length} SKUs ({totalItems} pcs)</span>
                      <span>•</span>
                      <span className="font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDelete(cart.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors title='Discard'"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onResume(cart)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume Bill
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
