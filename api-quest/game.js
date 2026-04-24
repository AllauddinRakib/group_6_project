/* API Quest — game logic */

const State = {
  level: 1,
  xp: 0,
  lives: 3,
  streak: 0,
  quizIndex: 0,
  buildIndex: 0,
  bossIndex: 0,
  bossHP: 100,
};

const Save = {
  key: "api-quest-save-v1",
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(this.key) || "null");
      if (s && typeof s === "object") Object.assign(State, s);
    } catch (_) {}
  },
  save() {
    localStorage.setItem(this.key, JSON.stringify(State));
  },
  reset() {
    localStorage.removeItem(this.key);
    location.reload();
  },
};

/* ---------- UI helpers ---------- */

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function updateStats() {
  $("#stat-level").textContent = State.level;
  $("#stat-xp").textContent = State.xp;
  $("#stat-lives").textContent = "❤".repeat(Math.max(0, State.lives)) || "0";
  $("#stat-streak").textContent = State.streak;
  Save.save();
}

function awardXP(n, reason) {
  State.xp += n;
  State.streak += 1;
  if (State.xp >= State.level * 50) {
    State.level += 1;
    toast(`Level up! You are now level ${State.level}`, "ok");
  } else if (reason) {
    toast(`+${n} XP — ${reason}`, "ok");
  }
  updateStats();
}

function loseLife(reason) {
  State.lives -= 1;
  State.streak = 0;
  toast(reason || "Wrong!", "bad");
  if (State.lives <= 0) {
    State.lives = 3;
    State.xp = Math.max(0, State.xp - 10);
    toast("You ran out of lives. Lives refilled, XP -10.", "bad");
  }
  updateStats();
}

let toastTimer;
function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 1800);
}

function switchTab(name) {
  $all(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $all(".panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$all(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

/* ---------- Quiz ---------- */

const QUIZ = [
  {
    q: "Which HTTP method should you use to retrieve a resource without changing anything on the server?",
    choices: ["POST", "GET", "DELETE", "PATCH"],
    correct: 1,
    why: "GET is for reading. It should be safe and idempotent — no side effects.",
  },
  {
    q: "An API returns 404. What does that mean?",
    choices: [
      "The server crashed.",
      "You are not authenticated.",
      "The resource was not found at that URL.",
      "The request was successful but empty.",
    ],
    correct: 2,
    why: "404 Not Found means the server could not find the resource at that URL.",
  },
  {
    q: "Which method is best for creating a new resource?",
    choices: ["GET", "PUT", "POST", "HEAD"],
    correct: 2,
    why: "POST typically creates a new resource. PUT can also create but is normally used to replace an existing resource at a known URL.",
  },
  {
    q: "Where does a Bearer token normally go?",
    choices: [
      "In the URL query string",
      "In the response body",
      "In the Authorization header",
      "In the cookie named `bearer`",
    ],
    correct: 2,
    why: "Send it as `Authorization: Bearer <token>` so it isn't logged in URLs or exposed in referrers.",
  },
  {
    q: "Which status code indicates the client sent bad data?",
    choices: ["200", "301", "400", "500"],
    correct: 2,
    why: "400 Bad Request — the server couldn't understand the request due to client-side error.",
  },
  {
    q: "What does 'idempotent' mean for an HTTP method?",
    choices: [
      "It is always safe to cache",
      "Calling it multiple times has the same effect as calling it once",
      "It requires authentication",
      "It can only be called once per second",
    ],
    correct: 1,
    why: "GET, PUT and DELETE are idempotent — repeating them yields the same server state.",
  },
  {
    q: "Which is a valid REST-style endpoint for getting user 42's orders?",
    choices: [
      "/getOrdersForUser?id=42",
      "/users/42/orders",
      "/orders/getByUser/42",
      "/api?action=orders&u=42",
    ],
    correct: 1,
    why: "REST uses nouns in hierarchical URLs. The method (GET) expresses the action.",
  },
  {
    q: "The response `Content-Type: application/json` tells the client…",
    choices: [
      "how large the body is",
      "how to parse the body",
      "which auth scheme was used",
      "which HTTP version is in use",
    ],
    correct: 1,
    why: "Content-Type tells the receiver how to interpret the body bytes.",
  },
];

function renderQuiz() {
  const host = $("#quiz-host");
  if (State.quizIndex >= QUIZ.length) {
    host.innerHTML = `
      <h3>Arena cleared!</h3>
      <p>You answered all ${QUIZ.length} questions. Move on to Status Match.</p>
    `;
    return;
  }
  const item = QUIZ[State.quizIndex];
  host.innerHTML = `
    <div class="q-meta">Question ${State.quizIndex + 1} of ${QUIZ.length}</div>
    <div class="q-question">${item.q}</div>
    <div class="q-choices">
      ${item.choices.map((c, i) => `<button class="q-choice" data-i="${i}">${c}</button>`).join("")}
    </div>
    <div class="q-explain" id="q-explain"></div>
  `;
  $all(".q-choice", host).forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.i);
      const correct = i === item.correct;
      $all(".q-choice").forEach(b => b.disabled = true);
      btn.classList.add(correct ? "correct" : "wrong");
      if (!correct) {
        const correctBtn = $all(".q-choice")[item.correct];
        correctBtn.classList.add("correct");
      }
      const explain = $("#q-explain");
      explain.textContent = (correct ? "✅ Correct. " : "❌ Not quite. ") + item.why;
      explain.classList.add("show");
      if (correct) awardXP(10, "correct answer");
      else loseLife("Wrong answer — read the explanation");
      setTimeout(() => {
        State.quizIndex += 1;
        renderQuiz();
      }, 1400);
    });
  });
}

$("#quiz-restart").addEventListener("click", () => {
  State.quizIndex = 0;
  renderQuiz();
});

/* ---------- Status Match ---------- */

const MATCH_DATA = [
  { code: "200", scenario: "Request succeeded and the server returned the data you asked for." },
  { code: "201", scenario: "You successfully created a new resource via POST." },
  { code: "301", scenario: "The resource has permanently moved to a new URL." },
  { code: "400", scenario: "Your request body is malformed JSON." },
  { code: "401", scenario: "You forgot to include a valid auth token." },
  { code: "403", scenario: "You are logged in but not allowed to access this resource." },
  { code: "404", scenario: "No resource exists at that URL." },
  { code: "429", scenario: "You're calling the API too fast — slow down." },
  { code: "500", scenario: "The server crashed while processing your request." },
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderMatch() {
  const codesEl = $("#match-codes");
  const slotsEl = $("#match-slots");
  const shuffled = shuffle(MATCH_DATA.map(d => d.code));
  codesEl.innerHTML = shuffled.map(c =>
    `<div class="chip" draggable="true" data-code="${c}">${c}</div>`
  ).join("");
  slotsEl.innerHTML = shuffle(MATCH_DATA).map(d => `
    <div class="slot" data-correct="${d.code}">
      <div>${d.scenario}</div>
      <div class="slot-target" data-target></div>
    </div>
  `).join("");
  wireMatch();
  $("#match-feedback").textContent = "";
}

function wireMatch() {
  let dragged = null;

  $all(".chip").forEach(chip => {
    chip.addEventListener("dragstart", () => {
      dragged = chip;
      chip.classList.add("dragging");
    });
    chip.addEventListener("dragend", () => {
      chip.classList.remove("dragging");
      dragged = null;
    });
  });

  $all(".slot").forEach(slot => {
    const target = slot.querySelector("[data-target]");

    slot.addEventListener("dragover", e => { e.preventDefault(); slot.classList.add("over"); });
    slot.addEventListener("dragleave", () => slot.classList.remove("over"));
    slot.addEventListener("drop", e => {
      e.preventDefault();
      slot.classList.remove("over");
      if (!dragged) return;
      // if target already has a chip, return it to the bank
      if (target.firstChild) $("#match-codes").appendChild(target.firstChild);
      target.appendChild(dragged);
    });

    // Click-to-return: click a placed chip to send it back to bank
    target.addEventListener("click", () => {
      if (target.firstChild) $("#match-codes").appendChild(target.firstChild);
    });
  });
}

$("#match-reset").addEventListener("click", renderMatch);
$("#match-check").addEventListener("click", () => {
  let correct = 0, total = MATCH_DATA.length;
  $all(".slot").forEach(slot => {
    const target = slot.querySelector("[data-target]");
    const code = target.firstChild && target.firstChild.dataset ? target.firstChild.dataset.code : null;
    const expected = slot.dataset.correct;
    slot.classList.remove("correct", "wrong");
    if (code === expected) {
      slot.classList.add("correct");
      correct++;
    } else if (code) {
      slot.classList.add("wrong");
    }
  });
  $("#match-feedback").textContent = `Score: ${correct}/${total}`;
  if (correct === total) awardXP(25, "perfect match");
  else if (correct >= total - 1) awardXP(10, "great match");
  else loseLife("Some codes are mismatched — check the feedback");
});

/* ---------- Mock API Console ---------- */

const MockDB = {
  users: [
    { id: 1, name: "Ada Lovelace",   role: "admin" },
    { id: 2, name: "Alan Turing",    role: "user"  },
    { id: 3, name: "Grace Hopper",   role: "user"  },
  ],
  courses: [
    { id: 101, title: "Intro to APIs",           credits: 3 },
    { id: 102, title: "Web Programming",         credits: 4 },
    { id: 103, title: "Databases & Backends",    credits: 4 },
  ],
  nextUserId: 4,
};

function parseHeaders(text) {
  const h = {};
  text.split(/\r?\n/).forEach(line => {
    const i = line.indexOf(":");
    if (i > 0) h[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  });
  return h;
}

function matchRoute(method, path) {
  const routes = [
    { m: "GET",    r: /^\/users$/,         handler: () => ({ status: 200, body: MockDB.users }) },
    { m: "GET",    r: /^\/users\/(\d+)$/,  handler: (_, id) => {
        const u = MockDB.users.find(x => x.id == id);
        return u ? { status: 200, body: u } : { status: 404, body: { error: "User not found" } };
    }},
    { m: "POST",   r: /^\/users$/,         handler: (_, __, body) => {
        if (!body || typeof body !== "object") return { status: 400, body: { error: "Body must be JSON" } };
        if (!body.name) return { status: 400, body: { error: "'name' is required" } };
        const u = { id: MockDB.nextUserId++, name: body.name, role: body.role || "user" };
        MockDB.users.push(u);
        return { status: 201, body: u };
    }},
    { m: "PUT",    r: /^\/users\/(\d+)$/,  handler: (_, id, body) => {
        const u = MockDB.users.find(x => x.id == id);
        if (!u) return { status: 404, body: { error: "User not found" } };
        if (!body || !body.name) return { status: 400, body: { error: "'name' is required" } };
        u.name = body.name; u.role = body.role || u.role;
        return { status: 200, body: u };
    }},
    { m: "PATCH",  r: /^\/users\/(\d+)$/,  handler: (_, id, body) => {
        const u = MockDB.users.find(x => x.id == id);
        if (!u) return { status: 404, body: { error: "User not found" } };
        Object.assign(u, body || {});
        return { status: 200, body: u };
    }},
    { m: "DELETE", r: /^\/users\/(\d+)$/,  handler: (_, id) => {
        const i = MockDB.users.findIndex(x => x.id == id);
        if (i < 0) return { status: 404, body: { error: "User not found" } };
        MockDB.users.splice(i, 1);
        return { status: 204, body: null };
    }},
    { m: "GET",    r: /^\/courses$/,       handler: () => ({ status: 200, body: MockDB.courses }) },
    { m: "GET",    r: /^\/me$/,            needsAuth: true, handler: () => ({ status: 200, body: { id: 0, name: "You", role: "player" } }) },
  ];
  for (const route of routes) {
    if (route.m !== method) continue;
    const m = path.match(route.r);
    if (m) return { route, params: m.slice(1) };
  }
  return null;
}

function renderRequestPreview() {
  const method = $("#c-method").value;
  const path = $("#c-path").value;
  const headers = $("#c-headers").value.split(/\r?\n/).filter(Boolean);
  const body = $("#c-body").value.trim();
  const text = [`${method} ${path} HTTP/1.1`, `Host: api.example.com`, ...headers, "", body].join("\n");
  $("#c-preview").textContent = text;
}

["c-method","c-path","c-headers","c-body"].forEach(id => $("#" + id).addEventListener("input", renderRequestPreview));

$("#c-send").addEventListener("click", () => {
  const method = $("#c-method").value;
  const path = $("#c-path").value.trim();
  const headers = parseHeaders($("#c-headers").value);
  const rawBody = $("#c-body").value.trim();
  let body = null, parseError = null;
  if (rawBody && (method === "POST" || method === "PUT" || method === "PATCH")) {
    try { body = JSON.parse(rawBody); }
    catch (e) { parseError = e.message; }
  }

  let response;
  if (parseError) {
    response = { status: 400, body: { error: "Invalid JSON in body", detail: parseError } };
  } else {
    const match = matchRoute(method, path);
    if (!match) {
      response = { status: 404, body: { error: "No route matches", method, path } };
    } else if (match.route.needsAuth && !(headers["authorization"] || "").toLowerCase().startsWith("bearer ")) {
      response = { status: 401, body: { error: "Auth required. Send an Authorization: Bearer <token> header." } };
    } else {
      response = match.route.handler(path, ...match.params, body);
    }
  }

  const statusText = statusName(response.status);
  const text = [
    `HTTP/1.1 ${response.status} ${statusText}`,
    `Content-Type: application/json`,
    ``,
    response.body === null ? "" : JSON.stringify(response.body, null, 2),
  ].join("\n");
  $("#c-response").textContent = text;

  if (response.status >= 200 && response.status < 300) {
    awardXP(5, `${method} ${path} → ${response.status}`);
  } else if (response.status >= 400) {
    toast(`${response.status} ${statusText}`, "bad");
  }
  renderRequestPreview();
});

function statusName(s) {
  return ({
    200: "OK", 201: "Created", 204: "No Content",
    301: "Moved Permanently",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
    404: "Not Found", 429: "Too Many Requests",
    500: "Internal Server Error",
  })[s] || "";
}

/* ---------- Endpoint Builder ---------- */

const BUILD_TASKS = [
  {
    prompt: "List every user in the system.",
    expect: { method: "GET", path: "/users" },
    hint: "Use GET on the collection URL.",
  },
  {
    prompt: "Fetch the single user whose id is 2.",
    expect: { method: "GET", path: "/users/2" },
    hint: "Use the item URL, not a query string.",
  },
  {
    prompt: "Create a new user named 'Linus' with role 'user'.",
    expect: { method: "POST", path: "/users", body: { name: "Linus", role: "user" } },
    hint: "POST to /users with a JSON body.",
  },
  {
    prompt: "Permanently delete the user with id 3.",
    expect: { method: "DELETE", path: "/users/3" },
    hint: "Use DELETE on the item URL.",
  },
  {
    prompt: "Update only the role of user 1 to 'superadmin' (partial update).",
    expect: { method: "PATCH", path: "/users/1", body: { role: "superadmin" } },
    hint: "PATCH = partial update.",
  },
];

function renderBuild() {
  const host = $("#build-host");
  if (State.buildIndex >= BUILD_TASKS.length) {
    host.innerHTML = `<h3>All challenges solved!</h3><p>Head to the Boss Battle.</p>`;
    return;
  }
  const t = BUILD_TASKS[State.buildIndex];
  host.innerHTML = `
    <div class="build-task"><b>Challenge ${State.buildIndex + 1}/${BUILD_TASKS.length}:</b> ${t.prompt}</div>
    <div class="build-grid">
      <label>Method</label>
      <select id="b-method">
        <option>GET</option><option>POST</option><option>PUT</option>
        <option>PATCH</option><option>DELETE</option>
      </select>
      <label>Path</label>
      <input id="b-path" type="text" placeholder="/users/..." />
      <label>Body (JSON, if needed)</label>
      <textarea id="b-body" rows="3" placeholder='e.g. {"name":"..."}'></textarea>
    </div>
    <div class="row">
      <button class="btn" id="b-hint">Hint</button>
      <button class="btn primary" id="b-submit">Submit</button>
      <button class="btn" id="b-skip">Skip</button>
    </div>
    <p id="b-feedback" class="feedback"></p>
  `;

  $("#b-hint").addEventListener("click", () => {
    $("#b-feedback").textContent = "💡 " + t.hint;
  });
  $("#b-skip").addEventListener("click", () => {
    State.buildIndex++; renderBuild();
  });
  $("#b-submit").addEventListener("click", () => {
    const method = $("#b-method").value;
    const path = $("#b-path").value.trim();
    const rawBody = $("#b-body").value.trim();
    let body = null;
    if (rawBody) {
      try { body = JSON.parse(rawBody); }
      catch (e) { $("#b-feedback").textContent = "❌ Body is not valid JSON."; return; }
    }

    const methodOk = method === t.expect.method;
    const pathOk   = path === t.expect.path;
    let bodyOk = true;
    if (t.expect.body) bodyOk = body && shallowMatch(body, t.expect.body);
    if (!t.expect.body && body) bodyOk = true; // extra body tolerated

    if (methodOk && pathOk && bodyOk) {
      $("#b-feedback").textContent = "✅ Nicely built!";
      awardXP(15, "correct endpoint");
      setTimeout(() => { State.buildIndex++; renderBuild(); }, 900);
    } else {
      const parts = [];
      if (!methodOk) parts.push(`method should be ${t.expect.method}`);
      if (!pathOk)   parts.push(`path should be ${t.expect.path}`);
      if (!bodyOk)   parts.push(`body should match ${JSON.stringify(t.expect.body)}`);
      $("#b-feedback").textContent = "❌ " + parts.join("; ");
      loseLife();
    }
  });
}

function shallowMatch(a, b) {
  if (!a || !b) return false;
  return Object.keys(b).every(k => a[k] === b[k]);
}

/* ---------- Boss Battle ---------- */

const BOSS = [
  {
    scene: "Your client sends a POST to `/users` with a Python dict, and the server replies `415 Unsupported Media Type`. What's wrong?",
    choices: [
      "Path is incorrect",
      "The request lacks Content-Type: application/json and/or the body isn't serialized JSON",
      "POST can't create users",
      "The server is down",
    ],
    correct: 1,
    damage: 25,
    why: "415 means the server didn't accept the media type. Send JSON and set Content-Type: application/json.",
  },
  {
    scene: "You hit `/api/orders` and get `401 Unauthorized` even though you have a token.",
    choices: [
      "Your token goes in a query parameter, not a header",
      "You sent `Authorization: <token>` instead of `Authorization: Bearer <token>`",
      "The server is rate-limiting you",
      "Orders only support GET between 9-5",
    ],
    correct: 1,
    damage: 20,
    why: "Bearer tokens need the `Bearer ` prefix. Without it, most servers reject with 401.",
  },
  {
    scene: "A GET to `/users/999` returns `500`. The logs say a null pointer in `getUser`. What's the BEST client-side reaction?",
    choices: [
      "Retry forever until it works",
      "Treat 500 as a server-side bug and back off; report it. 404 would have been correct for missing data.",
      "Show the user the raw stack trace",
      "Switch to HTTPS",
    ],
    correct: 1,
    damage: 20,
    why: "500 is the server's problem. Back off, report, and don't hammer. The server should have returned 404 instead.",
  },
  {
    scene: "You want to replace ALL fields of user 7. Which request should you send?",
    choices: [
      "POST /users/7 with full body",
      "PUT /users/7 with full body",
      "PATCH /users/7 with only changed fields",
      "DELETE /users/7 then POST /users",
    ],
    correct: 1,
    damage: 20,
    why: "PUT replaces a resource at a known URL. PATCH is for partial updates.",
  },
  {
    scene: "The API says it returns JSON, but `response.body` is a literal string `\"{\\\"id\\\":1}\"`. Why?",
    choices: [
      "The server double-encoded the body as a JSON string",
      "JSON isn't supported in that language",
      "The network truncated the body",
      "You need to set Accept: text/plain",
    ],
    correct: 0,
    damage: 15,
    why: "The server JSON-encoded a string containing JSON. You either parse twice or fix the server to send the object directly.",
  },
];

function renderBoss() {
  const host = $("#boss-host");
  if (State.bossIndex >= BOSS.length) {
    host.innerHTML = `
      <h3>You defeated the boss!</h3>
      <p>You understand HTTP methods, status codes, auth, and common API pitfalls. Victory earned you bonus XP.</p>
      <button class="btn primary" id="boss-again">Fight again</button>
    `;
    awardXP(50, "boss defeated");
    State.bossIndex = 0; State.bossHP = 100;
    $("#boss-again").addEventListener("click", renderBoss);
    return;
  }
  const step = BOSS[State.bossIndex];
  host.innerHTML = `
    <div class="boss-health"><div style="width:${State.bossHP}%"></div></div>
    <div class="boss-scene"><b>Round ${State.bossIndex + 1}/${BOSS.length}:</b> ${step.scene}</div>
    <div class="q-choices">
      ${step.choices.map((c, i) => `<button class="q-choice" data-i="${i}">${c}</button>`).join("")}
    </div>
    <div class="q-explain" id="boss-explain"></div>
  `;
  $all(".q-choice", host).forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.i);
      $all(".q-choice").forEach(b => b.disabled = true);
      const correct = i === step.correct;
      btn.classList.add(correct ? "correct" : "wrong");
      if (!correct) $all(".q-choice")[step.correct].classList.add("correct");
      const ex = $("#boss-explain");
      ex.textContent = (correct ? "✅ " : "❌ ") + step.why;
      ex.classList.add("show");

      if (correct) {
        State.bossHP = Math.max(0, State.bossHP - step.damage);
        awardXP(20, "hit!");
      } else {
        loseLife("The boss laughs at your request.");
      }
      setTimeout(() => { State.bossIndex += 1; renderBoss(); }, 1500);
    });
  });
}

/* ---------- Init ---------- */

Save.load();
updateStats();
renderQuiz();
renderMatch();
renderRequestPreview();
renderBuild();
renderBoss();

$("#reset-all").addEventListener("click", () => {
  if (confirm("Reset all progress?")) Save.reset();
});

// expose for buttons in HTML
window.switchTab = switchTab;
