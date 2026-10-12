import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { BarcodeSVG } from '../../utils/barcode';

interface BarcodePrintModalProps {
  product: Product;
  settings: StoreSettings;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  product,
  settings,
  onClose,
}) => {
  const [labelCount, setLabelCount] = useState<number>(6);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Shelf Barcode Labels</h3>
              <p className="text-[11px] text-slate-400">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase">
              Number of Labels to Print:
            </label>
            <div className="flex gap-2">
              {[2, 4, 6, 12].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLabelCount(num)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    labelCount === num
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {num} Labels
                </button>
              ))}
            </div>
          </div>

          {/* Printable Labels Sheet */}
          <div
            id="printable-receipt"
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-80 overflow-y-auto grid grid-cols-2 gap-3"
          >
            {Array.from({ length: labelCount }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-3 border border-slate-300 rounded-lg shadow-2xs flex flex-col items-center text-center text-slate-900"
              >
                <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">
                  {settings.storeName}
                </span>
                <p className="text-xs font-bold leading-tight mt-0.5 line-clamp-1">{product.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {product.packSize || product.brand} • HSN:{product.hsnCode}
                </p>

                <div className="my-1 w-full flex justify-center">
                  <BarcodeSVG value={product.barcode} height={34} width={150} showText={true} />
                </div>

                <div className="flex items-baseline justify-center gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-900">
                    OUR PRICE: {formatCurrency(product.sellingPrice)}
                  </span>
                  {product.mrp > product.sellingPrice && (
                    <span className="text-[10px] text-slate-400 line-through">
                      MRP ₹{product.mrp}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  Batch: {product.batchNumber || 'B-01'} | (Incl. of all taxes)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Label Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
