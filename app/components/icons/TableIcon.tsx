const TableIcon = ({ size = 100, color = "var(--text-color-primary)" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
  </svg>
);
export default TableIcon;
