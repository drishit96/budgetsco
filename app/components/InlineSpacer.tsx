function getPadding(size: number) {
  if (size === 1) return "p-1";
  if (size === 2) return "p-2";
  if (size === 3) return "p-3";
  if (size === 4) return "p-4";
  if (size === 5) return "p-5";
  return "p-0";
}

export function InlineSpacer({ size = 2 }: { size?: number }) {
  return <span className={getPadding(size)}></span>;
}
