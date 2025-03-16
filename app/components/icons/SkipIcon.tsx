export default function SkipIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 5V19L12 12L4 5ZM13 19V5L21 12L13 19Z"
        fill={color}
      />
    </svg>
  );
} 