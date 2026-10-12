import React, { useState } from 'react';
import { X, Search, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SaleInvoice, SalesReturnItem, User } from '../../types';
import { db } from '../../services/db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface SalesReturnModalProps {
  user: User;
  onReturnSuccess: (returnNumber: string) => void;
  onClose: () => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  user,
  onReturnSuccess,
  onClose,
}) => {
  const [billNumberInput, setBillNumberInput] = useState('');
  const [matchedInvoice, setMatchedInvoice] = useState<SaleInvoice | null>(null);
  const [searchError, setSearchError] = useState('');

  // Selected return items map: itemId -> { qty, condition, reason }
  const [returnItemsState, setReturnItemsState] = useState<{
    [productId: string]: {
      selected: boolean;
      qty: number;
      condition: 'RESALABLE' | 'DAMAGED';
      reason: string;
    };
  }>({});

  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CREDIT_NOTE' | 'UPI'>('CASH');
  const [notes, setNotes] = useState('Customer returned goods at POS counter');

  const handleSearchBill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError('');
    const inv = db.getInvoiceByBillNumber(billNumberInput);
    if (!inv) {
      setSearchError('Bill number not found. Please verify the bill number printed on receipt.');
      setMatchedInvoice(null);
      return;
    }
    setMatchedInvoice(inv);

    // Initialize item states
    const initial: typeof returnItemsState = {};
    inv.items.forEach((item) => {
      initial[item.productId] = {
        selected: false,
        qty: item.quantity,
        condition: 'RESALABLE',
        reason: 'Customer changed mind',
      };
    });
    setReturnItemsState(initial);
  };

  const calculateTotalRefund = (): number => {
    if (!matchedInvoice) return 0;
    return matchedInvoice.items.reduce((sum, item) => {
      const state = returnItemsState[item.productId];
      if (state && state.selected && state.qty > 0) {
        return sum + item.unitPrice * state.qty;
      }
      return sum;
    }, 0);
  };

  const handleSubmitReturn = () => {
    if (!matchedInvoice) return;
    const itemsToReturn: SalesReturnItem[] = [];

    matchedInvoice.items.forEach((item) => {
      const state = returnItemsState[item.productId];
      if (state && state.selected && state.qty > 0) {
        itemsToReturn.push({
          productId: item.productId,
          productName: item.productName,
          barcode: item.barcode,
          returnedQty: state.qty,
          unitPrice: item.unitPrice,
          refundAmount: item.unitPrice * state.qty,
          condition: state.condition,
          reason: state.reason,
        });
      }
    });

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    const totalRefund = calculateTotalRefund();
    const result = db.processSalesReturn(
      {
        originalBillNumber: matchedInvoice.billNumber,
        invoiceId: matchedInvoice.id,
        customerName: matchedInvoice.customerName,
        customerPhone: matchedInvoice.customerPhone,
        items: itemsToReturn,
        totalRefundAmount: totalRefund,
        refundMethod,
        notes,
      },
      user
    );

    if (result.success) {
      onReturnSuccess(result.returnNumber);
    }
  };

  const totalRefund = calculateTotalRefund();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-bold text-sm">POS Sales Return & Customer Refund</h3>
              <p className="text-[11px] text-slate-400">Restores inventory and calculates refund</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Bill search form */}
          <form onSubmit={handleSearchBill} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter Original Bill No (e.g. UM-POS-2026-0101)..."
                value={billNumberInput}
                onChange={(e) => setBillNumberInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" /> Search Bill
            </button>
          </form>

          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {matchedInvoice && (
            <div className="space-y-4">
              {/* Bill Details Overview */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm">
                    {matchedInvoice.billNumber}
                  </span>
                  <p className="text-slate-500">
                    Billed on {formatDateTime(matchedInvoice.createdAt)} by {matchedInvoice.cashierName}
                  </p>
                  <p className="text-slate-700 font-medium mt-0.5">
                    Customer: {matchedInvoice.customerName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Original Total</span>
                  <div className="text-base font-extrabold text-slate-900">
                    {formatCurrency(matchedInvoice.grandTotal)}
                  </div>
                </div>
              </div>

              {/* Items Table for Return Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Select Items Being Returned
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {matchedInvoice.items.map((item) => {
                    const state = returnItemsState[item.productId] || {
                      selected: false,
                      qty: 1,
                      condition: 'RESALABLE',
                      reason: '',
                    };

                    return (
                      <div
                        key={item.productId}
                        className={`p-3 text-xs transition-colors ${
                          state.selected ? 'bg-blue-50/60' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={state.selected}
                              onChange={(e) =>
                                setReturnItemsState((prev) => ({
                                  ...prev,
                                  [item.productId]: { ...prev[item.productId], selected: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{item.productName}</p>
                              <p className="text-[11px] text-slate-500">
                                Sold: {item.quantity} pcs @ ₹{item.unitPrice}
                              </p>
                            </div>
                          </label>

                          {state.selected && (
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="text-[10px] text-slate-500 block">Return Qty</span>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={state.qty}
                                  onChange={(e) =>
                                    setReturnItemsState((prev) => ({
                                      ...prev,
                                      [item.productId]: {
                                        ...prev[item.productId],
                                        qty: Math.min(item.quantity, Math.max(1, Number(e.target.value))),
                                      },
                                    }))
                                  }
                                  className="w-16 px-2 py-1 text-center font-bold border border-slate-300 rounded-md bg-white text-xs"
                                />
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-500 block">Condition</span>
                                <select
                                  value={state.condition}
                                  onChange={(e) =>
                                    setReturnItemsState((prev) => ({
                                      ...prev,
                                      [item.productId]: {
                                        ...prev[item.productId],
                                        condition: e.target.value as 'RESALABLE' | 'DAMAGED',
                                      },
                                    }))
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded-md bg-white text-xs"
                                >
                                  <option value="RESALABLE">Resalable (Restores Stock)</option>
                                  <option value="DAMAGED">Damaged / Expired (No Restock)</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Method & Settlement */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Refund Payout Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as 'CASH' | 'CREDIT_NOTE' | 'UPI')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CASH">Cash Refund from Drawer</option>
                    <option value="UPI">UPI Refund to Customer Account</option>
                    <option value="CREDIT_NOTE">Store Credit Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Total Refund Banner */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-900">Total Refund Due:</span>
                  <p className="text-[11px] text-rose-700">
                    Will update inventory and register stock ledger entry
                  </p>
                </div>
                <div className="text-xl font-extrabold text-rose-700">
                  {formatCurrency(totalRefund)}
                </div>
              </div>
            </div>
          )}
        </div>

        {matchedInvoice && (
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitReturn}
              disabled={totalRefund === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Process Refund ({formatCurrency(totalRefund)})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
