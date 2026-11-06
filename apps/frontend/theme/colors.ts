export const colors = {
  // Brand
  navy: '#14243A',
  blue: '#2563EB',
  deepBlue: '#173B72',

  // Surfaces
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3F8',

  // Text
  text: '#172033',
  textSecondary: '#687589',
  textInverse: '#FFFFFF',
  textInverseSecondary: '#B8C4D6',

  // Borders
  border: '#E5EAF1',
  borderDark: '#C9D2E0',

  // Status
  success: '#16865B',
  successBg: '#E6F4EE',
  warning: '#D99123',
  warningBg: '#FBF1E0',
  danger: '#D94B50',
  dangerBg: '#FCE8E9',
  info: '#3283CF',
  infoBg: '#E5F0FA',

  // Chart palette
  chart: {
    primary: '#2563EB',
    secondary: '#3283CF',
    success: '#16865B',
    warning: '#D99123',
    danger: '#D94B50',
    purple: '#7C5CFC',
    teal: '#1B9E8E',
    navy: '#14243A',
  },
} as const;

export type ColorName = keyof typeof colors;
