// Opening a customer from a staff screen: the same password rules as the backend's
// PasswordPolicy, said in French before the form is sent. Tested in tests/workspace-ux.test.mjs.

export function passwordProblem(password: string, email: string): string | null {
  if (!password.trim()) return "Choisissez un mot de passe temporaire.";
  if ([...password].length < 12) return "Au moins 12 caractères.";
  if (new TextEncoder().encode(password).length > 72) return "72 octets au maximum.";
  if (new Set(password).size === 1) return "Pas un seul caractère répété.";
  const name = email.split("@")[0].toLowerCase();
  if (name.length >= 3 && password.toLowerCase().includes(name)) return "Ne doit pas contenir le début de l’adresse e-mail.";
  return null;
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ", LOWER = "abcdefghijkmnopqrstuvwxyz", DIGITS = "23456789", SYMBOLS = "-!#%+";

// Easy to read aloud at the desk (no 0/O or 1/l), 14 characters, every kind of character.
// `random(n)` returns an unsigned integer; the page passes crypto.getRandomValues.
export function generatePassword(random: (n: number) => number): string {
  const pick = (set: string, n: number) => set[random(n) % set.length];
  const chars = [pick(UPPER, 0), pick(LOWER, 1), pick(DIGITS, 2), pick(SYMBOLS, 3)];
  const all = UPPER + LOWER + DIGITS;
  for (let i = 4; i < 14; i++) chars.push(pick(all, i));
  // A fixed rotation keeps the required characters but not always at the start.
  const shift = random(14) % chars.length;
  return [...chars.slice(shift), ...chars.slice(0, shift)].join("");
}
