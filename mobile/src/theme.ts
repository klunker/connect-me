import { ViewStyle } from "react-native";

export const colors = {
  // Backgrounds
  bgTop: "#e9f0f9",
  bgBottom: "#f8fbfe",
  card: "#ffffff",
  cardSoft: "#f6f9fd",
  cardTint: "#eef5fd",
  border: "#e8eef6",
  borderStrong: "#dae4f0",

  // Typography
  text: "#0b1b33",
  textMuted: "#5b6b81",
  textSubtle: "#93a3b8",
  textInverse: "#ffffff",

  // Brand / accent (blue family)
  primary: "#0284c7",
  primarySoft: "#e0f2fe",
  primarySoftBorder: "#bae6fd",
  accent: "#0ea5e9",
  accentDeep: "#0369a1",

  // Deep navy - premium primary actions
  navy: "#0a1f3c",
  navySoft: "#12325f",

  // Status
  success: "#1d4ed8",
  successSoft: "#dbeafe",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
  dangerBorder: "#fecaca",
  warn: "#b45309",
  warnSoft: "#fef3c7",
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 9999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0b1b33",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 6,
  } as ViewStyle,
  soft: {
    shadowColor: "#0b1b33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  } as ViewStyle,
  button: {
    shadowColor: "#0a1f3c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
  } as ViewStyle,
  glow: {
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 7,
  } as ViewStyle,
};

export const gradients = {
  screen: ["#e9f0f9", "#f8fbfe"],
  card: ["#f3f9ff", "#ffffff"],
  navy: ["#0a1f3c", "#12325f"],
  accent: ["#0284c7", "#38bdf8"],
  avatar: ["#0a1f3c", "#134074"],
} as const;
