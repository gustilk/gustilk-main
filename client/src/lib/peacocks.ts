// All 26 Tawûsî Melek peacock logos
export const PEACOCK_LOGOS: string[] = Array.from(
  { length: 26 },
  (_, i) => `/peacocks/peacock-${String(i + 1).padStart(2, "0")}.jpg`
);

/** One random logo chosen at module-load time — stays the same for the whole session */
export const SESSION_LOGO: string =
  PEACOCK_LOGOS[Math.floor(Math.random() * PEACOCK_LOGOS.length)];

/** Returns a logo seeded by today's date — same for all users, changes daily */
export function getDailyLogo(): string {
  const d = new Date();
  const seed =
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return PEACOCK_LOGOS[seed % PEACOCK_LOGOS.length];
}
