export const theme = {
  colors: {
    cream: "#FDF6E3",
    parchment: "#EEE8D5",
    forest: "#073642",
    coffeeSolid: "#3E2B1F",
    coffee: "rgba(62, 43, 31, 0.86)",
    coffeeLight: "rgba(62, 43, 31, 0.28)",
    ink: "rgba(17, 17, 17, 0.82)",
    ash: "#555555",
    coffeeAccent: "#C4A88A",
    white: "#FFFFFF",
  },

  background: {
    page: "#FDF6E3",
    surface: "#EEE8D5",
    card: "#FFFFFF",
    quote: "rgba(62, 43, 31, 0.28)",
    dark: "#3E2B1F",
  },

  text: {
    primary: "rgba(17, 17, 17, 0.82)",
    secondary: "#555555",
    heading: "#073642",
    inverse: "#FFFFFF",
  },

  border: {
    light: "#EEE8D5",
    normal: "#C4A88A",
    dark: "#3E2B1F",
  },

  button: {
    primary: {
      bg: "#073642",
      text: "#FDF6E3",
      hoverBg: "#3E2B1F",
      activeBg: "#3E2B1F",
      focus: "0 0 0 3px rgba(196, 168, 138, 0.3)",
    },

    secondary: {
      bg: "#EEE8D5",
      text: "#073642",
      border: "#C4A88A",
      hoverBg: "#C4A88A",
      activeBg: "#C4A88A",
      focus: "0 0 0 3px rgba(7, 54, 66, 0.2)",
    },
  },

  link: {
    color: "#073642",
    hover: "#3E2B1F",
  },

  spacing: {
    sm: "8px",
    md: "16px",
    lg: "24px",
  },

  radius: {
    sm: "6px",
    md: "12px",
    lg: "20px",
  },

  transition: {
    fast: "150ms ease",
    normal: "200ms ease",
  },
} as const;