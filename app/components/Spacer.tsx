function getPadding(size: number) {
  if (size === 0.5) return "p-0.5";
  if (size === 1) return "p-1";
  if (size === 2) return "p-2";
  if (size === 3) return "p-3";
  if (size === 4) return "p-4";
  if (size === 5) return "p-5";
  if (size === 6) return "p-6";
  if (size === 7) return "p-7";
  if (size === 8) return "p-8";
  if (size === 9) return "p-9";
  if (size === 10) return "p-10";
  return "p-0";
}

export function Spacer({ size = 2 }: { size?: number }) {
  return <div className={getPadding(size)}></div>;
}
