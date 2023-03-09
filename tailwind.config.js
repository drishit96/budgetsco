module.exports = {
  mode: "jit",
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "CHART-COLOR-1": "#C12552",
        "CHART-COLOR-2": "#FF6600",
        "CHART-COLOR-3": "#F5C700",
        "CHART-COLOR-4": "#6A961F",
        "CHART-COLOR-5": "#008E8E",
        "CHART-COLOR-6": "#CC64DD",
        "CHART-COLOR-7": "#800080",
        "CHART-COLOR-8": "#4B0082",
        "CHART-COLOR-9": "#B36435",
        "INVESTMENT-COLOR-1": "#0C4A6E",
        "INVESTMENT-COLOR-2": "#075985",
        "INVESTMENT-COLOR-3": "#0369A1",
        "INVESTMENT-COLOR-4": "#0891B2",
        "INVESTMENT-COLOR-5": "#06B6D4",
        "INVESTMENT-COLOR-6": "#22D3EE",
        "INVESTMENT-COLOR-7": "#67E8F9",
        "INVESTMENT-COLOR-8": "#A5F3FC",
        "INVESTMENT-COLOR-9": "#CFFAFE",
        "INVESTMENT-COLOR-10": "#F0FDFA",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class", // only generate classes
    }),
  ],
};
