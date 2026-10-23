/* =====================================================
   STEELHAWK Command – script.js
   WS 301 Performance Task: Form Validation
   Concepts used (Topics 6-11):
     addEventListener · submit event · Event object · preventDefault
     trim() · validation · per-field error messages
     classList.add / remove / toggle · data-* + dataset
     attribute manipulation (type, placeholder, max, data-branch, disabled)
   ===================================================== */
"use strict";

/* ---------- 0. ELEMENT REFERENCES ---------- */
const form        = document.getElementById("enlistForm");
const successBox  = document.getElementById("successBox");
const successText = document.getElementById("successText");
const submitBtn   = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const progressTxt = document.getElementById("progressText");
const checkItems  = document.querySelectorAll("#checkList li");
const modal       = document.getElementById("modal");
const toastBox    = document.getElementById("toasts");
const bodyEl      = document.body;

// Every element that carries data-validate is a field we must check.
// The VALUE of data-validate (read with dataset) picks the validator.
const fields = Array.from(form.querySelectorAll("[data-validate]"))
  .filter(el => el.dataset.validate !== "none");

/* Small helpers ---------------------------------------------------- */
const $ = (id) => document.getElementById(id);

// Each field's key links it to its error <span data-for="key"> and checklist item.
function fieldKey(el) {
  if (el.id === "genderGroup") return "gender";
  return el.name || el.id;
}
function errorSpan(el) {
  return form.querySelector('.error-msg[data-for="' + fieldKey(el) + '"]');
}

/* ---------- 1. VALIDATION RULES ---------- */
// Each rule gets the (already trimmed) value and returns an error text, or "" if OK.
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const PHONE_RE   = /^(09|\+639)\d{9}$/;           // 09XXXXXXXXX or +639XXXXXXXXX
const SERVICE_RE = /^SH-\d{6}$/;
const NAME_RE    = /^[A-Za-z][A-Za-z.'\- ]*$/;

function calcAge(dobString) {
  const dob = new Date(dobString + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const rules = {
  serviceId(v) {
    if (!v) return "Service ID is required.";
    if (!SERVICE_RE.test(v.toUpperCase())) return "Service ID must look like SH-123456 (SH- plus 6 digits).";
    return "";
  },
  fullName(v) {
    if (!v) return "Full name is required.";
    if (v.length < 5) return "Full name is too short. Enter your first and last name.";
    if (!NAME_RE.test(v)) return "Name may only contain letters, spaces, periods, apostrophes and hyphens.";
    if (v.split(/\s+/).length < 2) return "Please enter both your first name and last name.";
    return "";
  },
  callsign(v) {                                   // optional field
    if (!v) return "";
    if (!/^[A-Za-z0-9]{3,12}$/.test(v)) return "Call sign must be 3-12 letters or numbers with no spaces.";
    return "";
  },
  dob(v) {
    if (!v) return "Date of birth is required.";
    const dob = new Date(v + "T00:00:00");
    if (isNaN(dob.getTime())) return "Enter a valid date of birth.";
    if (dob > new Date()) return "Date of birth cannot be in the future.";
    const age = calcAge(v);
    if (age < 17) return "You are " + age + ". Applicants must be at least 17 years old.";
    if (age > 40) return "You are " + age + ". Applicants must be 40 years old or younger.";
    return "";
  },
  email(v) {
    if (!v) return "Email address is required.";
    if (!EMAIL_RE.test(v)) return "Enter a valid email such as recruit@steelhawk.mil.";
    return "";
  },
  phone(v) {
    if (!v) return "Phone number is required.";
    const clean = v.replace(/[\s-]/g, "");
    if (!PHONE_RE.test(clean)) return "Use a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.";
    return "";
  },
  address(v) {
    if (!v) return "Home address is required.";
    if (v.length < 10) return "Address is too short (" + v.length + "/10). Include street, barangay and city.";
    return "";
  },
  password(v) {
    if (!v) return "Password is required.";
    if (v.length < 8) return "Password needs at least 8 characters.";
    if (!/[A-Z]/.test(v)) return "Password needs at least one UPPERCASE letter.";
    if (!/[a-z]/.test(v)) return "Password needs at least one lowercase letter.";
    if (!/\d/.test(v))    return "Password needs at least one number.";
    if (!/[^A-Za-z0-9]/.test(v)) return "Password needs at least one symbol (e.g. ! @ # $).";
    return "";
  },
  confirm(v) {
    if (!v) return "Please confirm your password.";
    if (v !== $("password").value) return "Passwords do not match.";
    return "";
  }
};

/* Validate ONE field. Returns true when valid. */
function validateField(el, show = true) {
  const type = el.dataset.validate;      // dataset -> data-validate
  const label = el.dataset.label;        // dataset -> data-label
  let msg = "";

  if (type === "gender") {
    if (!form.querySelector('input[name="gender"]:checked')) msg = "Please select a gender.";
  } else if (type === "select") {
    if (!el.value) msg = "Please select a " + label.toLowerCase() + ".";
  } else if (type === "agree") {
    if (!el.checked) msg = "You must accept the agreement before enlisting.";
  } else {
    // trim() removes unnecessary spaces at both ends
    const trimmed = el.value.trim();
    if (show && el.value !== trimmed) el.value = trimmed;
    if (show && type === "serviceId") el.value = el.value.toUpperCase();
    msg = rules[type](type === "serviceId" ? trimmed.toUpperCase() : trimmed);
  }

  if (show) (msg ? showError(el, msg) : clearError(el, true));
  return msg === "";
}

/* ---------- 2. ERROR DISPLAY (CSS class manipulation) ---------- */
function showError(el, msg) {
  const span = errorSpan(el);
  el.classList.add("error");              // classList.add -> red highlight
  el.classList.remove("valid");
  el.setAttribute("aria-invalid", "true");// attribute manipulation (accessibility)
  if (span) { span.textContent = msg; span.classList.add("show"); }
}
function clearError(el, markValid) {
  const span = errorSpan(el);
  el.classList.remove("error");           // classList.remove -> corrected
  el.removeAttribute("aria-invalid");
  if (markValid && el.value !== "" && el.type !== "checkbox") el.classList.add("valid");
  else el.classList.remove("valid");
  if (span) { span.textContent = ""; span.classList.remove("show"); }
}

/* ---------- 3. TOASTS & TIPS ---------- */
function toast(message, kind) {
  const t = document.createElement("div");
  t.className = "toast" + (kind === "error" ? " error-t" : kind === "ok" ? " ok-t" : "");
  t.textContent = message;
  toastBox.appendChild(t);
  setTimeout(() => {
    t.classList.add("leave");
    setTimeout(() => t.remove(), 320);
  }, 3200);
}

const tips = {
  serviceId: "Your Service ID is printed on your recruitment slip: SH- plus six digits.",
  fullName: "Use your legal name exactly as on your government ID.",
  callsign: "Pick a short radio nickname. Leave blank if you do not have one yet.",
  dob: "We verify age. Recruits must be between 17 and 40 years old.",
  gender: "Select one option. This is used only for barracks assignment.",
  bloodType: "Blood type is printed on your ID and used by field medics.",
  email: "Your recruiter will send your reporting orders here.",
  phone: "Philippine mobile only. Example: 09171234567.",
  address: "Include house number, street, barangay, city and province.",
  program: "Choosing a branch changes the theme, ID card and unit examples.",
  yearLevel: "Level 1 is for first-time recruits. Officer candidates start at Level 4.",
  password: "Mix uppercase, lowercase, numbers and symbols for an ELITE rating.",
  confirmPassword: "Type the same password again so we can make sure it matches.",
  agree: "You must accept the Code of Conduct to continue."
};

/* ---------- 4. LIVE PREVIEW (ID card) ---------- */
const branchInfo = {
  army:     { name: "Army",          icon: "🪖", code: "ARM", motto: "Strength on the Ground",  hint: "e.g. 3rd Infantry Battalion" },
  navy:     { name: "Navy",          icon: "⚓", code: "NAV", motto: "Masters of the Sea",       hint: "e.g. Destroyer Squadron 5" },
  airforce: { name: "Air Force",     icon: "✈️", code: "AIR", motto: "Dominate the Skies",       hint: "e.g. 12th Fighter Wing" },
  marines:  { name: "Marines",       icon: "🦅", code: "MAR", motto: "First to Fight",           hint: "e.g. 1st Amphibious Brigade" },
  cyber:    { name: "Cyber Command", icon: "🛰️", code: "CYB", motto: "Defend the Digital Front", hint: "e.g. Network Defense Cell 9" },
  special:  { name: "Special Ops",   icon: "🎯", code: "SPC", motto: "Unseen. Unmatched.",       hint: "e.g. Task Force Black Talon" }
};

function setText(id, value, fallback) {
  const node = $(id);
  if (node) node.textContent = value && value.trim() !== "" ? value : fallback;
}

function updatePreview() {
  setText("pvName",  $("fullName").value.trim(),  "— — —");
  setText("pvId",    $("serviceId").value.trim(), "SH-——————");
  setText("pvCall",  $("callsign").value.trim().toUpperCase(), "—");
  setText("pvLevel", $("yearLevel").value, "—");
  setText("pvBlood", $("bloodType").value, "—");
  setText("pvPhone", $("phone").value.trim(), "—");
  setText("pvEmail", $("email").value.trim(), "—");

  const dob = $("dob").value;
  setText("pvAge", dob && !isNaN(new Date(dob)) ? calcAge(dob) + " yrs" : "", "—");

  const b = branchInfo[$("program").value];
  setText("pvBranch", b ? b.name : "", "Unassigned");
}

/* ---------- 5. BRANCH SELECTION (attribute manipulation) ---------- */
function applyBranch(key) {
  const b = branchInfo[key];
  if (!b) return;
  bodyEl.setAttribute("data-branch", key);                 // changes accent color via CSS
  $("unit").setAttribute("placeholder", b.hint);           // meaningful placeholder change
  $("unitHint").textContent = "Suggested for " + b.name + ": " + b.hint.replace("e.g. ", "");
  $("pvEmblem").textContent = b.icon;
  $("pvMotto").textContent = b.motto;

  document.querySelectorAll(".branch-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.branch === key);   // toggle with a condition
  });

  const idCard = $("idCard");
  idCard.classList.add("pop");
  setTimeout(() => idCard.classList.remove("pop"), 450);
}

document.querySelectorAll(".branch-card").forEach(card => {
  card.addEventListener("click", function (event) {
    // event.currentTarget is the card; dataset reads data-branch / data-branch-name
    const key = event.currentTarget.dataset.branch;
    const select = $("program");
    select.value = key;
    applyBranch(key);
    validateIfTouched(select, true);
    updatePreview();
    updateProgress();
    toast("Branch selected: " + event.currentTarget.dataset.branchName + " — " + event.currentTarget.dataset.motto, "ok");
  });
});

$("program").addEventListener("change", function (event) {
  if (event.target.value) applyBranch(event.target.value);
});

/* ---------- 6. SHOW / HIDE PASSWORD (classList.toggle + attribute) ---------- */
document.querySelectorAll(".eye-btn").forEach(btn => {
  btn.addEventListener("click", function (event) {
    const button = event.currentTarget;
    const input = $(button.dataset.target);                 // data-target
    const showing = button.classList.toggle("active");      // classList.toggle
    input.setAttribute("type", showing ? "text" : "password"); // attribute manipulation
    button.textContent = showing ? button.dataset.showIcon : button.dataset.hideIcon;
    button.setAttribute("aria-pressed", String(showing));
    input.focus();
  });
});

/* ---------- 7. PASSWORD STRENGTH + MATCH INDICATOR ---------- */
function updateStrength() {
  const v = $("password").value;
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const levels = [
    { w: "0%",   c: "transparent", t: "Min 8 chars with upper, lower, number & symbol" },
    { w: "20%",  c: "#ff5a5a",     t: "Strength: VERY WEAK" },
    { w: "40%",  c: "#ff9a4a",     t: "Strength: WEAK" },
    { w: "60%",  c: "#ffd34a",     t: "Strength: FAIR" },
    { w: "80%",  c: "#9be04b",     t: "Strength: STRONG" },
    { w: "100%", c: "#4be08a",     t: "Strength: ELITE 🎖️" }
  ];
  const lv = v ? levels[Math.max(1, score)] : levels[0];
  $("strengthBar").style.width = lv.w;
  $("strengthBar").style.background = lv.c;
  $("strengthText").textContent = lv.t;
}

function updateMatch() {
  const p = $("password").value, c = $("confirmPassword").value;
  const node = $("matchText");
  if (!c) { node.textContent = "Must match the password above"; node.style.color = ""; return; }
  if (p === c) { node.textContent = "✔ Passwords match"; node.style.color = "var(--ok)"; }
  else { node.textContent = "✖ Passwords do not match yet"; node.style.color = "var(--danger)"; }
}

/* ---------- 8. PROGRESS + CHECKLIST ---------- */
// Fields that are required for 100% completion
const requiredKeys = ["serviceId","fullName","dob","gender","bloodType","email","phone","address","program","yearLevel","password","confirmPassword","agree"];

function updateProgress() {
  let done = 0;
  fields.forEach(el => {
    const key = fieldKey(el);
    if (!requiredKeys.includes(key)) return;
    const ok = validateField(el, false);                 // silent check
    const li = document.querySelector('#checkList li[data-check="' + key + '"]');
    if (ok) done++;
    if (li) {
      li.classList.toggle("done", ok);
      li.classList.toggle("bad", !ok && el.classList.contains("error"));
    }
  });
  const pct = Math.round((done / requiredKeys.length) * 100);
  progressBar.style.width = pct + "%";
  progressTxt.textContent = pct + "%";
}

/* ---------- 9. LIVE EVENTS (Event object + delegation) ---------- */
// A field only shows errors after the user has left it once ("touched"),
// but once an error exists it re-checks on every keystroke so it clears instantly.
function validateIfTouched(el, force) {
  if (force || el.dataset.touched === "yes" || el.classList.contains("error")) {
    validateField(el, true);
  }
}

form.addEventListener("focusin", function (event) {
  const el = event.target.closest("[data-validate]") || event.target;
  const key = el.name || el.id;
  if (tips[key]) $("tipText").textContent = "💡 " + tips[key];
});

form.addEventListener("focusout", function (event) {
  const el = event.target.closest("[data-validate]");
  if (!el || el.dataset.validate === "none") return;
  el.dataset.touched = "yes";                              // write a data-* value
  validateField(el, true);
  updateProgress();
});

function handleLive(event) {
  const t = event.target;
  // Radio buttons live inside the gender group
  const el = t.name === "gender" ? $("genderGroup") : t;
  if (!el.dataset || !el.dataset.validate) { updatePreview(); return; }
  if (t.name === "gender" || el.dataset.validate === "select" || el.type === "checkbox" || el.type === "date") {
    el.dataset.touched = "yes";
    validateField(el, true);
  } else {
    validateIfTouched(el, false);
  }
  if (el.id === "password") {
    updateStrength();
    if ($("confirmPassword").value) validateField($("confirmPassword"), true);
    updateMatch();
  }
  if (el.id === "confirmPassword") updateMatch();
  if (el.id === "address") updateCounter();
  updatePreview();
  updateProgress();
}
form.addEventListener("input", handleLive);
form.addEventListener("change", handleLive);

function updateCounter() {
  const a = $("address");
  const c = $("addrCounter");
  c.textContent = a.value.length + " / " + a.getAttribute("maxlength");
  c.classList.toggle("near", a.value.length >= 130);
}

/* ---------- 10. FORM SUBMISSION ---------- */
form.addEventListener("submit", function (event) {
  event.preventDefault();               // never let the page reload / submit when invalid
  successBox.classList.add("hidden");

  let firstInvalid = null;
  let errorCount = 0;

  fields.forEach(el => {
    el.dataset.touched = "yes";
    const ok = validateField(el, true); // shows a SPECIFIC message under each bad field
    if (!ok) {
      errorCount++;
      if (!firstInvalid) firstInvalid = el;
    }
  });
  updatePreview();
  updateProgress();

  if (errorCount > 0) {
    // Failure path: no success message
    form.classList.remove("shake");
    void form.offsetWidth;              // restart animation
    form.classList.add("shake");
    const focusTarget = firstInvalid.id === "genderGroup"
      ? form.querySelector('input[name="gender"]')
      : firstInvalid;
    focusTarget.focus();
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    toast("❌ " + errorCount + " field" + (errorCount > 1 ? "s need" : " needs") + " correction.", "error");
    return;
  }

  // Success path: every field is valid
  submitBtn.disabled = true;                              // attribute manipulation
  submitBtn.textContent = "⏳ Transmitting to Command...";

  setTimeout(function () {
    const name = $("fullName").value.trim();
    const branchKey = $("program").value;
    const b = branchInfo[branchKey];
    const number = "SH26-" + b.code + "-" + String(Math.floor(1000 + Math.random() * 9000));

    // remove any leftover validation errors/styling
    fields.forEach(el => clearError(el, false));

    successText.textContent = "Welcome, " + name + "! You are now registered with the " + b.name +
      " as a " + $("yearLevel").value.split(" - ")[0] + " recruit. Enlistment No. " + number + ".";
    successBox.classList.remove("hidden");
    $("modalMsg").textContent = name + ", your enlistment has been received by STEELHAWK Command. A recruiter will contact you at " + $("email").value.trim() + ".";
    $("ticketNo").textContent = number;
    modal.classList.remove("hidden");

    submitBtn.disabled = false;
    submitBtn.textContent = "🚀 Submit Enlistment";
    launchConfetti();
    toast("✅ Registration successful!", "ok");
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 700);
});

/* ---------- 11. RESET ---------- */
form.addEventListener("reset", function () {
  // The browser clears values AFTER this event, so wait one tick.
  setTimeout(function () {
    fields.forEach(el => {
      clearError(el, false);
      delete el.dataset.touched;
    });
    successBox.classList.add("hidden");
    modal.classList.add("hidden");

    // return password fields to their original type/icons
    document.querySelectorAll(".eye-btn").forEach(btn => {
      btn.classList.remove("active");
      $(btn.dataset.target).setAttribute("type", "password");
      btn.textContent = btn.dataset.hideIcon;
    });

    $("tipText").textContent = "Tip: Click any field to see guidance here.";
    $("unit").setAttribute("placeholder", "e.g. 3rd Infantry Battalion");
    $("unitHint").textContent = "Placeholder changes with your selected branch.";
    applyBranch("army");
    document.querySelectorAll(".branch-card").forEach(c => c.classList.toggle("selected", c.dataset.branch === "army"));
    updateStrength(); updateMatch(); updateCounter(); updatePreview(); updateProgress();
    checkItems.forEach(li => li.classList.remove("done", "bad"));
    toast("♻️ Form reset to its original state.");
  }, 0);
});

/* ---------- 12. MODAL ---------- */
$("closeModal").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.add("hidden"); });
$("copyBtn").addEventListener("click", function () {
  const text = $("ticketNo").textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast("📋 Copied " + text, "ok"), () => toast("Copy failed. Select the number manually.", "error"));
  } else {
    toast("Clipboard not supported in this browser.", "error");
  }
});

/* ---------- 13. THEME, CLOCK, SCROLL, COUNTERS ---------- */
$("themeBtn").addEventListener("click", function () {
  const desert = bodyEl.classList.toggle("desert");        // classList.toggle
  bodyEl.setAttribute("data-theme-mode", desert ? "desert" : "night");
  this.textContent = desert ? "☀️" : "🌙";
  toast(desert ? "Desert mode enabled" : "Night ops mode enabled");
});

function tickClock() {
  const d = new Date();
  $("clock").textContent = d.toLocaleTimeString("en-GB", { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);

const toTop = $("toTop");
window.addEventListener("scroll", () => toTop.classList.toggle("hidden", window.scrollY < 500));
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

function animateCounters() {
  document.querySelectorAll("[data-count]").forEach(el => {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const dur = 1600;
    (function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  });
}

/* Confetti */
function launchConfetti() {
  const colors = ["#b7d44a", "#ffd34a", "#4aa8ff", "#ff6a4a", "#c58bff", "#39ffb0"];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2 + Math.random() * 2.5 + "s";
    c.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5500);
  }
}

/* ---------- 14. RADAR BACKGROUND ---------- */
(function radar() {
  const canvas = $("radarCanvas");
  const ctx = canvas.getContext("2d");
  let w, h, angle = 0;
  const blips = Array.from({ length: 9 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 0.45 + 0.1, life: 0 }));

  function resize() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
  resize();
  addEventListener("resize", resize);

  function accentColor() {
    return getComputedStyle(bodyEl).getPropertyValue("--accent").trim() || "#b7d44a";
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.78, cy = h * 0.35, R = Math.min(w, h) * 0.55;
    const col = accentColor();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.18; ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

    // sweeping beam
    angle += 0.012;
    const grad = ctx.createConicGradient ? ctx.createConicGradient(angle - 0.8, cx, cy) : null;
    if (grad) {
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.12, col);
      grad.addColorStop(0.125, "transparent");
      ctx.globalAlpha = 0.35; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R); ctx.stroke();

    // blips light up when the beam passes
    blips.forEach(b => {
      const diff = Math.abs(((angle - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2));
      if (diff < 0.05) b.life = 1;
      if (b.life > 0) {
        ctx.globalAlpha = b.life; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx + Math.cos(b.a) * R * b.r * 2, cy + Math.sin(b.a) * R * b.r * 2, 4, 0, Math.PI * 2); ctx.fill();
        b.life -= 0.006;
      }
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---------- 15. INITIAL SETUP ---------- */
(function init() {
  // Limit the date picker with attributes: nobody born in the future
  const today = new Date().toISOString().split("T")[0];
  $("dob").setAttribute("max", today);
  applyBranch("army");
  $("program").value = "";     // keep dropdown empty until the user chooses
  updateStrength(); updateMatch(); updateCounter(); updatePreview(); updateProgress();
  animateCounters();
})();
