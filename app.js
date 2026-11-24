/* Hump Day Hack: a new IT case every Wednesday. Part of Walking IT.
   Created by Dean Baker. © 2026 Dean Baker. All rights reserved.
   The release dates are in data/schedule.js. The cases are in data/cases.js (built from Dean's private copies).
   Progress lives in this browser only (localStorage). Nothing is sent anywhere. */
(function () {
"use strict";
const SCH = window.HDH_SCHEDULE, TM = window.HDH_TIME, CASES = window.HDH_CASES || [];
const AREAS = SCH.areas, MAXN = SCH.cases.length;
const THEMES = [["dark", "Simple · dark", "#0a1020"], ["light", "Simple · light", "#eef2f8"], ["pixel", "Pixel arcade", "#ff3ea5"]];
const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const sess = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
};
const now = () => Date.now();

/* preview mode (#preview): every case playable, walkthroughs open, progress kept apart from the real thing */
if (location.hash === "#preview") { sess.set("hdh:preview", "1"); history.replaceState(null, "", location.pathname + location.search); }
const PREVIEW = sess.get("hdh:preview") === "1";
const K = {theme: "walkingit:theme", data: PREVIEW ? "hdh:preview:v1" : "hdh:v1"};
const S = {theme: store.get(K.theme, "dark"), data: store.get(K.data, null), cur: -1, live: -1, focus: null};
if (!THEMES.some(t => t[0] === S.theme)) S.theme = "dark";
if (!S.data || typeof S.data !== "object" || !S.data.cases) S.data = {v: 1, cases: {}};
const save = () => store.set(K.data, S.data);
const isPixel = () => S.theme === "pixel";
const T = (simple, pixel) => isPixel() ? pixel : simple;

/* ============================================================
   RELEASES
   ============================================================ */
const caseOf = n => CASES.find(c => c.n === n);
const metaOf = n => SCH.cases.find(c => c.n === n);
const released = n => n >= 1 && n <= MAXN && !!caseOf(n) && (PREVIEW || TM.isOut(n, now()));
/* live = out, and the next Wednesday hasn't come yet. Live cases count towards your streak. */
const isLive = n => !PREVIEW && TM.isOut(n, now()) && !TM.isOut(n + 1, now());
const currentN = () => PREVIEW ? MAXN : Math.min(TM.current(now()), MAXN);
const liveN = () => { const c = TM.current(now()); return c && c <= MAXN && isLive(c) ? c : 0; };
const areaName = a => (AREAS[a] || {}).name || a;

/* ============================================================
   PROGRESS for one case
   picks hold the ORIGINAL option indexes from the data file, in the order they were chosen
   ============================================================ */
function rec(n) { return S.data.cases[n] || {opened: [], picks: {cause: [], fix: []}}; }
function put(n, r) { S.data.cases[n] = r; save(); }
function state(n) {
  const c = caseOf(n), r = rec(n);
  const okI = st => c[st].options.findIndex(o => o.ok);
  const wrongs = r.picks.cause.filter(i => i !== okI("cause")).length + r.picks.fix.filter(i => i !== okI("fix")).length;
  const causeDone = r.picks.cause.includes(okI("cause")), fixDone = r.picks.fix.includes(okI("fix"));
  const clues = c.evidence.filter(e => !e.open && r.opened.includes(e.id)).length;
  const cold = wrongs >= 3 && !fixDone;
  const done = fixDone || cold;
  return {r, wrongs, clues, causeDone, fixDone, cold, done, won: fixDone && !cold, stage: !causeDone ? "cause" : "fix", started: r.opened.length > 0 || r.picks.cause.length > 0};
}
const RANKS = [["Head of IT", "HEAD OF IT"], ["Senior engineer", "SENIOR ENGINEER"], ["Second line hero", "2ND LINE HERO"], ["First line legend", "1ST LINE LEGEND"], ["Solid start", "SOLID START"], ["Made it, just", "MADE IT. JUST."]];
function rankOf(st) { if (!st.won) return T("Case gone cold", "GAME OVER"); const r = RANKS[Math.min(RANKS.length - 1, st.clues + st.wrongs)]; return T(r[0], r[1]); }

/* the spoiler-free result to share */
function shareText(n) {
  const st = state(n), c = caseOf(n), m = metaOf(n);
  const sq = which => {
    const picks = st.r.picks[which], ok = c[which].options.findIndex(o => o.ok);
    if (!picks.includes(ok)) return picks.length ? "🟥" : "⬛";
    return picks.length === 1 ? "🟩" : "🟨";
  };
  const clues = "🔍".repeat(st.clues) + "⬜".repeat(3 - st.clues);
  const url = location.origin + location.pathname.replace(/index\.html$/, "");
  return `Hump Day Hack #${n} · ${areaName(m.area)}\n` +
    (st.won ? `🔓 Cracked it · ${rankOf(st)}\n` : `🧊 Case gone cold\n`) +
    `Clues ${clues}\nCause ${sq("cause")}  Fix ${sq("fix")}\n` + url;
}

/* ============================================================
   SMALL RENDER HELPERS
   ============================================================ */
const ICONS = {
  ticket: `<path d="M3 3.5h10v9H3z"/><path d="M5.5 6.5h5M5.5 9h3.5"/>`,
  cmd: `<path d="M2.5 3.5h11v9h-11z"/><path d="m5 6.5 2 1.5-2 1.5M8.5 10h3"/>`,
  log: `<path d="M4 2.5h6l2.5 2.5v8.5H4z"/><path d="M6 7h4.5M6 9.2h4.5M6 11.4h3"/>`,
  config: `<circle cx="8" cy="8" r="2.2"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M3.8 12.2l1.4-1.4M10.8 5.2l1.4-1.4"/>`,
  email: `<path d="M2.5 4h11v8h-11z"/><path d="m2.8 4.4 5.2 4 5.2-4"/>`,
  screen: `<path d="M2 3h12v8H2z"/><path d="M6 14h4M8 11v3"/>`,
  chat: `<path d="M2.8 3.5h10.4v7H7l-3 2.5v-2.5H2.8z"/>`,
  lock: `<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>`
};
const KIND = {ticket: "Ticket", cmd: "Command output", log: "Log", config: "Config", email: "Email", screen: "Admin screen", chat: "Message"};
const icon = k => `<svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[k] || ICONS.log}</svg>`;
const pips = (on, total, cls) => `<span class="pips" aria-hidden="true">${Array.from({length: total}, (_, i) => `<i class="pip${i < on ? " " + cls : ""}"></i>`).join("")}</span>`;

/* evidence body, with walkthrough highlights marked by character ranges so overlapping highlights never break the HTML */
function bodyHTML(ev, marks) {
  const s = ev.body;
  if (!marks) return esc(s);
  const on = new Array(s.length).fill(false);
  (ev.hl || []).forEach(h => { if (!h) return; let i = s.indexOf(h); while (i !== -1) { for (let k = i; k < i + h.length; k++) on[k] = true; i = s.indexOf(h, i + h.length); } });
  let out = "", open = false;
  for (let i = 0; i < s.length; i++) {
    if (on[i] && !open) { out += "<mark>"; open = true; }
    if (!on[i] && open) { out += "</mark>"; open = false; }
    out += esc(s[i]);
  }
  return out + (open ? "</mark>" : "");
}
function evCard(n, ev, opts) {
  const head = `<div class="ev-h"><span class="ev-ic">${icon(opts.locked ? "lock" : ev.kind)}</span><div class="ev-t"><b>${esc(ev.title)}</b><small>${esc(ev.src)}</small></div><span class="ev-k">${esc(T(KIND[ev.kind], KIND[ev.kind].toUpperCase()))}</span></div>`;
  if (opts.locked) {
    const left = 3 - opts.cluesUsed;
    return `<article class="ev locked" id="ev-${ev.id}" aria-label="Locked evidence: ${esc(ev.title)}">${head}
      <div class="lockrow"><div class="ghost" aria-hidden="true"><i></i><i></i><i></i></div>
      <button class="btn sm" data-open="${ev.id}">${T(`Open · uses 1 clue (${left} left)`, `OPEN · 1 CLUE (${left} LEFT)`)}</button></div></article>`;
  }
  return `<article class="ev${opts.just ? " just" : ""}" id="ev-${ev.id}" tabindex="-1" aria-label="Evidence: ${esc(ev.title)}">${head}
    <pre class="body" tabindex="0" aria-label="${esc(ev.title)}">${bodyHTML(ev, opts.marks)}</pre>
    ${opts.note ? `<p class="ev-note"><b>${T("What this tells you", "CLUE")}</b>${esc(ev.note)}</p>` : ""}</article>`;
}
function briefHTML(c, typing) {
  const b = c.brief;
  /* the first time you open a case, the ticket types itself in. Screen readers get the whole text straight away */
  const text = typing
    ? `<span class="sr">${esc(b.text)}</span><span class="tw" aria-hidden="true"><span class="g">${esc(b.text)}</span><span class="ty" id="typer" data-text="${esc(b.text)}"></span></span>`
    : esc(b.text);
  return `<section class="panel brief${typing ? " typing" : ""}" aria-labelledby="briefH"><div class="ph"><h2 id="briefH">${T("The brief", "MISSION")}</h2><span class="sp"></span><span class="ev-k">${esc(b.ref)}</span></div>
    <p class="meta"><span>${T("From", "FROM")}: <b>${esc(b.from)}</b></span><span>${esc(b.role)}</span><span>${T("Via", "VIA")}: ${esc(b.via)}</span></p>
    <blockquote${typing ? ' title="Tap to skip"' : ""}>${text}</blockquote></section>`;
}
function typeIt() {
  const el = document.getElementById("typer"); if (!el) return;
  const full = el.dataset.text, bq = el.closest("blockquote"), panel = el.closest(".brief");
  let i = 0;
  const finish = () => { if (bq.isConnected) { bq.textContent = full; bq.removeAttribute("title"); panel.classList.remove("typing"); } };
  bq.addEventListener("click", () => { i = full.length; }, {once: true});
  const step = () => {
    if (!el.isConnected) return;
    i = Math.min(full.length, i + 2);
    el.textContent = full.slice(0, i);
    if (i >= full.length) return setTimeout(finish, 400);
    setTimeout(step, 15);
  };
  setTimeout(step, 250);
}

/* ============================================================
   WALKING IT: the little card that shows off the four walks
   It's deliberately not styled like a case, so nobody mistakes it for the next challenge.
   Set walkingIT in data/schedule.js to the site's address once it's public and the tiles become links.
   ============================================================ */
const WALKS = [
  ["helpdesk", "TICKET", "Service desk tickets, from logged to closed."],
  ["networking", "PACKET", "Follow a connection step by step and find where it breaks."],
  ["m365", "CLOUD", "Microsoft 365 and Entra problems, traced to the setting that broke them."],
  ["security", "BREACH", "Cyber attacks played out step by step, and the defences that stop them."]
];
let wiOpen = false;
function wiCard(area) {
  const url = SCH.walkingIT || "";
  const tiles = WALKS.map(([a, name, line], i) => {
    const inner = `<b class="wm">${name}<i>WALK</i></b><span>${esc(line)}</span>${a === area ? `<em>${T("Same topic as this case", "THIS TOPIC")}</em>` : ""}`;
    return url ? `<a class="wt" style="--i:${i}" href="${esc(url + AREAS[a].walk + "/")}">${inner}</a>` : `<div class="wt" style="--i:${i}">${inner}</div>`;
  }).join("");
  const foot = url
    ? `<a class="btn pri sm" href="${esc(url)}">${T("Start walking", "START")} <span aria-hidden="true">›</span></a>`
    : `<p>${T("Opening soon. Follow", "OPENING SOON. FOLLOW")} <a href="https://x.com/WalkingITuk" target="_blank" rel="noopener">@WalkingITuk</a> ${T("on X to hear when it does.", "ON X FOR LAUNCH DAY.")}</p>`;
  return `<div class="wi${wiOpen ? " open" : ""}">
    <button class="wi-face" data-act="wi" aria-expanded="${wiOpen}" aria-controls="wiPeek">
      <svg class="wi-logo" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 2 31 9v8c0 8-6 13-14 15C9 30 3 25 3 17V9z" fill="none" stroke="var(--node)" stroke-width="1.8"/><path d="M14 11.5v11l9-5.5z" fill="var(--red)"/></svg>
      <span class="wi-txt"><small>${T("Enjoyed that?", "ENJOYED THAT?")}</small><b>${T("Meet", "MEET")} Walking <i class="itr">IT</i></b><span>${T("Four interactive walks through real IT, by the same maker. Tap for a peek.", "4 WALKS THROUGH REAL IT. TAP TO PEEK.")}</span></span>
      <svg class="wi-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
    </button>
    <div class="wi-peek" id="wiPeek"${wiOpen ? "" : " hidden"}><div class="wi-grid">${tiles}</div><div class="wi-foot">${foot}</div></div>
  </div>`;
}
function toggleWi(btn) {
  wiOpen = !wiOpen;
  const box = btn.closest(".wi"), peek = box.querySelector(".wi-peek");
  box.classList.toggle("open", wiOpen); btn.setAttribute("aria-expanded", String(wiOpen));
  peek.hidden = !wiOpen;
  if (wiOpen && !RM) { box.classList.remove("deal"); void box.offsetWidth; box.classList.add("deal"); }
}

/* ============================================================
   CELEBRATIONS: confetti (or coins in pixel mode) when you crack it, snow when it goes cold
   ============================================================ */
function burst(kind) {
  if (RM) return;
  const fx = document.getElementById("fx"); if (!fx) return;
  const px = isPixel(), win = kind === "win";
  const cols = px ? ["#ffe14a", "#ffe14a", "#ffe14a", "#7dff3a", "#29e7ff"] : ["#ff5a6e", "#6ea8ff", "#3ddc97", "#ffb547", "#a98bff", "#52d6ff"];
  const count = win ? (px ? 44 : 90) : 28;
  let h = "";
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(1), d = (win ? 1.7 + Math.random() * 1.6 : 3.6 + Math.random() * 2.6).toFixed(2);
    const del = (Math.random() * (win ? .45 : 1.4)).toFixed(2), dx = Math.round((Math.random() * 2 - 1) * (win ? 170 : 70));
    const r = Math.round((Math.random() * 2 - 1) * (win ? 900 : 240)), sz = win ? (px ? 12 : 7 + Math.round(Math.random() * 6)) : (px ? 8 : 12 + Math.round(Math.random() * 10));
    h += `<i class="${win ? "cf" : "sn"}${px ? " px" : ""}" style="--x:${x}vw;--d:${d}s;--del:${del}s;--dx:${dx}px;--r:${r}deg;--s:${sz}px${win ? ";--c:" + cols[i % cols.length] : ""}"></i>`;
  }
  fx.innerHTML = h;
  clearTimeout(burst.t);
  burst.t = setTimeout(() => { fx.innerHTML = ""; }, 7500);
}

/* ============================================================
   VIEWS
   ============================================================ */
function header(o) {
  const tabs = PREVIEW ? "" : `<nav class="tabs" aria-label="Hump Day Hack">
      <a class="tab" href="#" ${o.tab === "week" ? 'aria-current="page"' : ""}>${T("This week", "THIS WEEK")}</a>
      <a class="tab" href="#archive" ${o.tab === "archive" ? 'aria-current="page"' : ""}>${T("Case archive", "ARCHIVE")}</a></nav>`;
  const prev = PREVIEW ? `<div class="preview" role="note"><span>${T("Preview mode: every case is unlocked and nothing counts towards real stats. Players don't see this.", "PREVIEW MODE: ALL CASES UNLOCKED")}</span><button data-act="endPreview">${T("Leave preview", "EXIT")}</button></div>` : "";
  return `${prev}<div class="hd">
    <div class="kick"><span class="hdh">HUMP DAY <i>HACK</i></span><span>${esc(T("A new case every Wednesday, " + nice7(), "NEW CASE EVERY WEDNESDAY"))}</span></div>
    <h1 id="pageH" tabindex="-1">${o.h1}</h1>
    ${o.status ? `<p class="status" id="status">${o.status}</p>` : ""}
  </div>${tabs}`;
}
function nice7() { const [h, mi] = SCH.releaseTime.split(":").map(Number); return `${h % 12 || 12}${mi ? ":" + String(mi).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; }

function statusFor(n) {
  if (PREVIEW) return `${esc(areaName(metaOf(n).area))} · ${T("Goes live", "LIVE")} ${esc(TM.niceRelease(n))}`;
  if (isLive(n)) return `${T("Live now", "LIVE NOW")} · ${esc(areaName(metaOf(n).area))} · ${T("Walkthrough unlocks", "WALKTHROUGH IN")} <b>${esc(T(TM.niceRelease(n + 1), TM.until(TM.releaseMs(n + 1), now()).toUpperCase()))}</b>${isPixel() ? "" : ` (in <span id="cd">${esc(TM.until(TM.releaseMs(n + 1), now()))}</span>)`}`;
  return `${esc(areaName(metaOf(n).area))} · ${T("From", "FROM")} ${esc(TM.niceRelease(n))} · ${T("Played after its week, so it doesn't count towards your streak", "BONUS LEVEL: NO STREAK")}`;
}

function viewCase(n, justOpened) {
  const c = caseOf(n), m = metaOf(n), st = state(n), live = isLive(n);
  const typing = !RM && !st.started && !st.done && !sess.get("hdh:typed:" + n);
  if (typing) sess.set("hdh:typed:" + n, "1");
  const h1 = `<span class="no">#${n}</span>${esc(m.title)}`;
  const evid = c.evidence.map(ev => evCard(n, ev, {
    locked: !ev.open && !st.r.opened.includes(ev.id) && !st.done,
    cluesUsed: st.clues, just: ev.id === justOpened
  })).join("");
  return header({h1, status: statusFor(n), tab: live ? "week" : "archive"}) + `
  <div class="case">
    <div class="col">
      ${briefHTML(c, typing)}
      <div class="sec"><h2>${T("Evidence locker", "EVIDENCE")}</h2><span>${st.done ? T("Case closed: everything's unlocked.", "ALL UNLOCKED") : T("Two items are open. Each locked one costs a clue.", "2 OPEN · 3 LOCKED")}</span></div>
      ${evid}
    </div>
    <aside class="col"><div class="panel verdict" id="verdict" aria-labelledby="verdictH">${verdictHTML(n)}</div></aside>
  </div>`;
}

function stageHTML(n, which, st) {
  const c = caseOf(n), q = c[which], order = TM.order(n, which, q.options.length);
  const picks = st.r.picks[which], okI = q.options.findIndex(o => o.ok), solved = picks.includes(okI);
  const active = !st.done && st.stage === which;
  const btns = order.map((oi, pos) => {
    const o = q.options[oi], picked = picks.includes(oi);
    const cls = picked ? (o.ok ? " good" : " bad") : (st.done && o.ok ? " good" : (!active ? " dim" : ""));
    const disabled = !active || picked;
    /* every wrong answer you pick keeps its explanation right underneath it, for the rest of the case */
    const why = picked && !o.ok ? `<div class="fb bad" id="why-${which}-${oi}" tabindex="-1"><b>${T("Not that", "MISS!")}</b>${esc(o.why)}</div>` : "";
    return `<button class="opt${cls}" data-pick="${which}:${oi}" ${disabled ? 'aria-disabled="true"' : ""} id="opt-${which}-${pos}"><span class="k">${pos + 1}</span><span>${esc(o.t)}${picked ? `<span class="sr"> (${o.ok ? "right" : "wrong"})</span>` : ""}</span></button>${why}`;
  }).join("");
  let fb = "";
  if (solved) fb = `<div class="fb good" id="fb-${which}" tabindex="-1"><b>${T("Spot on", "CORRECT!")}</b>${esc(q.options[okI].why)}</div>`;
  const num = which === "cause" ? 1 : 2;
  return `<div class="stage"><h3><small>${num} of 2</small>${esc(q.q)}</h3><div class="opts" role="group" aria-label="${esc(q.q)}">${btns}</div>${fb}</div>`;
}

function verdictHTML(n) {
  const st = state(n), c = caseOf(n), m = metaOf(n);
  const meters = `<div class="meters"><span>${T("Clues used", "CLUES")} ${pips(st.clues, 3, "on")}<span class="sr">${st.clues} of 3</span></span><span>${T("Wrong turns", "LIVES LOST")} ${pips(st.wrongs, 3, "x")}<span class="sr">${st.wrongs} of 3</span></span></div>`;
  let top = "";
  if (st.done) {
    const ok = w => c[w].options.find(o => o.ok);
    const live = isLive(n);
    const next = live
      ? `<p class="next">${T("The full walkthrough unlocks", "WALKTHROUGH UNLOCKS")} ${esc(TM.niceRelease(n + 1))}${n < MAXN ? T(", when Case #" + (n + 1) + " drops.", ".") : "."}</p>`
      : `<div class="row"><a class="btn pri" href="#case-${n}/walkthrough">${T("Read the full walkthrough", "WALKTHROUGH")} <span aria-hidden="true">›</span></a></div>`;
    top = `<div class="result ${st.won ? "won" : "lost"}${S.just === n ? " just" : ""}" id="result" tabindex="-1">
      <div class="ph" style="justify-content:center"><h2 id="verdictH">${T("Case closed", "GAME OVER")}</h2></div>
      <div class="big">${st.won ? T("Cracked it", "CRACKED!") : T("Case gone cold", "CASE COLD")}</div>
      <div class="rank">${esc(st.won ? rankOf(st) : T("Out of wrong turns", "NO LIVES LEFT"))}</div>
      <pre class="share" aria-label="Your result, ready to share">${esc(shareText(n))}</pre>
      <div class="row"><button class="btn pri" data-act="share">${T("Share result", "SHARE")}</button><button class="btn" data-act="copy">${T("Copy", "COPY")}</button></div>
      <div class="answers"><p><b>${T("What was wrong", "CAUSE")}</b>${esc(ok("cause").t)}</p><p><b>${T("The fix", "FIX")}</b>${esc(ok("fix").t)}</p></div>
      ${next}
    </div>`;
  } else {
    top = `<div class="ph"><h2 id="verdictH">${T("Your verdict", "YOUR MOVE")}</h2></div>${meters}`;
  }
  const fixPart = st.causeDone || st.done ? stageHTML(n, "fix", st)
    : `<div class="stage"><h3><small>2 of 2</small>${esc(c.fix.q)}</h3><p class="waiting">${T("Crack the cause first, then pick the fix. Three wrong turns and the case goes cold.", "BEAT STAGE 1 TO UNLOCK. 3 MISSES = GAME OVER.")}</p></div>`;
  return top + stageHTML(n, "cause", st) + fixPart + (st.done ? meters.replace('class="meters"', 'class="meters" style="justify-content:center;margin-top:14px"') + wiCard(m.area) : "");
}

function viewWalkthrough(n) {
  const c = caseOf(n), m = metaOf(n), st = state(n);
  const qa = which => {
    const q = c[which], order = TM.order(n, which, q.options.length);
    return `<div class="qa">${order.map(i => { const o = q.options[i]; return `<div class="o${o.ok ? " ok" : ""}"><b>${esc(o.t)}${o.ok ? `<span class="tagok">${T("Right answer", "CORRECT")}</span>` : ""}</b><span>${esc(o.why)}</span></div>`; }).join("")}</div>`;
  };
  return header({h1: `<span class="no">#${n}</span>${esc(m.title)}`, status: `${T("Walkthrough", "WALKTHROUGH")} · ${esc(areaName(m.area))} · ${T("From", "FROM")} ${esc(TM.niceRelease(n))}`, tab: "archive"}) + `
  <section class="panel" style="margin-top:20px" aria-labelledby="whatH"><div class="ph"><h2 id="whatH">${T("What happened", "THE STORY")}</h2></div><p class="wt-what">${esc(c.debrief.what)}</p></section>
  <div class="case">
    <div class="col">
      ${briefHTML(c)}
      <div class="sec"><h2>${T("The evidence, explained", "EVIDENCE")}</h2><span>${T("The lines that matter are highlighted.", "KEY LINES HIGHLIGHTED")}</span></div>
      ${c.evidence.map(ev => evCard(n, ev, {marks: true, note: true})).join("")}
    </div>
    <aside class="col">
      <section class="panel" aria-labelledby="qH"><div class="ph"><h2 id="qH">${T("Every answer, explained", "ANSWERS")}</h2></div>
        <div class="stage"><h3><small>1 of 2</small>${esc(c.cause.q)}</h3>${qa("cause")}</div>
        <div class="stage"><h3><small>2 of 2</small>${esc(c.fix.q)}</h3>${qa("fix")}</div>
      </section>
      <section class="panel" style="margin-top:16px" aria-labelledby="spotH"><div class="ph"><h2 id="spotH">${T("How you'd spot it next time", "TIPS")}</h2></div><ul class="lst">${c.debrief.spot.map(s => `<li>${esc(s)}</li>`).join("")}</ul></section>
      <section class="panel" style="margin-top:16px" aria-labelledby="prevH"><div class="ph"><h2 id="prevH">${T("Stop it happening again", "PREVENT IT")}</h2></div><p style="margin:0">${esc(c.debrief.prevent)}</p></section>
    </aside>
  </div>
  <div class="sec"><h2>${T("Words to know", "WORDS")}</h2></div>
  <div class="words">${c.debrief.words.map(([w, d]) => `<div><b>${esc(w)}</b>${esc(d)}</div>`).join("")}</div>
  <div class="row" style="justify-content:flex-start;margin-top:20px">
    ${st.done ? "" : `<a class="btn" href="#case-${n}">${T("Play this case", "PLAY")}</a>`}
    <a class="btn" href="#archive">${T("Back to the archive", "ARCHIVE")}</a>
  </div>
  <div class="wi-solo">${wiCard(m.area)}</div>`;
}

function statusChip(n) {
  const st = state(n);
  if (isLive(n) && !st.done) return `<span class="st none">${st.started ? T("In progress", "IN PROGRESS") : T("Not played yet", "NEW")}</span>`;
  if (st.done) return st.won ? `<span class="st won">${T("Cracked", "CRACKED")} · ${esc(rankOf(st))}</span>` : `<span class="st lost">${T("Gone cold", "COLD")}</span>`;
  return `<span class="st none">${st.started ? T("In progress", "IN PROGRESS") : T("Not played", "NOT PLAYED")}</span>`;
}
function archiveRows() {
  const top = currentN(), rows = [];
  for (let n = top; n >= 1; n--) {
    if (!released(n)) continue;
    const m = metaOf(n), live = isLive(n), st = state(n);
    const play = `<a class="btn sm${live ? " pri" : ""}" href="#case-${n}">${st.done ? T("Review", "REVIEW") : st.started ? T("Carry on", "CONTINUE") : T("Play", "PLAY")}</a>`;
    const wt = live ? "" : `<a class="btn sm" href="#case-${n}/walkthrough">${T("Walkthrough", "GUIDE")}</a>`;
    rows.push(`<div class="panel ar"><span class="n">#${n}</span><div><b>${esc(m.title)}</b><small>${esc(areaName(m.area))} · ${esc(TM.niceRelease(n).split(",")[0])}${live ? ` · <span class="chip live">${T("Live", "LIVE")}</span>` : ""}</small><div>${statusChip(n)}</div></div><div class="acts">${play}${wt}</div></div>`);
  }
  if (!PREVIEW) {
    const nx = TM.current(now()) + 1;
    if (nx <= MAXN) rows.unshift(`<div class="panel ar soon"><span class="n">#${nx}</span><div><b>${T("Coming up: a " + areaName(metaOf(nx).area) + " case", "NEXT: " + areaName(metaOf(nx).area).toUpperCase())}</b><small>${esc(TM.niceRelease(nx))}</small></div><div class="acts"></div></div>`);
  }
  return rows.join("");
}
function viewArchive() {
  const any = Array.from({length: MAXN}, (_, i) => i + 1).some(released);
  return header({h1: T("Case archive", "ARCHIVE"), status: PREVIEW ? T(`All ${MAXN} cases, newest first.`, "ALL CASES") : T("Every case so far, newest first. Past cases come with a full walkthrough.", "PAST CASES + WALKTHROUGHS"), tab: "archive"}) +
    (any ? `<div class="arch">${archiveRows()}</div>` : `<div class="panel splash"><p>${T("Nothing here yet. The first case drops", "FIRST CASE DROPS")} ${esc(TM.niceRelease(1))}.</p></div>`) +
    (any && !PREVIEW ? `<div class="wi-solo">${wiCard("")}</div>` : "");
}

function howCols() {
  return `<div class="how">
    <div style="--c:var(--cyan)"><b>${T("1 · Read the brief", "1 · THE MISSION")}</b><p>${T("A real-world ticket or alert lands on your desk.", "A TICKET OR ALERT LANDS.")}</p></div>
    <div style="--c:var(--amber)"><b>${T("2 · Dig into the evidence", "2 · FIND CLUES")}</b><p>${T("Two items are open. Each locked one costs a clue.", "2 FREE, 3 COST A CLUE.")}</p></div>
    <div style="--c:var(--green)"><b>${T("3 · Name the cause, pick the fix", "3 · CRACK IT")}</b><p>${T("Three wrong turns and the case goes cold.", "3 MISSES = GAME OVER.")}</p></div>
    <div style="--c:var(--red)"><b>${T("4 · Share, then learn", "4 · SHARE")}</b><p>${T("Post your result. The walkthrough unlocks next Wednesday.", "WALKTHROUGH NEXT WEEK.")}</p></div>
  </div>`;
}
function viewHome() {
  if (PREVIEW) return viewArchive();
  const cur = TM.current(now());
  if (cur === 0) {
    return header({h1: T("A new IT case to crack, every Wednesday", "CRACK A CASE EVERY WEDNESDAY"), status: "", tab: "week"}) +
      `<div class="panel splash"><div class="chip">${T("Case #1", "CASE #1")} · ${esc(areaName(metaOf(1).area))}</div>
        <div class="count" id="cd">${esc(TM.until(TM.releaseMs(1), now()))}</div>
        <p>${T("The first case drops", "FIRST CASE DROPS")} <b>${esc(TM.niceRelease(1))}</b>. ${T("Read the ticket, open the evidence, find the real cause and pick the fix. Helpdesk, networking, Microsoft 365 and security, in rotation.", "")}</p></div>
      <div class="sec"><h2>${T("How it works", "HOW TO PLAY")}</h2></div>${howCols()}`;
  }
  const ln = liveN();
  if (ln) return viewCase(ln);
  return header({h1: T("Season 1 is a wrap", "SEASON 1 CLEAR!"), status: T(`All ${MAXN} cases are in the archive with full walkthroughs. New cases are on the way.`, `ALL ${MAXN} CASES IN THE ARCHIVE.`), tab: "week"}) +
    `<div class="arch">${archiveRows()}</div><div class="wi-solo">${wiCard("")}</div>`;
}

/* ============================================================
   ROUTER + RENDER
   ============================================================ */
function route() {
  const h = location.hash.replace(/^#/, "");
  let mm;
  if (h === "archive") return {v: "archive"};
  if ((mm = h.match(/^case-(\d+)(\/walkthrough)?$/))) {
    const n = +mm[1];
    if (!released(n)) return {v: "home", bounce: true};
    if (mm[2]) return isLive(n) ? {v: "case", n, bounce: true} : {v: "walk", n};
    return {v: "case", n};
  }
  /* the home page shows this week's live case, so it behaves exactly like #case-N */
  if (!PREVIEW) { const ln = liveN(); if (ln) return {v: "case", n: ln, home: true}; }
  return {v: "home"};
}
let lastView = "";
function render(justOpened) {
  const r = route();
  if (r.bounce) history.replaceState(null, "", location.pathname + location.search + (r.v === "case" ? "#case-" + r.n : ""));
  let html;
  if (r.v === "archive") html = viewArchive();
  else if (r.v === "case") html = viewCase(r.n, justOpened);
  else if (r.v === "walk") html = viewWalkthrough(r.n);
  else html = viewHome();
  const key = r.v + (r.n || "");
  if (lastView && lastView !== key) wiOpen = false;
  $("#app").innerHTML = html;
  S.just = 0;
  typeIt();
  document.title = (r.n ? `#${r.n} ${metaOf(r.n).title} · ` : r.v === "archive" ? "Case archive · " : "") + "Hump Day Hack";
  if (S.focus) { const f = document.getElementById(S.focus); S.focus = null; if (f) f.focus({preventScroll: false}); }
  else if (lastView && lastView !== key) { const h1 = $("#pageH"); if (h1) h1.focus({preventScroll: true}); window.scrollTo(0, 0); }
  lastView = key;
  S.cur = TM.current(now()); S.live = liveN();
}
function renderChrome() {
  document.body.setAttribute("data-theme", S.theme);
  const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", S.theme === "light" ? "#eef2f8" : S.theme === "pixel" ? "#0d0620" : "#0a1020");
  $("#howLbl").textContent = T("How to play", "HOW TO PLAY");
  $("#statsLbl").textContent = T("Stats", "STATS");
  $("#themeLbl").textContent = T("Theme", "THEME");
}

/* ============================================================
   ACTIONS
   ============================================================ */
function announce(msg) { const l = $("#live"); l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 30); }
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = msg; $("#toasts").appendChild(d); setTimeout(() => d.remove(), 2700); }
function openEvidence(n, id) {
  const st = state(n); if (st.done) return;
  const ev = caseOf(n).evidence.find(e => e.id === id);
  if (!ev || ev.open || st.r.opened.includes(id)) return;
  const r = st.r; r.opened = r.opened.concat(id); put(n, r);
  S.focus = "ev-" + id;
  render(id);
  announce(`${ev.title} opened. ${3 - state(n).clues} clues left.`);
}
function pick(n, which, oi) {
  const st = state(n);
  if (st.done || st.stage !== which) return;
  const q = caseOf(n)[which], o = q.options[oi];
  if (!o || st.r.picks[which].includes(oi)) return;
  const r = st.r; r.picks = {cause: r.picks.cause.slice(), fix: r.picks.fix.slice()}; r.picks[which].push(oi);
  const after = (() => { put(n, r); return state(n); })();
  if (after.done) { r.live = isLive(n); r.won = after.won; r.at = now(); put(n, r); }
  if (after.done) {
    S.focus = "result";
    announce(after.won ? `Cracked it. ${rankOf(after)}.` : "Case gone cold. Out of wrong turns.");
    if (after.won && isPixel()) toast("LEVEL CLEAR!");
    S.just = n;
    setTimeout(() => burst(after.won ? "win" : "cold"), 120);
  } else if (o.ok) {
    S.focus = "fb-" + which;
    announce(`Right. ${o.why} Now pick the fix.`);
  } else {
    S.focus = `why-${which}-${oi}`;
    announce(`Not that. ${o.why} ${3 - after.wrongs} wrong turns left.`);
  }
  render();
}
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
  try {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok;
  } catch (e) { return false; }
}
async function share(n, forceCopy) {
  const text = shareText(n);
  const touch = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  if (!forceCopy && touch && navigator.share) { try { await navigator.share({text}); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  toast((await copyText(text)) ? T("Copied. Paste it anywhere.", "COPIED!") : T("Couldn't copy. Select the result text instead.", "SELECT TEXT TO COPY"));
}

/* stats: live cases only (the real weekly game), so the archive can be enjoyed without gaming the streak */
function stats() {
  const all = Object.keys(S.data.cases).map(Number).filter(n => caseOf(n)).map(n => ({n, st: state(n), live: !!S.data.cases[n].live}));
  const played = all.filter(x => x.st.done), cracked = played.filter(x => x.st.won);
  const liveWon = new Set(played.filter(x => x.live && x.st.won).map(x => x.n));
  let best = 0, run = 0;
  for (let n = 1; n <= MAXN; n++) { run = liveWon.has(n) ? run + 1 : 0; best = Math.max(best, run); }
  let cur = 0, from = TM.current(now());
  if (from && !liveWon.has(from) && isLive(from)) from -= 1; /* this week's case still has time */
  for (let n = from; n >= 1 && liveWon.has(n); n--) cur++;
  return {played: played.length, cracked: cracked.length, cur, best};
}
function openModal(title, body, firstSel) {
  $("#modal").innerHTML = `<div class="scrim" data-act="close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT"><div class="mh"><span id="mT">${title}</span><button class="iconbtn" data-act="close" aria-label="Close"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div><div class="mb">${body}</div></div></div>`;
  const f = $("#modal " + (firstSel || ".btn.pri")) || $("#modal button"); if (f) f.focus();
}
let modalReturn = null;
function openStats() {
  modalReturn = $("#statsBtn");
  const s = stats();
  openModal(T("Your stats", "STATS"), `<div class="stats">
      <div><b>${s.played}</b><span>${T("Played", "PLAYED")}</span></div>
      <div><b>${s.played ? Math.round(100 * s.cracked / s.played) : 0}%</b><span>${T("Cracked", "CRACKED")}</span></div>
      <div><b>${s.cur}</b><span>${T("Week streak", "STREAK")}</span></div>
      <div><b>${s.best}</b><span>${T("Best streak", "BEST")}</span></div></div>
    <p class="small" style="color:var(--muted);margin-top:14px">${T("Your streak counts cases cracked in the week they went live. Archive cases count towards Played and Cracked, not the streak. Everything is stored in this browser only.", "STREAK = CASES CRACKED IN THEIR WEEK. SAVED IN THIS BROWSER ONLY.")}${PREVIEW ? T(" (Preview mode has its own separate stats.)", "") : ""}</p>
    <div class="row" style="justify-content:flex-start"><button class="btn pri" data-act="close">${T("Done", "OK!")}</button></div>`);
}
function openHow() {
  modalReturn = $("#howBtn");
  openModal(T("How to play", "HOW TO PLAY"), `<ol>
      <li>${T("Every Wednesday at " + nice7() + " UK time a new case goes live: a ticket or alert, like the ones that land on a real service desk or security team.", "NEW CASE EVERY WEDNESDAY, " + nice7().toUpperCase() + " UK TIME.")}</li>
      <li>${T("Two pieces of evidence are open. The other three are locked, and opening one costs a clue. Use as few as you dare.", "2 CLUES FREE. 3 MORE COST YOU.")}</li>
      <li>${T("First name what's actually wrong, then pick the fix. A wrong answer is a wrong turn, and you get three across the whole case.", "NAME THE CAUSE, THEN THE FIX. 3 MISSES = GAME OVER.")}</li>
      <li>${T("Fewer clues and wrong turns means a better rank, from \"Made it, just\" up to Head of IT. Share your result: it never gives away the answer.", "FEWER CLUES = HIGHER RANK.")}</li>
      <li>${T("When the next case drops, last week's moves to the archive with a full walkthrough: every clue explained and every wrong answer too.", "LAST WEEK'S CASE GETS A WALKTHROUGH.")}</li>
    </ol>
    <p style="color:var(--muted)">${T("Keyboard: press 1 to 4 to choose an answer, T to change the theme.", "KEYS: 1-4 TO ANSWER, T FOR THEME.")}</p>
    <div class="row" style="justify-content:flex-start"><button class="btn pri" data-act="close">${T("Let's go", "START")}</button></div>`);
}
function closeModal() { if (!$("#modal").innerHTML) return; $("#modal").innerHTML = ""; if (modalReturn) modalReturn.focus(); modalReturn = null; }
function closeMenus() { if ($("#themeMenu").innerHTML) { $("#themeMenu").innerHTML = ""; $("#themeBtn").setAttribute("aria-expanded", "false"); } }
function themeMenu() {
  if ($("#themeMenu").innerHTML) return closeMenus();
  $("#themeMenu").innerHTML = `<div class="menu" role="menu">${THEMES.map(([k, l, c]) => `<button role="menuitemradio" aria-checked="${S.theme === k}" data-theme-set="${k}"><span class="sw" style="background:${c}"></span>${l}${S.theme === k ? " ✓" : ""}</button>`).join("")}</div>`;
  $("#themeBtn").setAttribute("aria-expanded", "true");
  const on = $('#themeMenu [aria-checked="true"]'); if (on) on.focus();
}
function setTheme(k) {
  S.theme = k; store.set(K.theme, k); closeMenus(); renderChrome(); render();
  if (k === "pixel") toast("INSERT COIN · PIXEL MODE");
  $("#themeBtn").focus();
}

document.addEventListener("click", e => {
  if (!e.target.closest(".dd")) closeMenus();
  const t = e.target.closest("[data-open],[data-pick],[data-act],[data-theme-set]");
  if (!t) return;
  const r = route();
  if (t.dataset.themeSet) return setTheme(t.dataset.themeSet);
  if (t.dataset.open && r.v === "case") return openEvidence(r.n, t.dataset.open);
  if (t.dataset.pick && r.v === "case") { if (t.getAttribute("aria-disabled") === "true") return; const [w, i] = t.dataset.pick.split(":"); return pick(r.n, w, +i); }
  const a = t.dataset.act;
  if (a === "close" && (e.target === t || t.tagName === "BUTTON")) return closeModal();
  if (a === "wi") return toggleWi(t);
  if (a === "share" && r.n) return share(r.n, false);
  if (a === "copy" && r.n) return share(r.n, true);
  if (a === "endPreview") { sess.set("hdh:preview", null); location.hash = ""; location.reload(); }
});
$("#themeBtn").onclick = themeMenu;
$("#statsBtn").onclick = openStats;
$("#howBtn").onclick = openHow;
window.addEventListener("hashchange", () => { closeModal(); render(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeMenus(); closeModal(); return; }
  if ($("#themeMenu").innerHTML && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    const items = [...document.querySelectorAll("#themeMenu button")], i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
    return;
  }
  if ($("#modal").innerHTML) {
    if (e.key === "Tab") { const f = [...document.querySelectorAll("#modal button")]; if (f.length) { const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); } }
    return;
  }
  const tg = (e.target.tagName || "").toUpperCase();
  if (tg === "INPUT" || tg === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.toLowerCase() === "t") { const i = THEMES.findIndex(x => x[0] === S.theme); return setTheme(THEMES[(i + 1) % THEMES.length][0]); }
  if (/^[1-4]$/.test(e.key)) {
    const r = route(); if (r.v !== "case") return;
    const st = state(r.n); if (st.done) return;
    const b = document.getElementById(`opt-${st.stage}-${+e.key - 1}`);
    if (b && b.getAttribute("aria-disabled") !== "true") { e.preventDefault(); b.click(); }
  }
});

/* keep countdowns fresh, and switch to the new case the moment it drops (Wednesday 7am) */
setInterval(() => {
  if (TM.current(now()) !== S.cur || liveN() !== S.live) { if (!$("#modal").innerHTML) render(); return; }
  const cd = $("#cd"); if (!cd) return;
  const r = route(), target = r.v === "home" && S.cur === 0 ? TM.releaseMs(1) : r.n ? TM.releaseMs(r.n + 1) : TM.releaseMs((S.live || S.cur) + 1);
  cd.textContent = TM.until(target, now());
}, 20000);

/* ============================================================
   BOOT
   ============================================================ */
renderChrome();
render();
window.HUMPDAYHACK = Object.freeze({name: "Hump Day Hack", author: "Dean Baker", copyright: "© 2026 Dean Baker. All rights reserved."});
window.__hdh = {S, state, shareText, stats, setTheme, isLive, released, route, render, preview: PREVIEW};
try { console.log("%cHUMP DAY %cHACK%c  by Dean Baker · © 2026", "font:700 14px monospace;color:#6ea8ff", "font:italic 700 14px monospace;color:#ff5a6e", "font:12px monospace;color:#8193b2"); } catch (e) {}
})();
