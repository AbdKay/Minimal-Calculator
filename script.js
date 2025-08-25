const display = document.getElementById("display");
const keys = document.querySelector(".keys");
const themeToggle = document.getElementById("themeToggle");
const copyBtn = document.getElementById("copy");
const backspaceBtn = document.getElementById("backspace");

let expr = ""; // current expression string
let justEvaluated = false;

// --- Helpers ---
const isOperator = (ch) => /[+\-*/]/.test(ch);
const lastChar = () => expr.slice(-1);

// sanitize (allow digits, operators, dot, parentheses are not used here)
function sanitize(s) {
  return s.replace(/[^0-9+\-*/%.]/g, "");
}

// Prevent multiple operators in a row (except allowing change like "5 * - 3" not supported in minimal calc)
function pushChar(ch) {
  if (justEvaluated && /[0-9.]/.test(ch)) {
    // start new expression after result if typing a number
    expr = "";
    justEvaluated = false;
  }

  if (ch === ".") {
    // avoid two decimals in the current number segment
    const seg = currentNumberSegment();
    if (seg.includes(".")) return;
  }

  if (isOperator(ch)) {
    if (expr === "" && ch !== "-") return; // don't start with operator except minus
    if (isOperator(lastChar())) {
      // replace operator
      expr = expr.slice(0, -1) + ch;
      render();
      return;
    }
    justEvaluated = false;
  }

  expr += ch;
  render();
}

function currentNumberSegment() {
  const match = expr.match(/(\d+\.?\d*|\.\d+)?$/);
  return match ? match[0] : "";
}

function clearAll() {
  expr = "";
  justEvaluated = false;
  render();
}

function backspace() {
  if (!expr) return;
  expr = expr.slice(0, -1);
  render();
}

function toggleSign() {
  // apply to last number segment
  const seg = currentNumberSegment();
  if (!seg) return;
  const start = expr.length - seg.length;
  if (seg.startsWith("-")) {
    expr = expr.slice(0, start) + seg.slice(1);
  } else {
    expr = expr.slice(0, start) + "-" + seg;
  }
  render();
}

function applyPercent() {
  // Convert last number to its percent (divide by 100)
  const seg = currentNumberSegment();
  if (!seg) return;
  const start = expr.length - seg.length;
  const num = parseFloat(seg);
  if (isNaN(num)) return;
  const val = (num / 100).toString();
  expr = expr.slice(0, start) + val;
  render();
}

function evaluate() {
  if (!expr) return;
  // Clean trailing operator
  if (isOperator(lastChar())) expr = expr.slice(0, -1);

  const safe = sanitize(expr);

  // Replace '÷' '×' just in case from user keyboard (we store operators as / and *)
  try {
    // Avoid eval security pitfalls by constructing only arithmetic
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${safe})`)();
    if (result === Infinity || Number.isNaN(result)) return;

    expr = (Math.round(result * 1e12) / 1e12).toString(); // trim float noise
    justEvaluated = true;
    render();
  } catch {
    // Optionally show an error flash
  }
}

function render() {
  display.value = expr || "0";
}

// --- UI bindings ---
keys.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn");
  if (!btn) return;

  const key = btn.dataset.key;
  const action = btn.dataset.action;

  if (key) pushChar(key);
  else if (action === "clear") clearAll();
  else if (action === "equals") evaluate();
  else if (action === "percent") applyPercent();
  else if (action === "sign") toggleSign();
});

backspaceBtn.addEventListener("click", backspace);

copyBtn.addEventListener("click", async () => {
  const text = display.value;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add("ok");
    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => {
      copyBtn.classList.remove("ok");
      copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
    }, 900);
  } catch {}
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const icon = themeToggle.querySelector("i");
  icon.className = document.body.classList.contains("light")
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
});

// --- Keyboard support ---
document.addEventListener("keydown", (e) => {
  const { key } = e;

  if (/[0-9]/.test(key)) return pushChar(key);
  if (key === ".") return pushChar(".");
  if (key === "+" || key === "-" || key === "*" || key === "/")
    return pushChar(key);
  if (key === "Enter" || key === "=") {
    e.preventDefault();
    return evaluate();
  }
  if (key === "Backspace") return backspace();
  if (key.toLowerCase() === "c") return clearAll();
  if (key === "%") return applyPercent();
});

// initial
render();
