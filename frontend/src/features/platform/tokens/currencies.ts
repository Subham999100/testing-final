// ============================================================
// Clyptus Job Portal - World Currencies Definition & Utilities
// Contains world currencies and currency formatting helpers.
// ============================================================

export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
}

export const WORLD_CURRENCIES: CurrencyItem[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
];

export function getCurrencyInfo(code?: string): CurrencyItem {
  if (!code) return { code: 'USD', name: 'US Dollar', symbol: '$' };
  const found = WORLD_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return (
    found || {
      code: code.toUpperCase(),
      name: code.toUpperCase(),
      symbol: code.toUpperCase(),
    }
  );
}

export function formatPlanPrice(priceCents: number, currencyCode?: string): string {
  const currency = getCurrencyInfo(currencyCode);
  const amount = (priceCents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currency.symbol} ${amount} (${currency.code})`;
}
