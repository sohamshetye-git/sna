// Configuration (API key is securely loaded by server from config.json or environment)
const GEMINI_API_KEY = "";
const GEMINI_MODEL = "gemini-2.5-flash";

// Global State
let executionCounter = 0;
let currentAiCell = null;
let currentAiMode = "generate"; // 'generate', 'fix', 'debug', 'optimize'

// Cell action toolbar HTML template
const toolbarHTML = `
  <button class="cell-tool-btn ai-sparkle" title="✨ Gemini AI (Generate, Fix, Debug)" data-action="ai-assist">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
    </svg>
  </button>
  <button class="cell-tool-btn" title="Duplicate cell" data-action="duplicate">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="8" y="8" width="12" height="12" rx="1.5"></rect>
      <path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v9A1.5 1.5 0 0 0 5.5 15.5H8"></path>
    </svg>
  </button>
  <button class="cell-tool-btn" title="Move cell up" data-action="move-up">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  </button>
  <button class="cell-tool-btn" title="Move cell down" data-action="move-down">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
  </button>
  <button class="cell-tool-btn" title="Insert cell above" data-action="insert-above">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M19 15v4H5v-4H3v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2zm-6-2.67l2.59-2.58L17 11.17l-5 5-5-5 1.41-1.42L11 12.33V3h2v9.33z"/>
    </svg>
  </button>
  <button class="cell-tool-btn" title="Insert cell below" data-action="insert-below">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M5 9V5h14v4h2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4h2zm6 2.67l-2.59 2.58L7 12.83l5-5 5 5-1.41 1.42L13 11.67V21h-2v-9.33z"/>
    </svg>
  </button>
  <button class="cell-tool-btn" title="Delete cell" data-action="delete">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  </button>
`;

// Gemini AI Assistant Drawer HTML Template
function buildAiDrawerHTML(cellCode = "", errorText = "") {
  return `
    <div class="jp-ai-drawer">
      <div class="ai-drawer-header">
        <div class="ai-drawer-title">
          <span class="ai-sparkle-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
            </svg>
          </span>
          <span>Gemini AI Assistant</span>
          <span class="ai-model-tag">gemini-2.5-flash</span>
        </div>
        <button class="ai-drawer-close" title="Close AI Panel" data-action="close-ai">&times;</button>
      </div>

      <!-- Mode Tabs -->
      <div class="ai-mode-tabs">
        <button class="ai-tab-btn active" data-mode="generate">💡 Generate Code</button>
        <button class="ai-tab-btn" data-mode="fix">🛠️ Fix & Solve Error</button>
        <button class="ai-tab-btn" data-mode="debug">🔍 Describe & Debug</button>
        <button class="ai-tab-btn" data-mode="optimize">⚡ Optimize</button>
      </div>

      <!-- Code snapshot banner (if cell has code) -->
      ${cellCode ? `
        <div class="ai-cell-preview">
          <span>Active cell code: <code>${escapeHtml(cellCode.length > 60 ? cellCode.slice(0, 60) + '...' : cellCode)}</code></span>
          <span>(${cellCode.split('\n').length} lines)</span>
        </div>
      ` : ''}

      <!-- Prompt Input -->
      <div class="ai-prompt-section">
        <textarea class="ai-prompt-textarea" placeholder="Type prompt (e.g., 'Generate python code to train random forest on iris dataset')..."></textarea>

        <!-- Suggestion Chips -->
        <div class="ai-chips-row">
          <span class="ai-chip" data-prompt="Load CSV with pandas, clean missing values, and display summary stats">📊 Pandas Data Clean</span>
          <span class="ai-chip" data-prompt="Train Logistic Regression classifier with sklearn and print accuracy">🤖 Sklearn Model</span>
          <span class="ai-chip" data-prompt="Plot multi-series line chart with matplotlib and grid styling">📈 Matplotlib Chart</span>
          <span class="ai-chip" data-prompt="Fix and solve any syntax, type, or index errors in this cell">🛠️ Fix My Code</span>
        </div>

        <div class="ai-action-row">
          <span class="ai-hint">Press <kbd>Ctrl+Enter</kbd> to submit</span>
          <button class="btn-ai-generate">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
            </svg>
            <span class="btn-label">Generate Code</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="ai-loading-state">
        <div class="ai-spinner"></div>
        <span class="ai-loading-msg">Gemini 2.5 Flash is analyzing and writing code...</span>
      </div>

      <!-- Response Area -->
      <div class="ai-response-container">
        <!-- Rendered Explanation -->
        <div class="ai-explanation-box" style="display: none;"></div>

        <!-- Generated Code Block -->
        <div class="ai-code-block" style="display: none;">
          <div class="ai-code-header">
            <span>PYTHON</span>
            <div class="ai-code-actions">
              <button class="btn-code-action" data-action="copy-code" title="Copy code">📋 Copy</button>
              <button class="btn-code-action" data-action="insert-below" title="Insert as new cell below">➕ Insert Below</button>
              <button class="btn-code-action primary" data-action="apply-cell" title="Replace active cell content">📥 Apply to Cell</button>
              <button class="btn-code-action run-btn" data-action="apply-run" title="Apply to cell and run immediately">▶️ Apply & Run</button>
            </div>
          </div>
          <pre class="ai-code-pre"><code></code></pre>
        </div>
      </div>
    </div>
  `;
}

// Markdown to HTML simple parser
function renderMarkdown(md) {
  if (!md) return "";
  let html = escapeHtml(md);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gi, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gi, '');

  // Ordered lists
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li>$2</li>');

  // Line breaks
  html = html.replace(/\n\n/g, '<p></p>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Extract code and explanation from Gemini response
function parseGeminiResponse(rawText) {
  const codeBlockRegex = /```(?:python)?\s*([\s\S]*?)```/i;
  const match = rawText.match(codeBlockRegex);

  let code = "";
  let explanation = rawText;

  if (match) {
    code = match[1].trim();
    // Explanation is everything excluding the first primary code block
    explanation = rawText.replace(codeBlockRegex, "").trim();
  } else {
    // If response is mostly code
    if (rawText.includes("import ") || rawText.includes("def ") || rawText.includes("print(")) {
      code = rawText.trim();
      explanation = "";
    }
  }

  return { code, explanation, fullText: rawText };
}

// Gemini API Call (Direct or Proxy fallback)
async function callGemini(contents) {
  const payload = { contents };

  // Try via local proxy first
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL,
        contents: contents
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.candidates && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }
    }
  } catch (err) {
    console.warn("Local proxy fetch failed, trying direct Google API...", err);
  }

  // Fallback to direct client call
  const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const directRes = await fetch(directUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!directRes.ok) {
    const errData = await directRes.json();
    throw new Error(errData.error?.message || `HTTP ${directRes.status}`);
  }

  const data = await directRes.json();
  if (data.candidates && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("No response candidates returned by Gemini.");
}

// Run Python Code via backend
async function executePythonCode(code) {
  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, stdout: "", stderr: `Server error ${res.status}` };
  } catch (err) {
    // Fallback client simulation if server is offline
    return simulatePythonExecution(code);
  }
}

// Client-side fallback evaluator for common Python snippets
function simulatePythonExecution(code) {
  const lines = code.trim().split("\n");
  let output = "";
  try {
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith("print(") && line.endsWith(")")) {
        const inner = line.slice(6, -1);
        try {
          output += eval(inner) + "\n";
        } catch {
          output += inner.replace(/^['"]|['"]$/g, "") + "\n";
        }
      }
    }
    return { success: true, stdout: output || "Execution complete.", stderr: "" };
  } catch (e) {
    return { success: false, stdout: "", stderr: `SyntaxError: ${e.message}` };
  }
}

// Menus Data
const menusData = {
  file: [
    { label: "New Notebook", shortcut: "Ctrl+N" },
    { label: "Open...", shortcut: "Ctrl+O" },
    { divider: true },
    { label: "Save Notebook", shortcut: "Ctrl+S" },
    { label: "Save Notebook As..." },
    { label: "Revert Notebook to Checkpoint" },
    { divider: true },
    { label: "Export Notebook As..." },
    { label: "Close and Shut Down" }
  ],
  edit: [
    { label: "Undo Cell Operation", shortcut: "Ctrl+Z" },
    { label: "Redo Cell Operation", shortcut: "Ctrl+Y" },
    { divider: true },
    { label: "Cut Cells", shortcut: "X" },
    { label: "Copy Cells", shortcut: "C" },
    { label: "Paste Cells Below", shortcut: "V" },
    { label: "Delete Cells", shortcut: "D,D" },
    { divider: true },
    { label: "Select All Cells", shortcut: "Ctrl+A" }
  ],
  view: [
    { label: "Show Line Numbers", shortcut: "Shift+L" },
    { label: "Show Cell Toolbar" },
    { divider: true },
    { label: "Collapse Selected Code" },
    { label: "Expand Selected Code" }
  ],
  run: [
    { label: "Run Selected Cell", shortcut: "Ctrl+Enter" },
    { label: "Run Selected Cell and Advance", shortcut: "Shift+Enter" },
    { label: "Run Selected Cell and Insert Below", shortcut: "Alt+Enter" },
    { divider: true },
    { label: "Run All Cells" },
    { label: "Run All Above Selected Cell" },
    { label: "Run All Below Selected Cell" }
  ],
  kernel: [
    { label: "Interrupt Kernel", shortcut: "I,I" },
    { label: "Restart Kernel...", shortcut: "0,0" },
    { label: "Restart Kernel and Clear Outputs..." },
    { label: "Restart Kernel and Run All Cells..." },
    { divider: true },
    { label: "Shut Down Kernel" },
    { label: "Change Kernel..." }
  ],
  settings: [
    { label: "Gemini Model: gemini-2.5-flash (Connected)" },
    { label: "Theme: JupyterLab Light" },
    { label: "Auto Close Brackets" },
    { divider: true },
    { label: "📂 Deep Learning Practicals (dl_code/ folder)...", action: "open-practicals" }
  ],
  help: [
    { label: "JupyterLab Reference" },
    { label: "IPython Reference" },
    { label: "Gemini AI Assistant Guide" },
    { divider: true },
    { label: "Keyboard Shortcuts", shortcut: "H" },
    { label: "About Jupyter Notebook" }
  ]
};

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", () => {
  const documentContainer = document.getElementById("notebookDocument");
  const kernelIndicator = document.getElementById("kernelStatusIndicator");
  const kernelCircle = kernelIndicator ? kernelIndicator.querySelector(".kernel-circle") : null;
  const menuDropdown = document.getElementById("menuDropdown");
  const menuItems = document.querySelectorAll(".jp-menu-item");

  // Activate Cell
  function activateCell(cell) {
    if (!cell) return;
    
    document.querySelectorAll(".jp-cell").forEach(c => {
      c.classList.remove("is-active");
      const ind = c.querySelector(".jp-cell-indicator");
      if (ind) ind.innerHTML = "";
      const tb = c.querySelector(".jp-cell-toolbar");
      if (tb) tb.innerHTML = "";
    });

    cell.classList.add("is-active");
    const indicator = cell.querySelector(".jp-cell-indicator");
    if (indicator) {
      indicator.innerHTML = '<div class="active-blue-bar"></div>';
    }
    const toolbar = cell.querySelector(".jp-cell-toolbar");
    if (toolbar) {
      toolbar.innerHTML = toolbarHTML;
      attachToolbarEvents(cell);
    }
  }

  // Attach toolbar button events to a cell
  function attachToolbarEvents(cell) {
    const toolbar = cell.querySelector(".jp-cell-toolbar");
    if (!toolbar) return;

    toolbar.querySelectorAll(".cell-tool-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "ai-assist") {
          toggleAiDrawer(cell);
        } else if (action === "duplicate") {
          duplicateCell(cell);
        } else if (action === "move-up") {
          moveCellUp(cell);
        } else if (action === "move-down") {
          moveCellDown(cell);
        } else if (action === "insert-above") {
          insertCell(cell, "above");
        } else if (action === "insert-below") {
          insertCell(cell, "below");
        } else if (action === "delete") {
          deleteCell(cell);
        }
      });
    });
  }

  // AI Drawer Toggle & Setup
  function toggleAiDrawer(cell, preferredMode = "generate", errorText = "") {
    const container = cell.querySelector(".jp-cell-ai-container");
    if (!container) return;

    const sparkleBtn = cell.querySelector(".cell-tool-btn.ai-sparkle");

    if (container.classList.contains("is-open") && !errorText) {
      container.classList.remove("is-open");
      container.innerHTML = "";
      if (sparkleBtn) sparkleBtn.classList.remove("is-active");
      currentAiCell = null;
      return;
    }

    // Open AI Drawer
    currentAiCell = cell;
    if (sparkleBtn) sparkleBtn.classList.add("is-active");

    const input = cell.querySelector(".jp-cell-input");
    const cellCode = input ? (input.innerText || input.textContent || "").trim() : "";

    container.innerHTML = buildAiDrawerHTML(cellCode, errorText);
    container.classList.add("is-open");

    setupAiDrawerEvents(cell, container, cellCode, preferredMode, errorText);
  }

  // Setup AI Drawer Event Listeners
  function setupAiDrawerEvents(cell, container, cellCode, initialMode, errorText) {
    const textarea = container.querySelector(".ai-prompt-textarea");
    const generateBtn = container.querySelector(".btn-ai-generate");
    const btnLabel = generateBtn.querySelector(".btn-label");
    const loadingState = container.querySelector(".ai-loading-state");
    const loadingMsg = container.querySelector(".ai-loading-msg");
    const responseBox = container.querySelector(".ai-response-container");
    const explanationBox = container.querySelector(".ai-explanation-box");
    const codeBlock = container.querySelector(".ai-code-block");
    const codePre = container.querySelector(".ai-code-pre code");
    const closeBtn = container.querySelector(".ai-drawer-close");
    const tabButtons = container.querySelectorAll(".ai-tab-btn");
    const chips = container.querySelectorAll(".ai-chip");

    let activeMode = initialMode || (errorText ? "debug" : (cellCode ? "fix" : "generate"));

    function switchMode(mode) {
      activeMode = mode;
      tabButtons.forEach(b => {
        b.classList.toggle("active", b.dataset.mode === mode);
      });

      if (mode === "generate") {
        textarea.placeholder = "Describe what code you want Gemini to write (e.g., 'Load Titanic dataset and plot survival by gender')...";
        btnLabel.textContent = "Generate Code";
      } else if (mode === "fix") {
        textarea.placeholder = "Describe the bug/error, or leave blank to let Gemini auto-detect and fix issues in the cell...";
        btnLabel.textContent = "Fix & Solve Error";
      } else if (mode === "debug") {
        textarea.placeholder = errorText ? "Debugging current traceback..." : "Describe what error is happening or ask Gemini to explain how this code behaves...";
        btnLabel.textContent = "Debug & Describe";
      } else if (mode === "optimize") {
        textarea.placeholder = "Specify optimization goals (e.g., 'Vectorize loop with NumPy', 'Make PEP 8 compliant')...";
        btnLabel.textContent = "Optimize Code";
      }
    }

    switchMode(activeMode);

    if (errorText && activeMode === "debug") {
      textarea.value = `Explain and fix this error:\n${errorText}`;
    }

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        switchMode(btn.dataset.mode);
      });
    });

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        textarea.value = chip.dataset.prompt;
        textarea.focus();
      });
    });

    closeBtn.addEventListener("click", () => {
      container.classList.remove("is-open");
      container.innerHTML = "";
      const sparkleBtn = cell.querySelector(".cell-tool-btn.ai-sparkle");
      if (sparkleBtn) sparkleBtn.classList.remove("is-active");
    });

    async function handleAiSubmit() {
      const userPrompt = textarea.value.trim();
      const currentCode = cell.querySelector(".jp-cell-input").innerText.trim();

      loadingState.classList.add("is-loading");
      generateBtn.disabled = true;
      responseBox.classList.remove("has-response");

      // Build context prompt for Gemini
      let systemPrompt = "";
      if (activeMode === "generate") {
        systemPrompt = `You are an expert Python AI assistant inside Jupyter Notebook.
The user wants you to write clean, idiomatic Python code based on their prompt.
User prompt: "${userPrompt || 'Write clean Python demonstration code'}"
Notebook context: Existing cell code:
\`\`\`python
${currentCode}
\`\`\`
Instructions:
1. Provide the complete, working Python code wrapped in \`\`\`python ... \`\`\`.
2. Provide a brief explanation of how the code works.`;
      } else if (activeMode === "fix") {
        systemPrompt = `You are an expert Python debugger inside Jupyter Notebook.
The user needs to fix an error in their cell code.
Current Cell Code:
\`\`\`python
${currentCode}
\`\`\`
User description / Error traceback:
${userPrompt || errorText || 'Detect any syntax, logic, runtime, or import errors in this code and fix them.'}

Instructions:
1. Explain what caused the error clearly under the heading "### Error Diagnosis".
2. Provide the complete fixed, working Python code in \`\`\`python ... \`\`\`.
3. Provide a brief breakdown of why this fix works under "### How It Was Solved".`;
      } else if (activeMode === "debug") {
        systemPrompt = `You are a Python debugging assistant in Jupyter Notebook.
Analyze this Python code and error:
Code:
\`\`\`python
${currentCode}
\`\`\`
Error message / Traceback:
${userPrompt || errorText || 'Analyze this code for potential runtime errors, edge cases, and describe how to debug it.'}

Instructions:
1. Describe the error in detail: What type of error it is, why it occurs, and which exact line/variable triggered it.
2. Provide the corrected Python code in \`\`\`python ... \`\`\`.
3. Explain the solution step-by-step.`;
      } else if (activeMode === "optimize") {
        systemPrompt = `You are a Python performance and code quality expert.
Analyze and optimize this cell's code:
\`\`\`python
${currentCode}
\`\`\`
User request: ${userPrompt || 'Make it faster, more Pythonic, and follow PEP 8 standards.'}

Instructions:
1. Summarize optimization opportunities (e.g. vectorization, list comprehensions, time complexity).
2. Provide the fully optimized Python code in \`\`\`python ... \`\`\`.`;
      }

      try {
        const result = await callGemini([{ parts: [{ text: systemPrompt }] }]);
        const parsed = parseGeminiResponse(result);

        // Display results
        responseBox.classList.add("has-response");

        if (parsed.explanation) {
          explanationBox.style.display = "block";
          explanationBox.innerHTML = renderMarkdown(parsed.explanation);
        } else {
          explanationBox.style.display = "none";
        }

        if (parsed.code) {
          codeBlock.style.display = "block";
          codePre.textContent = parsed.code;
        } else {
          codeBlock.style.display = "none";
        }

        // Attach action buttons to generated code
        const applyBtn = codeBlock.querySelector('[data-action="apply-cell"]');
        const applyRunBtn = codeBlock.querySelector('[data-action="apply-run"]');
        const insertBelowBtn = codeBlock.querySelector('[data-action="insert-below"]');
        const copyBtn = codeBlock.querySelector('[data-action="copy-code"]');

        if (applyBtn) {
          applyBtn.onclick = () => {
            const input = cell.querySelector(".jp-cell-input");
            if (input) {
              input.innerText = parsed.code;
              input.focus();
            }
          };
        }

        if (applyRunBtn) {
          applyRunBtn.onclick = () => {
            const input = cell.querySelector(".jp-cell-input");
            if (input) {
              input.innerText = parsed.code;
              runCell(cell);
            }
          };
        }

        if (insertBelowBtn) {
          insertBelowBtn.onclick = () => {
            const newCell = insertCell(cell, "below");
            const input = newCell.querySelector(".jp-cell-input");
            if (input) {
              input.innerText = parsed.code;
            }
          };
        }

        if (copyBtn) {
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(parsed.code).then(() => {
              const orig = copyBtn.textContent;
              copyBtn.textContent = "✓ Copied!";
              setTimeout(() => copyBtn.textContent = orig, 1500);
            });
          };
        }

      } catch (err) {
        responseBox.classList.add("has-response");
        explanationBox.style.display = "block";
        explanationBox.innerHTML = `
          <div style="color: #c5221f; font-weight: 600;">⚠️ Gemini AI Error:</div>
          <p>${escapeHtml(err.message)}</p>
          <p style="font-size: 11.5px; color: #5f6368;">Check your internet connection or verify the Gemini API key.</p>
        `;
        codeBlock.style.display = "none";
      } finally {
        loadingState.classList.remove("is-loading");
        generateBtn.disabled = false;
      }
    }

    generateBtn.addEventListener("click", handleAiSubmit);

    textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAiSubmit();
      }
    });

    // If an errorText was passed, auto-submit to diagnose immediately!
    if (errorText) {
      handleAiSubmit();
    }
  }

  // Create a new cell element
  function createCellElement(content = "") {
    const cell = document.createElement("div");
    cell.className = "jp-cell";
    cell.dataset.cellId = Date.now().toString();

    cell.innerHTML = `
      <div class="jp-cell-input-row">
        <div class="jp-cell-indicator"></div>
        <div class="jp-cell-prompt">
          <span class="prompt-text">[ ]:</span>
        </div>
        <div class="jp-cell-editor-container">
          <div class="jp-cell-input" contenteditable="true" spellcheck="false" data-placeholder="">${escapeHtml(content)}</div>
          <div class="jp-cell-toolbar"></div>
        </div>
      </div>
      <div class="jp-cell-output-row"></div>
      <div class="jp-cell-ai-container"></div>
    `;

    setupCellEvents(cell);
    return cell;
  }

  function setupCellEvents(cell) {
    cell.addEventListener("click", () => {
      activateCell(cell);
    });

    const input = cell.querySelector(".jp-cell-input");
    if (input) {
      input.addEventListener("focus", () => {
        activateCell(cell);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          runCell(cell);
          const next = cell.nextElementSibling;
          if (next && next.classList.contains("jp-cell")) {
            activateCell(next);
            const nextInput = next.querySelector(".jp-cell-input");
            if (nextInput) nextInput.focus();
          } else {
            const newCell = insertCell(cell, "below");
            const newCellInput = newCell.querySelector(".jp-cell-input");
            if (newCellInput) newCellInput.focus();
          }
        }
      });
    }
  }

  // Run cell function with real Python backend execution and traceback handling
  async function runCell(cell) {
    executionCounter++;
    if (kernelCircle) kernelCircle.classList.add("busy");

    const promptText = cell.querySelector(".prompt-text");
    if (promptText) {
      promptText.textContent = `[ * ]:`;
    }

    const input = cell.querySelector(".jp-cell-input");
    const code = input ? (input.innerText || input.textContent || "").trim() : "";
    const outputRow = cell.querySelector(".jp-cell-output-row");

    const result = await executePythonCode(code);

    if (kernelCircle) kernelCircle.classList.remove("busy");
    if (promptText) promptText.textContent = `[ ${executionCounter} ]:`;

    if (!outputRow) return;

    if (result.success) {
      if (result.stdout && result.stdout.trim()) {
        outputRow.className = "jp-cell-output-row has-output";
        outputRow.innerHTML = `<div class="jp-output-stdout">${escapeHtml(result.stdout)}</div>`;
      } else {
        outputRow.className = "jp-cell-output-row";
        outputRow.innerHTML = "";
      }
    } else {
      // Error occurred!
      const errorText = result.stderr || "Unknown execution error";
      outputRow.className = "jp-cell-output-row has-output";
      outputRow.innerHTML = `
        <div class="jp-output-error">
          <div class="error-action-banner">
            <span class="error-tag">⚠️ Execution Error</span>
            <button class="btn-fix-with-ai" data-action="fix-error">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
              </svg>
              ✨ Fix & Explain with Gemini AI
            </button>
          </div>
          <div>${escapeHtml(errorText)}</div>
        </div>
      `;

      // Wire up "Fix & Explain with Gemini AI" button
      const fixBtn = outputRow.querySelector('[data-action="fix-error"]');
      if (fixBtn) {
        fixBtn.onclick = () => {
          activateCell(cell);
          toggleAiDrawer(cell, "debug", errorText);
        };
      }
    }
  }

  // Insert cell above or below
  function insertCell(referenceCell, position = "below") {
    const newCell = createCellElement();
    if (position === "below") {
      referenceCell.after(newCell);
    } else {
      referenceCell.before(newCell);
    }
    activateCell(newCell);
    return newCell;
  }

  // Duplicate cell
  function duplicateCell(cell) {
    const input = cell.querySelector(".jp-cell-input");
    const content = input ? input.innerText : "";
    const newCell = createCellElement(content);
    cell.after(newCell);
    activateCell(newCell);
  }

  // Move cell up
  function moveCellUp(cell) {
    const prev = cell.previousElementSibling;
    if (prev && prev.classList.contains("jp-cell")) {
      cell.parentNode.insertBefore(cell, prev);
      activateCell(cell);
    }
  }

  // Move cell down
  function moveCellDown(cell) {
    const next = cell.nextElementSibling;
    if (next && next.classList.contains("jp-cell")) {
      cell.parentNode.insertBefore(next, cell);
      activateCell(cell);
    }
  }

  // Delete cell
  function deleteCell(cell) {
    const allCells = document.querySelectorAll(".jp-cell");
    if (allCells.length <= 1) {
      const input = cell.querySelector(".jp-cell-input");
      if (input) input.textContent = "";
      const out = cell.querySelector(".jp-cell-output-row");
      if (out) { out.innerHTML = ""; out.className = "jp-cell-output-row"; }
      return;
    }
    const nextToActivate = cell.nextElementSibling || cell.previousElementSibling;
    cell.remove();
    if (nextToActivate) {
      activateCell(nextToActivate);
    }
  }

  // Initialize existing cells
  document.querySelectorAll(".jp-cell").forEach(cell => {
    setupCellEvents(cell);
  });

  // Attach toolbar events to initial active cell (cell 5)
  const initialActive = document.querySelector(".jp-cell.is-active");
  if (initialActive) {
    attachToolbarEvents(initialActive);
  }

  // Header Toolbar actions
  const btnRun = document.getElementById("btnRun");
  if (btnRun) {
    btnRun.addEventListener("click", () => {
      const activeCell = document.querySelector(".jp-cell.is-active");
      if (activeCell) runCell(activeCell);
    });
  }

  const btnAddCell = document.getElementById("btnAddCell");
  if (btnAddCell) {
    btnAddCell.addEventListener("click", () => {
      const activeCell = document.querySelector(".jp-cell.is-active") || document.querySelector(".jp-cell:last-child");
      if (activeCell) insertCell(activeCell, "below");
    });
  }

  const btnSave = document.getElementById("btnSave");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      const checkpointTime = document.querySelector(".checkpoint-time");
      if (checkpointTime) checkpointTime.textContent = "a few seconds ago";
      btnSave.style.opacity = "0.5";
      setTimeout(() => btnSave.style.opacity = "1", 300);
    });
  }

  const btnRestart = document.getElementById("btnRestart");
  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      if (kernelCircle) kernelCircle.classList.add("busy");
      setTimeout(() => {
        executionCounter = 0;
        document.querySelectorAll(".prompt-text").forEach(p => p.textContent = "[ ]:");
        document.querySelectorAll(".jp-cell-output-row").forEach(o => {
          o.innerHTML = "";
          o.className = "jp-cell-output-row";
        });
        if (kernelCircle) kernelCircle.classList.remove("busy");
      }, 500);
    });
  }

  const btnRestartRunAll = document.getElementById("btnRestartRunAll");
  if (btnRestartRunAll) {
    btnRestartRunAll.addEventListener("click", () => {
      if (kernelCircle) kernelCircle.classList.add("busy");
      setTimeout(() => {
        executionCounter = 0;
        document.querySelectorAll(".jp-cell").forEach(c => runCell(c));
      }, 300);
    });
  }


  // Menu Dropdowns Logic
  let activeMenu = null;

  function closeMenu() {
    if (!menuDropdown) return;
    menuDropdown.classList.remove("is-open");
    menuDropdown.innerHTML = "";
    menuItems.forEach(item => {
      if (item.dataset.menu !== "help") {
        item.classList.remove("is-highlighted");
      }
    });
    activeMenu = null;
  }

  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const menuKey = item.dataset.menu;

      if (activeMenu === menuKey) {
        closeMenu();
        return;
      }

      activeMenu = menuKey;
      menuItems.forEach(m => m.classList.remove("is-highlighted"));
      item.classList.add("is-highlighted");

      const rect = item.getBoundingClientRect();
      menuDropdown.style.position = "fixed";
      menuDropdown.style.left = `${rect.left}px`;
      menuDropdown.style.top = `${rect.bottom + 2}px`;
      menuDropdown.style.display = "block";

      const entries = menusData[menuKey] || [];
      menuDropdown.innerHTML = entries.map(entry => {
        if (entry.divider) {
          return '<div class="menu-divider"></div>';
        }
        return `
          <div class="menu-entry" data-action="${entry.action || ''}">
            <span>${entry.label}</span>
            ${entry.shortcut ? `<span class="menu-shortcut">${entry.shortcut}</span>` : ""}
          </div>
        `;
      }).join("");

      menuDropdown.querySelectorAll(".menu-entry").forEach(entryEl => {
        entryEl.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const act = entryEl.dataset.action;
          closeMenu();
          if (act === "open-practicals") {
            window.toggleTrustedDropdown();
          }
        });
      });

      menuDropdown.classList.add("is-open");
    });
  });

  document.addEventListener("click", (e) => {
    if (menuDropdown && !menuDropdown.contains(e.target)) {
      closeMenu();
      const helpItem = document.querySelector('.jp-menu-item[data-menu="help"]');
      if (helpItem) helpItem.classList.add("is-highlighted");
    }

    if (trustedDropdown && trustedBadge && !trustedDropdown.contains(e.target) && !trustedBadge.contains(e.target)) {
      closeTrustedDropdown();
    }
  });

  // ============================================================
  // TRUSTED BADGE DROPDOWN & PRACTICAL CODES LOADER
  // ============================================================
  const trustedBadge = document.getElementById("trustedBadge");
  const trustedDropdown = document.getElementById("trustedDropdown");
  let practicalsListCache = null;
  let allPracticalsDataCache = null;
  let activePracticalFilename = null;

  function openTrustedDropdown() {
    if (!trustedDropdown || !trustedBadge) return;
    closeMenu();

    const rect = trustedBadge.getBoundingClientRect();
    trustedDropdown.style.position = "fixed";
    trustedDropdown.style.top = `${rect.bottom + 4}px`;
    trustedDropdown.style.right = `${Math.max(10, window.innerWidth - rect.right)}px`;
    trustedDropdown.style.left = "auto";
    trustedDropdown.style.display = "block";

    trustedBadge.classList.add("is-open");
    trustedDropdown.classList.add("is-open");
    renderTrustedDropdown();
  }

  function closeTrustedDropdown() {
    if (!trustedDropdown) return;
    trustedDropdown.classList.remove("is-open");
    trustedDropdown.style.display = "none";
    if (trustedBadge) trustedBadge.classList.remove("is-open");
  }

  function toggleTrustedDropdown(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (!trustedDropdown) return;
    const isOpen = trustedDropdown.classList.contains("is-open") || trustedDropdown.style.display === "block";
    if (isOpen) {
      closeTrustedDropdown();
    } else {
      openTrustedDropdown();
    }
  }

  window.toggleTrustedDropdown = toggleTrustedDropdown;

  // Toast Notification Helper
  function showToast(message) {
    const existing = document.querySelector(".jp-toast-notice");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "jp-toast-notice";
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Get list of practicals (Instant memory first, then API)
  async function getPracticalsList() {
    if (window.PRACTICALS_DATA && Array.isArray(window.PRACTICALS_DATA)) {
      return window.PRACTICALS_DATA;
    }
    if (allPracticalsDataCache && Array.isArray(allPracticalsDataCache)) {
      return allPracticalsDataCache;
    }
    if (practicalsListCache) return practicalsListCache;

    try {
      const res = await fetch("/api/practicals");
      if (res.ok) {
        practicalsListCache = await res.json();
        return practicalsListCache;
      }
    } catch (e) {
      console.warn("API /api/practicals failed, trying practicals.json...", e);
    }

    try {
      const res = await fetch("practicals.json");
      if (res.ok) {
        allPracticalsDataCache = await res.json();
        return allPracticalsDataCache;
      }
    } catch (e) {
      console.error("Failed to load practicals fallback:", e);
    }

    return [];
  }

  // Get single practical data with cells
  async function getPracticalDetails(filename) {
    const sourceList = window.PRACTICALS_DATA || allPracticalsDataCache || [];
    if (sourceList.length > 0) {
      const found = sourceList.find(p => p.filename === filename || p.cleanName === filename);
      if (found && found.cells) return found;
    }

    try {
      const res = await fetch(`/api/practicals?file=${encodeURIComponent(filename)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch practical detail from API, trying practicals.json...", e);
    }

    try {
      const res = await fetch("practicals.json");
      if (res.ok) {
        allPracticalsDataCache = await res.json();
        return allPracticalsDataCache.find(p => p.filename === filename || p.cleanName === filename);
      }
    } catch (e) {
      console.error("Failed to fetch practical details:", e);
    }

    return null;
  }

  // Render items into dropdown
  function populateDropdownList(items) {
    const listContainer = trustedDropdown.querySelector(".trusted-dropdown-list");
    if (!listContainer) return;

    if (!items || items.length === 0) {
      listContainer.innerHTML = `<div style="padding: 14px; text-align: center; color: #b31412; font-size: 12px;">No practical files found in dl_code/ folder.</div>`;
      return;
    }

    listContainer.innerHTML = items.map((item) => {
      const isActive = activePracticalFilename === item.filename ? "active" : "";
      const count = item.totalCells || (item.cells ? item.cells.length : 0);
      return `
        <div class="trusted-dropdown-item ${isActive}" data-filename="${escapeHtml(item.filename)}">
          <div class="item-left">
            <span class="item-icon">📘</span>
            <div class="item-title-block">
              <span class="item-name">${escapeHtml(item.title)}</span>
              <span class="item-filename">${escapeHtml(item.filename)}</span>
            </div>
          </div>
          <span class="item-badge">${count} cells</span>
        </div>
      `;
    }).join("");

    // Wire click events on items
    listContainer.querySelectorAll(".trusted-dropdown-item").forEach(el => {
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        const fname = el.dataset.filename;
        closeTrustedDropdown();
        showToast("⏳ Loading practical code into notebook...");
        const practical = await getPracticalDetails(fname);
        if (practical) {
          activePracticalFilename = practical.filename;
          loadPracticalIntoNotebook(practical);
        } else {
          showToast("⚠️ Could not load practical file.");
        }
      });
    });
  }

  // Render Trusted Dropdown
  function renderTrustedDropdown() {
    if (!trustedDropdown) return;

    trustedDropdown.innerHTML = `
      <div class="trusted-dropdown-header">
        <div class="trusted-dropdown-title">
          <span>📂 Deep Learning Notebooks (dl_code/)</span>
        </div>
        <div class="trusted-dropdown-subtitle">Click any practical to load all its code cells into the notebook</div>
      </div>
      <div class="trusted-dropdown-list">
        <div style="padding: 14px; text-align: center; color: #70757a; font-size: 12px;">Loading practicals...</div>
      </div>
      <div class="trusted-dropdown-footer">
        <button class="btn-reset-template" id="btnResetNotebook" title="Reset back to 5 blank cells">
          <span>🔄 Reset to Blank Template</span>
        </button>
        <span style="font-size: 10.5px; color: #80868b;">6 Practicals available</span>
      </div>
    `;

    // Wire reset button
    const btnReset = trustedDropdown.querySelector("#btnResetNotebook");
    if (btnReset) {
      btnReset.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTrustedDropdown();
        activePracticalFilename = null;
        resetNotebookToBlank();
        showToast("✓ Reset notebook to blank template (5 cells)");
      });
    }

    // Populate immediately if data exists in memory
    const memoryData = window.PRACTICALS_DATA || allPracticalsDataCache;
    if (memoryData && Array.isArray(memoryData) && memoryData.length > 0) {
      populateDropdownList(memoryData);
      return;
    }

    // Otherwise fetch
    getPracticalsList().then(items => {
      populateDropdownList(items);
    });
  }

  // Load practical cells into notebook
  function loadPracticalIntoNotebook(practical) {
    if (!documentContainer) return;

    // Update Notebook Title & Checkpoint
    const titleEl = document.getElementById("notebookTitle");
    if (titleEl) {
      titleEl.textContent = practical.cleanName || practical.filename.replace('.ipynb', '');
    }

    const checkpointEl = document.querySelector(".checkpoint-time");
    if (checkpointEl) {
      checkpointEl.textContent = "just now";
    }

    // Clear existing cells
    documentContainer.innerHTML = "";

    const cells = practical.cells || [];
    if (cells.length === 0) {
      resetNotebookToBlank();
      return;
    }

    // Build DOM for each cell
    cells.forEach((cellData, index) => {
      const isFirst = index === 0;
      const cell = document.createElement("div");
      cell.className = `jp-cell ${isFirst ? 'is-active' : ''}`;
      cell.dataset.cellId = (index + 1).toString();

      const execCount = cellData.execution_count != null ? cellData.execution_count : " ";
      const codeSource = cellData.source || "";

      // Output row content
      let outputHTML = "";
      if (cellData.outputs && cellData.outputs.length > 0) {
        outputHTML = cellData.outputs.map(out => {
          if (out.type === "image") {
            return `<img class="jp-output-image" src="data:image/png;base64,${out.data}" alt="Output Plot"/>`;
          } else if (out.type === "error") {
            return `
              <div class="jp-output-error">
                <div class="error-action-banner">
                  <span class="error-tag">⚠️ Execution Error</span>
                  <button class="btn-fix-with-ai" data-action="fix-error">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
                    </svg>
                    ✨ Fix & Explain with Gemini AI
                  </button>
                </div>
                <div>${escapeHtml(out.text)}</div>
              </div>
            `;
          } else {
            return `<div class="jp-output-stdout">${escapeHtml(out.text || "")}</div>`;
          }
        }).join("");
      }

      cell.innerHTML = `
        <div class="jp-cell-input-row">
          <div class="jp-cell-indicator">
            ${isFirst ? '<div class="active-blue-bar"></div>' : ''}
          </div>
          <div class="jp-cell-prompt">
            <span class="prompt-text">[ ${execCount} ]:</span>
          </div>
          <div class="jp-cell-editor-container">
            <div class="jp-cell-input" contenteditable="true" spellcheck="false" data-placeholder="">${escapeHtml(codeSource)}</div>
            <div class="jp-cell-toolbar">
              ${isFirst ? toolbarHTML : ''}
            </div>
          </div>
        </div>
        <div class="jp-cell-output-row ${outputHTML ? 'has-output' : ''}">${outputHTML}</div>
        <div class="jp-cell-ai-container"></div>
      `;

      setupCellEvents(cell);
      if (isFirst) {
        attachToolbarEvents(cell);
      }

      // Wire up any error fix buttons in this cell
      const fixBtn = cell.querySelector('[data-action="fix-error"]');
      if (fixBtn) {
        fixBtn.onclick = () => {
          activateCell(cell);
          const errDiv = cell.querySelector(".jp-output-error div:last-child");
          toggleAiDrawer(cell, "debug", errDiv ? errDiv.innerText : "");
        };
      }

      documentContainer.appendChild(cell);
    });

    // Scroll to top of notebook
    window.scrollTo({ top: 0, behavior: "smooth" });

    showToast(`✓ Loaded ${practical.title} (${cells.length} cells)`);
  }

  // Reset back to original 5 empty cells template
  function resetNotebookToBlank() {
    if (!documentContainer) return;

    const titleEl = document.getElementById("notebookTitle");
    if (titleEl) titleEl.textContent = "Untitled13";

    documentContainer.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const isFifth = i === 5;
      const cell = document.createElement("div");
      cell.className = `jp-cell ${isFifth ? 'is-active' : ''}`;
      cell.dataset.cellId = i.toString();

      cell.innerHTML = `
        <div class="jp-cell-input-row">
          <div class="jp-cell-indicator">
            ${isFifth ? '<div class="active-blue-bar"></div>' : ''}
          </div>
          <div class="jp-cell-prompt">
            <span class="prompt-text">[ ]:</span>
          </div>
          <div class="jp-cell-editor-container">
            <div class="jp-cell-input" contenteditable="true" spellcheck="false" data-placeholder=""></div>
            <div class="jp-cell-toolbar">
              ${isFifth ? toolbarHTML : ''}
            </div>
          </div>
        </div>
        <div class="jp-cell-output-row"></div>
        <div class="jp-cell-ai-container"></div>
      `;

      setupCellEvents(cell);
      if (isFifth) {
        attachToolbarEvents(cell);
      }
      documentContainer.appendChild(cell);
    }
  }

  // Trusted Badge Click Event
  if (trustedBadge) {
    trustedBadge.style.cursor = "pointer";
    trustedBadge.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleTrustedDropdown();
    };
  }

});

