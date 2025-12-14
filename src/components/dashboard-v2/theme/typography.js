/**
 * Material 3 Typography System
 */

const fontFamily = {
  sans: '"Roboto", "Helvetica", "Arial", sans-serif',
  serif: '"Merriweather", "Georgia", serif',
  mono: '"Roboto Mono", "Courier New", monospace',
};

const fontWeights = {
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
};

export const typography = {
  displayLarge: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '57px',
    lineHeight: '64px',
    letterSpacing: '-0.25px',
  },
  displayMedium: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '45px',
    lineHeight: '52px',
    letterSpacing: '0px',
  },
  displaySmall: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '36px',
    lineHeight: '44px',
    letterSpacing: '0px',
  },
  headlineLarge: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '32px',
    lineHeight: '40px',
    letterSpacing: '0px',
  },
  headlineMedium: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '28px',
    lineHeight: '36px',
    letterSpacing: '0px',
  },
  headlineSmall: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '24px',
    lineHeight: '32px',
    letterSpacing: '0px',
  },
  titleLarge: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '22px',
    lineHeight: '28px',
    letterSpacing: '0px',
  },
  titleMedium: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.medium,
    fontSize: '16px',
    lineHeight: '24px',
    letterSpacing: '0.15px',
  },
  titleSmall: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.medium,
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
  },
  labelLarge: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.medium,
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
  },
  labelMedium: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.medium,
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.5px',
  },
  labelSmall: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.medium,
    fontSize: '11px',
    lineHeight: '16px',
    letterSpacing: '0.5px',
  },
  bodyLarge: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '16px',
    lineHeight: '24px',
    letterSpacing: '0.5px',
  },
  bodyMedium: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.25px',
  },
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeights.regular,
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.4px',
  },
};

export const getTypography = (variant) => {
  return typography[variant] || typography.bodyMedium;
};

export default {
  typography,
  fontFamily,
  fontWeights,
  getTypography,
};
