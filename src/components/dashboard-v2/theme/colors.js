/**
 * Material 3 Color System Definition
 */

export const lightTheme = {
  primary: '#0061A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D1E4FF',
  onPrimaryContainer: '#001D36',

  secondary: '#535F70',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D7E3F7',
  onSecondaryContainer: '#101C2B',

  tertiary: '#6B5778',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F2DAFF',
  onTertiaryContainer: '#251431',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  background: '#FDFCFF',
  onBackground: '#1A1C1E',

  surface: '#FDFCFF',
  onSurface: '#1A1C1E',
  surfaceVariant: '#DFE2EB',
  onSurfaceVariant: '#43474E',

  outline: '#73777F',
  outlineVariant: '#C3C7CF',

  scrim: '#000000',
  shadow: '#000000',

  inverseSurface: '#2F3033',
  inverseOnSurface: '#F1F0F4',
  inversePrimary: '#9ECAFF',

  surfaceDim: '#D9D9E0',
  surfaceBright: '#F9F9FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F3FA',
  surfaceContainer: '#EDEDF4',
  surfaceContainerHigh: '#E7E8EE',
  surfaceContainerHighest: '#E2E2E9',
};

export const darkTheme = {
  primary: '#9ECAFF',
  onPrimary: '#003258',
  primaryContainer: '#00497D',
  onPrimaryContainer: '#D1E4FF',

  secondary: '#BBC7DB',
  onSecondary: '#253140',
  secondaryContainer: '#3B4858',
  onSecondaryContainer: '#D7E3F7',

  tertiary: '#D6BEE4',
  onTertiary: '#3B2948',
  tertiaryContainer: '#523F5F',
  onTertiaryContainer: '#F2DAFF',

  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  background: '#1A1C1E',
  onBackground: '#E2E2E6',

  surface: '#1A1C1E',
  onSurface: '#E2E2E6',
  surfaceVariant: '#43474E',
  onSurfaceVariant: '#C3C7CF',

  outline: '#8D9199',
  outlineVariant: '#43474E',

  scrim: '#000000',
  shadow: '#000000',

  inverseSurface: '#E2E2E6',
  inverseOnSurface: '#2F3033',
  inversePrimary: '#0061A4',

  surfaceDim: '#111315',
  surfaceBright: '#37393E',
  surfaceContainerLowest: '#0C0E11',
  surfaceContainerLow: '#1A1C1E',
  surfaceContainer: '#1E2022',
  surfaceContainerHigh: '#282A2D',
  surfaceContainerHighest: '#333538',
};

export const getColor = (role, isDark = false) => {
  const theme = isDark ? darkTheme : lightTheme;
  return theme[role] || '#000000';
};

export const fileTypeColors = {
  folder: '#FFB74D', // Orange
  image: '#E57373', // Red
  video: '#F06292', // Pink
  audio: '#BA68C8', // Purple
  document: '#64B5F6', // Blue
  archive: '#90A4AE', // Blue Grey
  code: '#81C784', // Green
  unknown: '#E0E0E0', // Grey
};

export default {
  lightTheme,
  darkTheme,
  getColor,
  fileTypeColors
};
