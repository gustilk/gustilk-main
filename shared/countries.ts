export const PINNED_COUNTRY_ISOS = ["IQ", "DE", "SE", "AM", "RU", "TR", "GE"];

export const COUNTRY_LIST: { iso: string; name: string; dial: string; flag: string }[] = [
  { iso: "IQ", name: "Iraq", dial: "+964", flag: "🇮🇶" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { iso: "AM", name: "Armenia", dial: "+374", flag: "🇦🇲" },
  { iso: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { iso: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { iso: "GE", name: "Georgia", dial: "+995", flag: "🇬🇪" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "NL", name: "Holland", dial: "+31", flag: "🇳🇱" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
];

export const VALID_DIAL_CODES: Set<string> = new Set(COUNTRY_LIST.map(c => c.dial));

export function isValidListedPhone(phone: string): boolean {
  const normalized = phone.replace(/\s+/g, "");
  if (!normalized.startsWith("+")) return false;
  return COUNTRY_LIST.some(c => normalized.startsWith(c.dial));
}
