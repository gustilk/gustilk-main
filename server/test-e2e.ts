/**
 * End-to-end API test for Gustilk.
 * Tests: login, discovery, likes, mutual match, messaging, dislike exclusion, block exclusion.
 *
 * Usage:
 *   TEST_BASE_URL=https://your-railway-url npx tsx server/test-e2e.ts
 *
 * Requires the 12 Murid test users from seed-test-murid.ts to already exist.
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:5000";
const PASSWORD = "Test1234!";

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, reason: string) {
  console.error(`  ✗ ${label}: ${reason}`);
  failed++;
}

// ── Session helper ──────────────────────────────────────────────────────────

type Session = {
  get:  (path: string) => Promise<Response>;
  post: (path: string, body?: unknown) => Promise<Response>;
  del:  (path: string) => Promise<Response>;
  userId: string;
};

async function login(email: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${text}`);
  }

  const setCookie = res.headers.get("set-cookie") ?? "";
  const sidMatch = setCookie.match(/connect\.sid=([^;]+)/);
  if (!sidMatch) throw new Error(`No session cookie for ${email}`);
  const cookie = `connect.sid=${sidMatch[1]}`;

  const data = await res.json() as { user: { id: string } };
  const userId = data.user.id;

  const headers = { "Content-Type": "application/json", Cookie: cookie };

  return {
    userId,
    get:  (path) => fetch(`${BASE}${path}`, { headers }),
    post: (path, body?) => fetch(`${BASE}${path}`, { method: "POST", headers, body: body !== undefined ? JSON.stringify(body) : undefined }),
    del:  (path) => fetch(`${BASE}${path}`, { method: "DELETE", headers }),
  };
}

// ── Test runner ─────────────────────────────────────────────────────────────

async function section(name: string, fn: () => Promise<void>) {
  console.log(`\n── ${name}`);
  try {
    await fn();
  } catch (err: unknown) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function testLogin() {
  await section("Login — valid credentials", async () => {
    const s = await login("kawa.murid@test.com");
    if (!s.userId) throw new Error("No userId returned");
    pass("Login returns userId");
  });

  await section("Login — wrong password", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "kawa.murid@test.com", password: "WrongPassword!" }),
    });
    if (res.status === 401 || res.status === 400) pass("Wrong password returns 4xx");
    else fail("Wrong password", `Expected 4xx, got ${res.status}`);
  });
}

async function testDiscovery() {
  await section("Discovery — male sees female Murid profiles", async () => {
    const s = await login("kawa.murid@test.com"); // male, Murid
    const res = await s.get("/api/discover");
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { profiles } = await res.json() as { profiles: { gender: string; caste: string; email?: string; firstName: string }[] };

    const allFemale = profiles.every(p => p.gender === "female");
    const allMurid  = profiles.every(p => p.caste === "murid");

    if (allFemale) pass("All discovered profiles are female");
    else fail("Gender filter", `Got non-female profile in results`);

    if (allMurid) pass("All discovered profiles are Murid");
    else fail("Caste filter", `Got non-Murid profile in results`);

    if (profiles.length > 0) pass(`Discovery returns ${profiles.length} profiles`);
    else fail("Discovery has results", "0 profiles returned");
  });

  await section("Discovery — block exclusion (Zervan blocked Jinan)", async () => {
    const zervan = await login("zervan.murid@test.com"); // m5 blocked f2 (Jinan)
    const res = await zervan.get("/api/discover");
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { profiles } = await res.json() as { profiles: { firstName: string }[] };
    const hasJinan = profiles.some(p => p.firstName === "Jinan");
    if (!hasJinan) pass("Blocked user (Jinan) excluded from Zervan's discovery");
    else fail("Block exclusion", "Jinan still appears in Zervan's discovery");
  });

  await section("Discovery — dislike exclusion (Diyar disliked Randa)", async () => {
    const diyar = await login("diyar.murid@test.com"); // m2 disliked f5 (Randa)
    const res = await diyar.get("/api/discover");
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { profiles } = await res.json() as { profiles: { firstName: string }[] };
    const hasRanda = profiles.some(p => p.firstName === "Randa");
    if (!hasRanda) pass("Disliked user (Randa) excluded from Diyar's discovery");
    else fail("Dislike exclusion", "Randa still appears in Diyar's discovery");
  });
}

async function testLikeAndMatch() {
  // Nour (f4) and Haval (m4) — one-sided likes exist already in seed:
  // mIds[4] (Haval) liked fIds[4] (Nour) in seed.
  // So Nour liking Haval back should create a match.
  let matchId = "";

  await section("Like — Nour likes Haval (completes mutual like → match)", async () => {
    const nour  = await login("nour.murid@test.com");
    const haval = await login("haval.murid@test.com");

    const res = await nour.post(`/api/like/${haval.userId}`);
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = await res.json() as { isMatch: boolean; likeId: string };

    if (data.isMatch) pass("Mutual like creates a match (isMatch: true)");
    else fail("Mutual like", "isMatch was false — match not created");
  });

  await section("Matches — Nour sees Haval in match list", async () => {
    const nour  = await login("nour.murid@test.com");
    const haval = await login("haval.murid@test.com");

    const res = await nour.get("/api/matches");
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { matches } = await res.json() as { matches: { id: string; otherUser: { id: string } }[] };

    const m = matches.find(m => m.otherUser.id === haval.userId);
    if (m) {
      pass("Nour's match list contains Haval");
      matchId = m.id;
    } else {
      fail("Match list", "Haval not found in Nour's matches");
    }
  });

  await section("Messaging — Haval sends, Nour receives", async () => {
    if (!matchId) throw new Error("No matchId from previous step — skipping");
    const nour  = await login("nour.murid@test.com");
    const haval = await login("haval.murid@test.com");

    const sendRes = await haval.post(`/api/messages/${matchId}`, { text: "Hello Nour! Nice to meet you 👋" });
    if (!sendRes.ok) throw new Error(`Send failed: ${sendRes.status} ${await sendRes.text()}`);
    pass("Haval sends message successfully");

    const fetchRes = await nour.get(`/api/messages/${matchId}`);
    if (!fetchRes.ok) throw new Error(`Fetch failed: ${fetchRes.status} ${await fetchRes.text()}`);
    const { messages } = await fetchRes.json() as { messages: { senderId: string; text: string }[] };

    const msg = messages.find(m => m.senderId === haval.userId && m.text.includes("Hello Nour"));
    if (msg) pass("Nour receives Haval's message");
    else fail("Message delivery", "Message not found in Nour's fetch");

    const replyRes = await nour.post(`/api/messages/${matchId}`, { text: "Hi Haval! Great to meet you too ☀️" });
    if (!replyRes.ok) throw new Error(`Reply failed: ${replyRes.status} ${await replyRes.text()}`);
    pass("Nour replies successfully");

    const fetchRes2 = await haval.get(`/api/messages/${matchId}`);
    if (!fetchRes2.ok) throw new Error(`Fetch failed: ${fetchRes2.status} ${await fetchRes2.text()}`);
    const { messages: msgs2 } = await fetchRes2.json() as { messages: { senderId: string; text: string }[] };
    const reply = msgs2.find(m => m.senderId === nour.userId && m.text.includes("Hi Haval"));
    if (reply) pass("Haval receives Nour's reply");
    else fail("Reply delivery", "Reply not found in Haval's fetch");
  });
}

async function testExistingMatches() {
  await section("Existing matches — Kawa matched with Amira (seeded)", async () => {
    const kawa  = await login("kawa.murid@test.com");
    const amira = await login("amira.murid@test.com");

    const res = await kawa.get("/api/matches");
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { matches } = await res.json() as { matches: { id: string; otherUser: { id: string } }[] };

    const m = matches.find(m => m.otherUser.id === amira.userId);
    if (m) {
      pass("Kawa's match list contains Amira");

      const msgRes = await kawa.get(`/api/messages/${m.id}`);
      if (!msgRes.ok) throw new Error(`Messages fetch: ${msgRes.status} ${await msgRes.text()}`);
      const { messages } = await msgRes.json() as { messages: unknown[] };
      if (messages.length > 0) pass(`Seeded conversation has ${messages.length} messages`);
      else fail("Seeded messages", "0 messages found");
    } else {
      fail("Existing match", "Amira not in Kawa's match list");
    }
  });
}

async function testOneSidedLike() {
  await section("One-sided like — Randa liked Kawa, no match yet", async () => {
    const randa = await login("randa.murid@test.com"); // f5 liked m0 (Kawa) in seed
    const kawa  = await login("kawa.murid@test.com");  // m0 did NOT like Randa back

    // Randa's match list should NOT contain Kawa
    const res = await randa.get("/api/matches");
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { matches } = await res.json() as { matches: { otherUser: { id: string } }[] };
    const hasKawa = matches.some(m => m.otherUser.id === kawa.userId);
    if (!hasKawa) pass("One-sided like does not create a match");
    else fail("One-sided like", "Match was created without mutual like");
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  Gustilk E2E Tests`);
  console.log(`  Base URL: ${BASE}`);
  console.log(`${"═".repeat(55)}`);

  await testLogin();
  await testDiscovery();
  await testLikeAndMatch();
  await testExistingMatches();
  await testOneSidedLike();

  const total = passed + failed;
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  Results: ${passed}/${total} passed${failed > 0 ? ` · ${failed} FAILED` : " ✓"}`);
  console.log(`${"═".repeat(55)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
