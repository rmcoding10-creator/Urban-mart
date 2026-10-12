import React, { useState } from 'react';
import { X, Printer, Check, Copy } from 'lucide-react';
import { SaleInvoice, StoreSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { BarcodeSVG } from '../../utils/barcode';

interface ThermalReceiptModalProps {
  invoice: SaleInvoice;
  settings: StoreSettings;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(settings.printerPaperWidth || '80mm');
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBillNo = () => {
    navigator.clipboard.writeText(invoice.billNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalQty = invoice.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-sm">Thermal Receipt Preview</h3>
              <p className="text-[11px] text-slate-400">Bill #{invoice.billNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  paperWidth === '80mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm Standard
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  paperWidth === '58mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm Compact
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className={`bg-white shadow-md border border-slate-300 p-4 font-mono-receipt text-slate-900 transition-all ${
              paperWidth === '80mm' ? 'w-[360px] text-xs' : 'w-[280px] text-[11px]'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h2 className="text-base font-bold tracking-tight uppercase">{settings.storeName}</h2>
              <p className="text-[11px] font-semibold text-slate-700">{settings.branchName}</p>
              <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Ph: {settings.phone}</p>
              <div className="mt-1 text-[10px] flex justify-center gap-2 text-slate-700">
                <span>GSTIN: {settings.gstin}</span>
              </div>
              <p className="text-[10px] text-slate-700">FSSAI: {settings.fssai}</p>
              <div className="mt-1.5 py-0.5 border-y border-dashed border-slate-300 font-bold uppercase tracking-wider text-[11px]">
                TAX INVOICE / RETAIL BILL
              </div>
            </div>

            {/* Bill Meta */}
            <div className="py-2 text-[11px] border-b border-dashed border-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Bill No: <strong className="font-bold">{invoice.billNumber}</strong></span>
                <span>{invoice.counterNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date: {formatDateTime(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cashier: {invoice.cashierName}</span>
                <span>Items: {invoice.items.length} (Qty: {totalQty})</span>
              </div>
              {invoice.customerName && invoice.customerName !== 'Walk-in Customer' && (
                <div className="pt-1 mt-1 border-t border-dotted border-slate-200">
                  <span className="font-semibold">Cust: {invoice.customerName}</span>
                  {invoice.customerPhone && <span className="ml-2 text-slate-600">({invoice.customerPhone})</span>}
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <div className="grid grid-cols-12 text-[10px] font-bold pb-1 border-b border-slate-300">
                <span className="col-span-6">ITEM</span>
                <span className="col-span-2 text-center">QTY</span>
                <span className="col-span-2 text-right">RATE</span>
                <span className="col-span-2 text-right">AMT</span>
              </div>
              <div className="divide-y divide-dotted divide-slate-200 pt-1">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="py-1 text-[10.5px]">
                    <div className="font-semibold text-slate-900 leading-snug">
                      {idx + 1}. {item.productName}
                    </div>
                    <div className="grid grid-cols-12 text-[10px] text-slate-600 mt-0.5">
                      <span className="col-span-6 text-[9.5px]">
                        HSN:{item.hsnCode || '2106'} • GST:{item.taxRate}%
                      </span>
                      <span className="col-span-2 text-center font-medium">{item.quantity}</span>
                      <span className="col-span-2 text-right">₹{item.unitPrice.toFixed(2)}</span>
                      <span className="col-span-2 text-right font-bold text-slate-900">
                        ₹{item.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GST Summary & Totals */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal (Items):</span>
                <span>₹{invoice.subTotal.toFixed(2)}</span>
              </div>
              {invoice.billDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Bill Discount:</span>
                  <span>-₹{invoice.billDiscount.toFixed(2)}</span>
                </div>
              )}
              {invoice.cgstTotal > 0 && (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>CGST Total:</span>
                  <span>₹{invoice.cgstTotal.toFixed(2)}</span>
                </div>
              )}
              {invoice.sgstTotal > 0 && (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>SGST Total:</span>
                  <span>₹{invoice.sgstTotal.toFixed(2)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Round Off:</span>
                  <span>₹{invoice.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-1 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
                <span>NET PAYABLE:</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10.5px] space-y-0.5">
              <div className="flex justify-between font-semibold">
                <span>PAYMENT MODE:</span>
                <span className="uppercase text-blue-700">{invoice.paymentDetails.method}</span>
              </div>
              {invoice.paymentDetails.method === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Cash Tendered:</span>
                    <span>₹{invoice.paymentDetails.tenderedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Change Returned:</span>
                    <span>₹{invoice.paymentDetails.changeAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
              {invoice.paymentDetails.upiRef && (
                <div className="flex justify-between text-slate-600">
                  <span>UPI Ref No:</span>
                  <span>{invoice.paymentDetails.upiRef}</span>
                </div>
              )}
              {invoice.paymentDetails.cardLast4 && (
                <div className="flex justify-between text-slate-600">
                  <span>Card Auth (Last 4):</span>
                  <span>**** {invoice.paymentDetails.cardLast4}</span>
                </div>
              )}
            </div>

            {/* Total Savings Highlight Banner */}
            {invoice.totalSavings > 0 && (
              <div className="my-2 p-1.5 bg-emerald-50 border border-emerald-300 rounded text-center text-emerald-800 text-[11px] font-bold">
                🎉 YOU SAVED ₹{invoice.totalSavings.toFixed(2)} ON TODAY'S PURCHASE!
              </div>
            )}

            {/* Loyalty points info */}
            {invoice.loyaltyPointsEarned > 0 && (
              <div className="text-center text-[10px] text-slate-600 mb-2">
                Urban Mart Points Earned: <strong>+{invoice.loyaltyPointsEarned} pts</strong>
              </div>
            )}

            {/* Footer Barcode */}
            <div className="pt-2 text-center">
              <BarcodeSVG value={invoice.billNumber} height={36} showText={true} />
              <p className="mt-2 text-[10px] text-slate-600 font-medium">{settings.receiptFooter}</p>
              <p className="mt-0.5 text-[9px] text-slate-400">--- PLEASE PRESERVE BILL FOR EXCHANGE ---</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyBillNo}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Bill No' : 'Copy Bill No'}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Done / Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Thermal Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
