import React from 'react';
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { GRN, StoreSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { BarcodeSVG } from '../../utils/barcode';

interface GRNReceiptSlipProps {
  grn: GRN;
  settings: StoreSettings;
  onClose: () => void;
}

export const GRNReceiptSlip: React.FC<GRNReceiptSlipProps> = ({ grn, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const totalOrdered = grn.items.reduce((s, i) => s + Number(i.orderedQty), 0);
  const totalReceived = grn.items.reduce((s, i) => s + Number(i.receivedQty), 0);
  const totalDamaged = grn.items.reduce((s, i) => s + Number(i.damagedQty), 0);
  const netInward = totalReceived - totalDamaged;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Goods Receipt Note (GRN) Voucher</h3>
              <p className="text-[11px] text-slate-400">Document #{grn.grnNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print GRN Voucher
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Document */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className="bg-white p-8 rounded-xl shadow-md border border-slate-300 w-full max-w-2xl text-slate-900 font-sans"
          >
            {/* Store & Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase text-blue-950">
                  {settings.storeName}
                </h1>
                <p className="text-xs font-bold text-slate-700">{settings.branchName}</p>
                <p className="text-xs text-slate-600 max-w-sm mt-0.5">{settings.address}</p>
                <p className="text-xs text-slate-600">GSTIN: {settings.gstin}</p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-sm rounded">
                  GOODS RECEIPT NOTE
                </span>
                <p className="font-mono font-bold text-sm mt-1 text-slate-900">{grn.grnNumber}</p>
                <p className="text-xs text-slate-500 mt-0.5">Date: {formatDateTime(grn.receivedDate)}</p>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      grn.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    STATUS: {grn.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Inward Details Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-500 uppercase block text-[10px]">Supplier Details</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{grn.supplierName}</p>
                <p className="text-slate-600 mt-1">Invoice Ref: <strong className="font-mono text-slate-900">{grn.invoiceNumber}</strong></p>
                <p className="text-slate-600">Invoice Date: {grn.invoiceDate}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-500 uppercase block text-[10px]">Receiving Counter</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{grn.counterName}</p>
                <p className="text-slate-600 mt-1">Receiving Officer: {grn.createdByName}</p>
                {grn.confirmedBy && (
                  <p className="text-emerald-700 font-semibold mt-0.5">
                    Confirmed by: {grn.confirmedBy} ({formatDateTime(grn.confirmedAt)})
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700 font-bold">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Product & Barcode</th>
                    <th className="py-2 px-2">Batch / Expiry</th>
                    <th className="py-2 px-2 text-center">Inv Qty</th>
                    <th className="py-2 px-2 text-center">Recv Qty</th>
                    <th className="py-2 px-2 text-center text-rose-600">Damage</th>
                    <th className="py-2 px-2 text-right">Cost (₹)</th>
                    <th className="py-2 px-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grn.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.barcode}</p>
                        {item.notes && <p className="text-[10px] text-rose-600 italic">{item.notes}</p>}
                      </td>
                      <td className="py-2 px-2 font-mono text-[11px]">
                        <div>{item.batchNumber || '-'}</div>
                        <div className="text-slate-500 text-[10px]">Exp: {item.expiryDate || '-'}</div>
                      </td>
                      <td className="py-2 px-2 text-center font-medium">{item.orderedQty}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">{item.receivedQty}</td>
                      <td className="py-2 px-2 text-center font-bold text-rose-600">{item.damagedQty || 0}</td>
                      <td className="py-2 px-2 text-right font-mono">₹{item.purchaseRate.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-bold font-mono">₹{item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="border-t-2 border-slate-300 pt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 text-slate-600">
                <p>Total Invoice Quantity: <strong className="text-slate-900">{totalOrdered} pcs</strong></p>
                <p>Physical Received: <strong className="text-slate-900">{totalReceived} pcs</strong></p>
                <p className="text-rose-600">Damaged / Rejected: <strong>{totalDamaged} pcs</strong></p>
                <p className="text-emerald-700 font-bold">Net Stock Added to Inventory: {netInward} pcs</p>
                {grn.remarks && <p className="mt-2 text-slate-700 italic">Remarks: {grn.remarks}</p>}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-right font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Sub Total:</span>
                  <span>₹{grn.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Tax Total:</span>
                  <span>₹{grn.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Round Off:</span>
                  <span>₹{grn.roundOff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-300">
                  <span>Grand Total (Inward Value):</span>
                  <span>{formatCurrency(grn.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Signatures & Barcode */}
            <div className="mt-8 pt-6 border-t border-dashed border-slate-300 flex items-end justify-between">
              <div className="text-center w-40">
                <div className="border-b border-slate-400 pb-8"></div>
                <p className="text-[10px] font-semibold text-slate-600 mt-1 uppercase">
                  Depot Receiver Sign
                </p>
              </div>

              <div className="text-center">
                <BarcodeSVG value={grn.grnNumber} height={36} />
              </div>

              <div className="text-center w-40">
                <div className="border-b border-slate-400 pb-8"></div>
                <p className="text-[10px] font-semibold text-slate-600 mt-1 uppercase">
                  Store Manager Approval
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
