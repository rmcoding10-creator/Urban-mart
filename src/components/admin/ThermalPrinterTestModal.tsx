import React, { useState } from 'react';
import { X, Printer, CheckCircle, Sliders, RefreshCw, AlertCircle } from 'lucide-react';
import { StoreSettings } from '../../types';
import { BarcodeSVG } from '../../utils/barcode';

interface ThermalPrinterTestModalProps {
  settings: StoreSettings;
  onClose: () => void;
}

export const ThermalPrinterTestModal: React.FC<ThermalPrinterTestModalProps> = ({
  settings,
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(settings.printerPaperWidth || '80mm');
  const [testPrintSuccess, setTestPrintSuccess] = useState(false);

  const handleTestPrint = () => {
    window.print();
    setTestPrintSuccess(true);
    setTimeout(() => setTestPrintSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">POS Thermal Printer Hardware Test</h3>
              <p className="text-[11px] text-slate-400">ESC/POS 80mm / 58mm Alignment Test</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Roll Width:</span>
            <div className="flex bg-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  paperWidth === '80mm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                80mm (Standard)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  paperWidth === '58mm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                58mm (Compact)
              </button>
            </div>
          </div>

          {testPrintSuccess && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" /> Sent to Spooler
            </span>
          )}
        </div>

        {/* Printable Alignment Slip */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className={`bg-white shadow-md border border-slate-300 p-4 font-mono-receipt text-slate-900 transition-all ${
              paperWidth === '80mm' ? 'w-[360px] text-xs' : 'w-[280px] text-[11px]'
            }`}
          >
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h2 className="text-base font-black tracking-tight uppercase">{settings.storeName}</h2>
              <p className="text-[10px] font-bold text-slate-700">{settings.branchName}</p>
              <p className="text-[10px] text-slate-600">{settings.address}</p>
              <div className="mt-2 py-1 bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                *** HARDWARE TEST SLIP ***
              </div>
            </div>

            <div className="py-2 text-[10px] border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{new Date().toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Driver Emulation:</span>
                <span>ESC/POS Standard (Direct RAW)</span>
              </div>
              <div className="flex justify-between">
                <span>Selected Width:</span>
                <span className="font-bold">{paperWidth}</span>
              </div>
              <div className="flex justify-between">
                <span>Cutter Test:</span>
                <span>Auto-Cut Enabled (GS V 66 0)</span>
              </div>
            </div>

            {/* Character & Alignment Grid Test */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1">
              <p className="font-bold text-center">LINE ALIGNMENT & DENSITY TEST</p>
              <div className="text-center text-[9px] text-slate-600 font-mono">
                123456789012345678901234567890123456789012
              </div>
              <div className="border border-slate-400 p-1 text-center font-bold">
                [ LEFT ] ----- [ CENTER ] ----- [ RIGHT ]
              </div>
              <p className="text-center text-[9px] text-slate-500">
                Condensed Font • Normal Font • Bold Font • Inverted
              </p>
            </div>

            {/* Barcode Laser Scan Verification */}
            <div className="py-3 text-center border-b border-dashed border-slate-400">
              <p className="text-[10px] font-bold mb-1">SCANNER COMPATIBILITY TEST</p>
              <BarcodeSVG value="8901262010051" height={36} showText={true} />
              <p className="text-[9px] text-slate-500 mt-1">
                Scan with USB laser scanner to verify optical readability
              </p>
            </div>

            <div className="pt-2 text-center text-[10px] text-slate-600">
              <p className="font-bold">URBAN MART GHANSOLI POS</p>
              <p className="text-[9px] text-slate-400">--- END OF TEST PRINT ---</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleTestPrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Hardware Test Slip
          </button>
        </div>
      </div>
    </div>
  );
};
