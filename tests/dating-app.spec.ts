/**
 * Gustilk API Test Suite
 * Runs against the live app using Node.js fetch — no browser required.
 * Run with: node tests/dating-app.spec.ts
 */

const BASE = "https://be6c5bf2-ab0c-4248-b07c-b6a3778d7fd2-00-m2hrds0gejge.janeway.replit.dev";

let passed = 0;
let failed = 0;
const results: { name: string; ok: boolean; detail?: string }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    passed++;
  } catch (err: any) {
    results.push({ name, ok: false, detail: err.message });
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function api(
  method: string,
  path: string,
  body?: object,
  cookieJar?: string[]
): Promise<{ status: number; body: any; headers: Headers }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookieJar?.length) headers["Cookie"] = cookieJar.join("; ");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json, headers: res.headers };
}

function extractCookies(headers: Headers): string[] {
  const raw = headers.getSetCookie?.() ?? [];
  return raw.map((c: string) => c.split(";")[0]);
}

const testEmail = `pw-test-${Date.now()}@gustilk.test`;
const testPassword = "PlaywrightTest@999";
let sessionCookies: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Auth — error messages
// ─────────────────────────────────────────────────────────────────────────────

await test("Login: non-existent email returns correct message", async () => {
  const { status, body } = await api("POST", "/api/auth/login", {
    email: "ghost@nowhere.com",
    password: "Whatever123",
  });
  assert(status === 401, `Expected 401, got ${status}`);
  assert(
    body.message === "No account found with that email address.",
    `Got: "${body.message}"`
  );
});

await test("Login: wrong password returns correct message", async () => {
  const { status, body } = await api("POST", "/api/auth/login", {
    email: "claudia@gmail.com",
    password: "WrongPassword!999",
  });
  assert(status === 401, `Expected 401, got ${status}`);
  assert(
    body.message === "Incorrect password. Please try again.",
    `Got: "${body.message}"`
  );
});

await test("Login: missing email returns 400", async () => {
  const { status } = await api("POST", "/api/auth/login", { password: "abc" });
  assert(status === 400, `Expected 400, got ${status}`);
});

await test("Login: missing password returns 400", async () => {
  const { status } = await api("POST", "/api/auth/login", { email: "a@b.com" });
  assert(status === 400, `Expected 400, got ${status}`);
});

await test("Login: invalid email format returns 400", async () => {
  const { status } = await api("POST", "/api/auth/login", {
    email: "notanemail",
    password: "abc123",
  });
  assert(status === 400, `Expected 400, got ${status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Registration
// ─────────────────────────────────────────────────────────────────────────────

await test("Register: new account succeeds and returns user", async () => {
  const { status, body, headers } = await api("POST", "/api/auth/register", {
    email: testEmail,
    password: testPassword,
    firstName: "Playwright",
    lastName: "Test",
  });
  assert(status === 200, `Expected 200, got ${status} — ${JSON.stringify(body)}`);
  assert(body.user?.email === testEmail, `Email mismatch: ${body.user?.email}`);
  assert(!body.user?.passwordHash, "passwordHash should be stripped from response");
  sessionCookies = extractCookies(headers);
});

await test("Register: duplicate email returns 409", async () => {
  const { status, body } = await api("POST", "/api/auth/register", {
    email: testEmail,
    password: testPassword,
    firstName: "Duplicate",
  });
  assert(status === 409, `Expected 409, got ${status}`);
  assert(body.message?.includes("already exists"), `Got: "${body.message}"`);
});

await test("Register: missing first name returns 400", async () => {
  const { status } = await api("POST", "/api/auth/register", {
    email: `another-${Date.now()}@test.com`,
    password: "Test123!",
  });
  assert(status === 400, `Expected 400, got ${status}`);
});

await test("Register: short password returns 400", async () => {
  const { status } = await api("POST", "/api/auth/register", {
    email: `short-${Date.now()}@test.com`,
    password: "abc",
    firstName: "Short",
  });
  assert(status === 400, `Expected 400, got ${status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Session / Auth
// ─────────────────────────────────────────────────────────────────────────────

await test("Auth/me: returns user when session cookie is present", async () => {
  const { status, body } = await api("GET", "/api/auth/me", undefined, sessionCookies);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.user?.email === testEmail, `Email mismatch: ${body.user?.email}`);
});

await test("Auth/me: returns 401 without session cookie", async () => {
  const { status } = await api("GET", "/api/auth/me");
  assert(status === 401, `Expected 401, got ${status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Protected routes require auth
// ─────────────────────────────────────────────────────────────────────────────

await test("Discover: returns 400 without completed profile (new user)", async () => {
  const { status } = await api("GET", "/api/discover", undefined, sessionCookies);
  // New user has no caste/gender → 400 Profile incomplete
  assert(status === 400, `Expected 400, got ${status}`);
});

await test("Discover: returns 401 without session", async () => {
  const { status } = await api("GET", "/api/discover");
  assert(status === 401, `Expected 401, got ${status}`);
});

await test("Matches: returns 401 without session", async () => {
  const { status } = await api("GET", "/api/matches");
  assert(status === 401, `Expected 401, got ${status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Self-like prevention
// ─────────────────────────────────────────────────────────────────────────────

await test("Like: self-like returns 400", async () => {
  const meRes = await api("GET", "/api/auth/me", undefined, sessionCookies);
  const myId = meRes.body?.user?.id;
  assert(myId, "Could not get user ID");
  const { status, body } = await api("POST", `/api/like/${myId}`, undefined, sessionCookies);
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.error?.includes("yourself"), `Got: "${body.error}"`);
});

await test("Dislike: self-dislike returns 400", async () => {
  const meRes = await api("GET", "/api/auth/me", undefined, sessionCookies);
  const myId = meRes.body?.user?.id;
  const { status } = await api("POST", `/api/dislike/${myId}`, undefined, sessionCookies);
  assert(status === 400, `Expected 400, got ${status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Rate limiting headers
// ─────────────────────────────────────────────────────────────────────────────

await test("Rate-limit headers present on login endpoint", async () => {
  const { headers } = await api("POST", "/api/auth/login", {
    email: "x@x.com",
    password: "x",
  });
  const keys = Array.from((headers as any).keys?.() ?? []);
  const hasRL =
    keys.some((k: any) => String(k).toLowerCase().includes("ratelimit")) ||
    headers.has("retry-after");
  assert(hasRL, `No rate-limit headers found. Headers: ${JSON.stringify(keys)}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Logout
// ─────────────────────────────────────────────────────────────────────────────

await test("Logout: clears session", async () => {
  const { status } = await api("POST", "/api/auth/logout", undefined, sessionCookies);
  assert(status === 200, `Expected 200, got ${status}`);
  // After logout, auth/me should return 401
  const { status: meStatus } = await api("GET", "/api/auth/me", undefined, sessionCookies);
  assert(meStatus === 401, `Expected 401 after logout, got ${meStatus}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════");
console.log("  Gûstîlk API Test Results");
console.log("═══════════════════════════════════════════");
for (const r of results) {
  const icon = r.ok ? "✅" : "❌";
  console.log(`${icon}  ${r.name}`);
  if (!r.ok && r.detail) console.log(`      → ${r.detail}`);
}
console.log("───────────────────────────────────────────");
console.log(`  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
console.log("═══════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
