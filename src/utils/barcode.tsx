import React from 'react';

// Generates an SVG barcode visual representation
export function generateBarcodePattern(code: string): number[] {
  // Deterministic pseudo-barcode stripe pattern based on string characters
  const pattern: number[] = [2, 1, 1, 2]; // Start guard
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) % 10007;
    const charCode = code.charCodeAt(i);
    const w1 = ((charCode + i) % 3) + 1;
    const s1 = ((charCode * 2 + i) % 2) + 1;
    const w2 = ((charCode * 3 + hash) % 3) + 1;
    const s2 = ((charCode + 4) % 2) + 1;
    pattern.push(w1, s1, w2, s2);
  }
  pattern.push(2, 1, 1, 2, 1); // Stop guard
  return pattern;
}

interface BarcodeSVGProps {
  value: string;
  height?: number;
  width?: number | string;
  showText?: boolean;
  className?: string;
}

export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  value,
  height = 42,
  width = '100%',
  showText = true,
  className = '',
}) => {
  const pattern = generateBarcodePattern(value || '000000000000');
  let currentX = 10;
  const bars: { x: number; width: number }[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const barWidth = pattern[i];
    if (i % 2 === 0) {
      bars.push({ x: currentX, width: barWidth });
    }
    currentX += barWidth;
  }
  const totalWidth = currentX + 10;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={2}
            width={bar.width}
            height={height - (showText ? 14 : 4)}
            fill="#0f172a"
          />
        ))}
      </svg>
      {showText && (
        <span className="text-[11px] font-mono tracking-widest text-slate-700 mt-0.5 font-semibold">
          {value}
        </span>
      )}
    </div>
  );
};
