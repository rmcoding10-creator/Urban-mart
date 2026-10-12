import React, { useState } from 'react';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Customer, PaymentDetails, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PaymentModalProps {
  grandTotal: number;
  customer?: Customer;
  onConfirmPayment: (paymentDetails: PaymentDetails, pointsToRedeem: number) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  grandTotal,
  customer,
  onConfirmPayment,
  onClose,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  // Cash State
  const [tenderedAmount, setTenderedAmount] = useState<number>(grandTotal);

  // UPI State
  const [upiRef, setUpiRef] = useState<string>(`UPI/${Date.now().toString().slice(-6)}`);
  const [upiVerified, setUpiVerified] = useState<boolean>(true);

  // Card State
  const [cardLast4, setCardLast4] = useState<string>('4089');

  // Split State
  const [splitCash, setSplitCash] = useState<number>(Math.floor(grandTotal / 2));
  const [splitUpi, setSplitUpi] = useState<number>(grandTotal - Math.floor(grandTotal / 2));
  const [splitCard, setSplitCard] = useState<number>(0);

  // Loyalty Redemption
  const maxRedeemablePoints = customer ? Math.min(customer.loyaltyPoints, Math.floor(grandTotal * 0.5)) : 0;
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  const effectivePayable = Math.max(0, grandTotal - pointsToRedeem);
  const changeAmount = Math.max(0, tenderedAmount - effectivePayable);

  // Quick cash buttons
  const quickCashOptions = [
    effectivePayable,
    Math.ceil(effectivePayable / 50) * 50,
    Math.ceil(effectivePayable / 100) * 100,
    Math.ceil(effectivePayable / 500) * 500,
  ].filter((v, i, a) => v >= effectivePayable && a.indexOf(v) === i);

  const handleFinalize = () => {
    let details: PaymentDetails;

    if (method === 'CASH') {
      if (tenderedAmount < effectivePayable) {
        alert('Tendered cash cannot be less than payable amount!');
        return;
      }
      details = {
        method: 'CASH',
        cashAmount: effectivePayable,
        upiAmount: 0,
        cardAmount: 0,
        tenderedAmount,
        changeAmount,
      };
    } else if (method === 'UPI') {
      details = {
        method: 'UPI',
        cashAmount: 0,
        upiAmount: effectivePayable,
        cardAmount: 0,
        upiRef,
        tenderedAmount: effectivePayable,
        changeAmount: 0,
      };
    } else if (method === 'CARD') {
      details = {
        method: 'CARD',
        cashAmount: 0,
        upiAmount: 0,
        cardAmount: effectivePayable,
        cardLast4,
        tenderedAmount: effectivePayable,
        changeAmount: 0,
      };
    } else {
      // Split
      const sum = Number(splitCash) + Number(splitUpi) + Number(splitCard);
      if (Math.abs(sum - effectivePayable) > 0.05) {
        alert(`Split total (${formatCurrency(sum)}) must exactly equal payable (${formatCurrency(effectivePayable)})`);
        return;
      }
      details = {
        method: 'SPLIT',
        cashAmount: Number(splitCash),
        upiAmount: Number(splitUpi),
        cardAmount: Number(splitCard),
        upiRef: splitUpi > 0 ? upiRef : undefined,
        cardLast4: splitCard > 0 ? cardLast4 : undefined,
        tenderedAmount: effectivePayable,
        changeAmount: 0,
      };
    }

    onConfirmPayment(details, pointsToRedeem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Fast Settlement</span>
            <h2 className="text-lg font-bold">Collect Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Amount Callout */}
          <div className="bg-linear-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-blue-200 font-medium">Net Bill Amount</p>
              <div className="text-3xl font-extrabold tracking-tight mt-0.5">
                {formatCurrency(effectivePayable)}
              </div>
              {pointsToRedeem > 0 && (
                <p className="text-xs text-emerald-300 mt-1">
                  Includes loyalty discount of -{formatCurrency(pointsToRedeem)}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> GST Included
              </span>
            </div>
          </div>

          {/* Loyalty Points Section (if customer attached) */}
          {customer && maxRedeemablePoints > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {customer.name} has {customer.loyaltyPoints} Reward Points
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Redeem up to {maxRedeemablePoints} points (1 pt = ₹1 off)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={maxRedeemablePoints}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Math.min(maxRedeemablePoints, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-2.5 py-1.5 text-right font-bold text-sm border border-amber-300 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={() => setPointsToRedeem(pointsToRedeem === maxRedeemablePoints ? 0 : maxRedeemablePoints)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-amber-200 text-amber-900 rounded-lg hover:bg-amber-300"
                >
                  {pointsToRedeem === maxRedeemablePoints ? 'Clear' : 'Max'}
                </button>
              </div>
            </div>
          )}

          {/* Payment Method Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-semibold text-xs transition-all cursor-pointer ${
                  method === 'CASH'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Banknote className="w-6 h-6 mb-1 text-emerald-600" />
                Cash
              </button>

              <button
                type="button"
                onClick={() => setMethod('UPI')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-semibold text-xs transition-all cursor-pointer ${
                  method === 'UPI'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <QrCode className="w-6 h-6 mb-1 text-blue-600" />
                UPI / QR
              </button>

              <button
                type="button"
                onClick={() => setMethod('CARD')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-semibold text-xs transition-all cursor-pointer ${
                  method === 'CARD'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <CreditCard className="w-6 h-6 mb-1 text-purple-600" />
                Card POS
              </button>

              <button
                type="button"
                onClick={() => setMethod('SPLIT')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-semibold text-xs transition-all cursor-pointer ${
                  method === 'SPLIT'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Layers className="w-6 h-6 mb-1 text-amber-600" />
                Split Pay
              </button>
            </div>
          </div>

          {/* Mode Specific Inputs */}
          {method === 'CASH' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cash Tendered (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={tenderedAmount || ''}
                  onChange={(e) => setTenderedAmount(Number(e.target.value))}
                  className="w-full text-2xl font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickCashOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTenderedAmount(opt)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    ₹{opt}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-600">Change Due to Customer:</span>
                <span className={`text-xl font-extrabold ${changeAmount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {method === 'UPI' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6">
              {/* Dynamic QR Code Simulation */}
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs flex flex-col items-center">
                <div className="w-36 h-36 bg-slate-900 rounded-lg p-2 flex flex-col items-center justify-between text-white relative">
                  <div className="flex justify-between w-full">
                    <div className="w-8 h-8 border-4 border-white rounded-xs"></div>
                    <div className="w-8 h-8 border-4 border-white rounded-xs"></div>
                  </div>
                  <div className="text-center font-bold text-xs tracking-wider">
                    SCAN & PAY
                    <div className="text-emerald-400 text-sm mt-0.5">{formatCurrency(effectivePayable)}</div>
                  </div>
                  <div className="flex justify-between w-full">
                    <div className="w-8 h-8 border-4 border-white rounded-xs"></div>
                    <div className="w-4 h-4 bg-white rounded-xs"></div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium text-slate-500 mt-1.5">
                  urbanmart.ghansoli@icici
                </span>
              </div>

              {/* UPI Details Input */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UPI Reference Number / UTR
                  </label>
                  <input
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="e.g. UPI/261012/88210"
                    className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="upiVer"
                    checked={upiVerified}
                    onChange={(e) => setUpiVerified(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="upiVer" className="text-xs text-slate-700 font-medium">
                    Soundbox / Merchant app confirmed payment
                  </label>
                </div>
              </div>
            </div>
          )}

          {method === 'CARD' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="4089"
                    className="w-full text-base font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    EDC Machine Ref
                  </label>
                  <input
                    type="text"
                    defaultValue="POS-TID-9921"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Supports Visa, MasterCard, RuPay, Maestro and Contactless Tap-to-Pay.
              </p>
            </div>
          )}

          {method === 'SPLIT' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cash (₹)</label>
                  <input
                    type="number"
                    value={splitCash}
                    onChange={(e) => setSplitCash(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm font-semibold border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UPI (₹)</label>
                  <input
                    type="number"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm font-semibold border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Card (₹)</label>
                  <input
                    type="number"
                    value={splitCard}
                    onChange={(e) => setSplitCard(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm font-semibold border rounded-lg bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs font-medium pt-1">
                <span>Split Total: {formatCurrency(Number(splitCash) + Number(splitUpi) + Number(splitCard))}</span>
                <span>Required: {formatCurrency(effectivePayable)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
          >
            Cancel / Back to Cart
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Complete Sale & Print</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
