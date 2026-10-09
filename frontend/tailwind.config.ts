/** Shared colors resolve to the active Clyptus CSS design tokens. */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: { sm: '641px', md: '981px', lg: '1200px', xl: '1440px' },
    extend: {
      fontFamily: { sans: ['var(--font-sans)'], serif: ['var(--font-heading)'], mono: ['var(--font-mono)'] },
      borderRadius: { lg: '16px', xl: '16px', '2xl': '16px' },
      colors: {
        canvas: 'var(--color-background)', surface: 'var(--color-surface)',
        soft: 'var(--color-surface-alt)', strong: 'var(--color-surface-strong)',
        ink: 'var(--color-text)', muted: 'var(--color-text-secondary)',
        line: 'var(--color-border)', 'line-strong': 'var(--color-border-strong)',
        brand: 'var(--color-primary)', 'brand-hover': 'var(--color-primary-hover)',
        'brand-soft': 'var(--color-accent-soft)', action: 'var(--color-action)',
        'action-hover': 'var(--color-action-hover)', 'on-action': 'var(--color-on-action)',
        success: 'var(--color-success)', 'success-soft': 'var(--color-success-soft)',
        danger: 'var(--color-error)', 'danger-soft': 'var(--color-error-soft)',
        warning: 'var(--color-warning)', 'warning-soft': 'var(--color-warning-soft)',
        overlay: 'var(--color-overlay)',
      },
    },
  },
  plugins: [],
};
