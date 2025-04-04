(function () {
  const config = {
    enabled: true,
    rules: [
      {
        id: 1,
        type: "regex",
        pattern: "\\b(?!\\*+)(?:\\d[ -]*?){13,16}\\b",
        name: "Credit Card Number",
        active: true,
        description: "Matches credit card numbers that aren't masked",
      },
      {
        id: 2,
        type: "regex",
        pattern:
          "\\b(?!\\*+)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b",
        name: "Email Address",
        active: true,
        description: "Matches email addresses that aren't masked",
      },
      {
        id: 3,
        type: "regex",
        pattern: "\\b(?!\\*+)(?:\\d{3}[-.]?){2}\\d{4}\\b",
        name: "SSN",
        active: true,
        description: "Matches SSNs that aren't masked",
      },
      {
        id: 4,
        type: "variable",
        pattern:
          "(?:password|pwd|pass|secret|auth[_-]?key)\\s*[:=]\\s*['\"](?!\\*+)[^'\"]+['\"]",
        name: "Basic Credentials",
        active: true,
        description:
          "Matches basic credential assignments including passwords and secrets",
      },
      {
        id: 5,
        type: "variable",
        pattern:
          "(?:api[_-]?(?:key|token)|access[_-]?(?:key|token)|client[_-]?secret|(?:private|secret|encryption|crypto)[_-]?key)\\s*[:=]\\s*['\"](?!\\*+)[A-Za-z0-9+/=._-]{8,}['\"]",
        name: "Formatted Credentials",
        active: true,
        description:
          "Matches credentials requiring specific formats like API keys and tokens",
      },
      {
        id: 6,
        type: "variable",
        pattern:
          "\\$env:(?:api[_-]?key|apikey|access[_-]?key|secret|password|(?:azure|aws|google)(?:_|\\s)?(?:account|secret|subscription|key))\\s*=\\s*['\"](?!\\*+)[A-Za-z0-9+/=._-]{8,}['\"]",
        name: "Environment Credentials",
        active: true,
        description:
          "Matches PowerShell environment variables containing credentials including cloud provider keys",
      },
      {
        id: 7,
        type: "variable",
        pattern:
          "ConnectionString\\s*=\\s*['\"](?:Data Source|Server)=[^;]+;(?:Initial Catalog|Database)=[^;]+;(?:User ?Id|UID)=[^;]+;(?:Password|PWD)=(?!\\*+)[^;]+['\"]",
        name: "Connection String",
        active: true,
        description: "Matches database connection strings with credentials",
      },
      {
        id: 8,
        type: "variable",
        pattern:
          "(?:(?:ANTHROPIC_API_KEY|anthropic_key)\\s*[:=]\\s*['\"](?!\\*+)sk-ant-[A-Za-z0-9]{32,}['\"]|(?:OPENAI_API_KEY|openai_key)\\s*[:=]\\s*['\"](?!\\*+)sk-[A-Za-z0-9]{32,}['\"]|(?:GOOGLE_AI_KEY|gemini_key)\\s*[:=]\\s*['\"](?!\\*+)AIza[A-Za-z0-9_-]{35,}['\"])",
        name: "AI API Keys",
        active: true,
        description:
          "Matches common AI service API keys with their specific formats",
      },
      {
        id: 9,
        type: "regex",
        pattern:
          "-----BEGIN\\s+(?:RSA|OPENSSH|DSA|EC|PGP)\\s+PRIVATE\\s+KEY-----(?!\\*+)[\\s\\S]*?-----END\\s+(?:RSA|OPENSSH|DSA|EC|PGP)\\s+PRIVATE\\s+KEY-----",
        name: "Private Key",
        active: true,
        description: "Matches private key files that aren't masked",
      },
      {
        id: 10,
        type: "variable",
        pattern:
          '"(?:password|secret|apiKey|token|auth|(?:firebase|mongodb|redis)(?:Url|Uri|Connection)|(?:stripe|paypal|square)(?:Key|Secret|Token)|(?:aws|azure|gcp)(?:Key|Secret|Token|Credential)|(?:oauth|jwt|bearer)Token|(?:private|public)Key)"\\s*:\\s*(?:"(?!\\*+)[^"]+"|{[^}]*"value"\\s*:\\s*"(?!\\*+)[^"]+"[^}]*})',
        name: "JSON Credentials",
        active: true,
        description:
          "Matches various credential patterns in JSON format including service credentials, tokens, and keys",
      },
    ],
    nextRuleId: 11,
    styles: {
      highlightColor: "#ff0000",
      borderWidth: "2px",
      warningHeaderBg: "#1e50c1",
    },
    placement: {
      position: "before",
      referenceElement: "workspace-tab-settings",
    },
    menuButton: {
      show: true,
      shortcut: "Shift+Alt+S",
    },
  };
  let chatInputElement = null;
  let privacyButton = null;
  let modalContainer = null;
  let rulesList = null;
  let lastActiveMatches = [];
  let menuItems = {};
  let ignoredRegions = [];
  function init() {
    loadConfig();
    const initializeExtension = () => {
      console.log("Initializing ContentShield extension...");
      scanMenuItems();
      if (config.menuButton.show) {
        setupShieldButton();
      }
      setupKeyboardShortcut();
      setupChatMonitoring();
      setupModalContainer();
      const menuBar = document.querySelector(
        '[data-element-id="workspace-bar"]'
      );
      if (menuBar) {
        const observer = new MutationObserver((mutations) => {
          scanMenuItems();
        });
        observer.observe(menuBar, {
          childList: true,
          subtree: true,
        });
      }
    };
    if (document.readyState === "complete") {
      setTimeout(initializeExtension, 1000);
    } else {
      window.addEventListener("load", () =>
        setTimeout(initializeExtension, 1000)
      );
    }
  }
  function loadConfig() {
    const savedConfig = localStorage.getItem("typingMindContentShieldConfig");
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        config.enabled = parsedConfig.enabled ?? config.enabled;
        config.rules = parsedConfig.rules ?? config.rules;
        config.nextRuleId = parsedConfig.nextRuleId ?? config.nextRuleId;
        if (parsedConfig.styles) {
          config.styles = {
            highlightColor: parsedConfig.styles.highlightColor ?? "#ff0000",
            borderWidth: parsedConfig.styles.borderWidth ?? "2px",
            warningHeaderBg: parsedConfig.styles.warningHeaderBg ?? "#1e50c1",
          };
        }
        if (parsedConfig.placement) {
          config.placement = {
            position: parsedConfig.placement.position ?? "before",
            referenceElement:
              parsedConfig.placement.referenceElement ??
              "workspace-tab-settings",
          };
        }
        if (parsedConfig.menuButton) {
          config.menuButton = {
            show: parsedConfig.menuButton.show ?? true,
            shortcut: parsedConfig.menuButton.shortcut ?? "Shift+Alt+S",
          };
        }
      } catch (e) {
        console.error("Failed to parse saved content shield config", e);
      }
    }
  }
  function scanMenuItems() {
    const menuBar = document.querySelector('[data-element-id="workspace-bar"]');
    if (!menuBar) {
      setTimeout(scanMenuItems, 1000);
      return;
    }
    menuItems = {};
    const buttons = menuBar.querySelectorAll("button");
    let foundSettings = false;
    let order = 0;
    for (const button of buttons) {
      const id =
        button.getAttribute("data-element-id") ||
        button.id ||
        `menu-item-${order}`;
      if (id === "workspace-tab-shield") {
        continue;
      }
      if (id === "workspace-tab-settings") {
        const labelSpan = button.querySelector("span span");
        const label = labelSpan
          ? labelSpan.textContent.trim()
          : button.textContent.trim() ||
            id.replace(/^(workspace-tab-|menu-item-)/, "");
        menuItems[id] = {
          id,
          label,
          order: order,
        };
        foundSettings = true;
        break;
      }
      const labelSpan = button.querySelector("span span");
      const label = labelSpan
        ? labelSpan.textContent.trim()
        : button.textContent.trim() ||
          id.replace(/^(workspace-tab-|menu-item-)/, "");
      menuItems[id] = {
        id,
        label,
        order: order,
      };
      order++;
    }
    if (!foundSettings) {
      console.warn("Settings button not found in menu bar");
    }
    const placementDropdown = document.getElementById("placement-reference");
    if (placementDropdown) {
      placementDropdown.innerHTML = generateMenuItemOptions();
    }
  }
  function saveConfig() {
    localStorage.setItem(
      "typingMindContentShieldConfig",
      JSON.stringify(config)
    );
  }
  function setupShieldButton() {
    if (privacyButton && privacyButton.parentNode) {
      privacyButton.parentNode.removeChild(privacyButton);
    }
    privacyButton = document.createElement("button");
    privacyButton.className =
      "min-w-[58px] sm:min-w-0 sm:aspect-auto aspect-square cursor-default h-12 md:h-[50px] flex-col justify-start items-start inline-flex focus:outline-0 focus:text-white w-full";
    privacyButton.dataset.elementId = "workspace-tab-shield";
    privacyButton.innerHTML = `
      <span class="text-white/70 hover:bg-white/20 self-stretch h-12 md:h-[50px] px-0.5 py-1.5 rounded-xl flex-col justify-start items-center gap-1.5 flex transition-colors">
        <svg class="w-4 h-4 flex-shrink-0" width="18px" height="18px" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <g fill="currentColor">
            <path d="M9,1L2,4v4c0,4.9,3,9.3,7,10.3c4-1,7-5.4,7-10.3V4L9,1z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
            <path d="M6.5,8.5L8.3,10.3L11.5,7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
          </g>
        </svg>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Shield</span>
      </span>
    `;
    const position = config.placement.position;
    const refElementId = config.placement.referenceElement;
    const referenceElement = document.querySelector(
      `[data-element-id="${refElementId}"]`
    );
    if (!referenceElement) {
      console.error(`Reference element with ID ${refElementId} not found`);
      const workspaceBar = document.querySelector(
        '[data-element-id="workspace-bar"]'
      );
      if (workspaceBar) {
        workspaceBar.appendChild(privacyButton);
      }
      return;
    }
    if (position === "before") {
      referenceElement.parentNode.insertBefore(privacyButton, referenceElement);
    } else {
      referenceElement.parentNode.insertBefore(
        privacyButton,
        referenceElement.nextSibling
      );
    }
    privacyButton.addEventListener("click", (e) => {
      togglePrivacyModal();
      e.stopPropagation();
    });
  }
  function setupChatMonitoring() {
    chatInputElement = document.querySelector(
      '#chat-input-textbox, [data-element-id="chat-input-textbox"]'
    );
    if (!chatInputElement) {
      setTimeout(setupChatMonitoring, 1000);
      return;
    }
    chatInputElement.addEventListener("input", checkForSensitiveInfo);
    const observer = new MutationObserver((mutations) => {
      checkForSensitiveInfo();
    });
    observer.observe(chatInputElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    checkForSensitiveInfo();
  }
  function checkForSensitiveInfo() {
    if (!config.enabled || !chatInputElement) {
      return;
    }
    const text = chatInputElement.value;
    const activeMatches = [];
    config.rules.forEach((rule) => {
      if (!rule.active) return;
      let matches = [];
      if (rule.type === "regex" || rule.type === "variable") {
        try {
          const regex = new RegExp(rule.pattern, "g");
          let match;
          while ((match = regex.exec(text)) !== null) {
            const matchedText = match[0];
            matches.push({
              ruleName: rule.name,
              ruleId: rule.id,
              matchedText: matchedText,
              index: match.index,
              length: matchedText.length,
            });
          }
        } catch (e) {
          console.error(`Invalid regex pattern in rule ${rule.name}:`, e);
        }
      } else if (rule.type === "string") {
        const searchText = rule.caseSensitive ? text : text.toLowerCase();
        const searchPattern = rule.caseSensitive
          ? rule.pattern
          : rule.pattern.toLowerCase();
        let index = searchText.indexOf(searchPattern);
        while (index !== -1) {
          const matchedText = text.substring(
            index,
            index + rule.pattern.length
          );
          matches.push({
            ruleName: rule.name,
            ruleId: rule.id,
            matchedText: matchedText,
            index: index,
            length: rule.pattern.length,
          });
          index = searchText.indexOf(searchPattern, index + 1);
        }
      }
      activeMatches.push(...matches);
    });
    activeMatches.sort((a, b) => a.index - b.index);
    updateChatInputStyle(activeMatches.length > 0);
    if (!arraysEqual(lastActiveMatches, activeMatches)) {
      lastActiveMatches = activeMatches;
      if (document.getElementById("shield-warning-tooltip")) {
        showShieldWarning();
      }
    }
  }
  function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort((a, b) => a.index - b.index);
    const sorted2 = [...arr2].sort((a, b) => a.index - b.index);
    return sorted1.every((match, index) => {
      const match2 = sorted2[index];
      return (
        match.ruleName === match2.ruleName &&
        match.matchedText === match2.matchedText &&
        match.index === match2.index
      );
    });
  }
  function updateChatInputStyle(hasSensitiveInfo) {
    if (!chatInputElement) return;
    if (hasSensitiveInfo) {
      const color = config.styles.highlightColor;
      const rgbaColor = `rgba(${hexToRgb(color)}, 0.3)`;
      const rgbaColorFaint = `rgba(${hexToRgb(color)}, 0.1)`;
      chatInputElement.style.border = `${config.styles.borderWidth} solid ${color}`;
      chatInputElement.style.boxShadow = `
        0 0 5px ${color},
        0 0 10px ${rgbaColor},
        0 0 15px ${rgbaColorFaint},
        inset 0 0 5px ${rgbaColorFaint}
      `;
      chatInputElement.style.transition = "all 0.3s ease";
      showShieldWarning();
    } else {
      chatInputElement.style.border = "";
      chatInputElement.style.boxShadow = "";
      chatInputElement.style.transition = "all 0.3s ease";
      hideShieldWarning();
    }
  }
  function showShieldWarning() {
    let warningElement = document.getElementById("shield-warning-tooltip");
    const container = chatInputElement.parentElement;
    if (!warningElement) {
      warningElement = document.createElement("div");
      warningElement.id = "shield-warning-tooltip";
      warningElement.className = "shield-warning-tooltip";
      if (container) {
        container.style.position = "relative";
        container.appendChild(warningElement);
      }
    }
    const matchesByRule = {};
    lastActiveMatches.forEach((match) => {
      if (!matchesByRule[match.ruleName]) {
        matchesByRule[match.ruleName] = [];
      }
      const textBeforeMatch = chatInputElement.value.substring(0, match.index);
      const lines = textBeforeMatch.split("\n");
      const lineNumber = lines.length;
      const charPosition = lines[lines.length - 1].length + 1;
      matchesByRule[match.ruleName].push({
        text: match.matchedText,
        position: `Line ${lineNumber}, Char ${charPosition}`,
        index: match.index,
        length: match.length,
      });
    });
    const headerHTML = `
      <div class="shield-warning-header" style="background-color: ${config.styles.warningHeaderBg};">
        <div class="shield-warning-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shield-warning-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Shield Alert: Potentially Sensitive Information Detected
        </div>
      </div>
    `;
    let tableRowsHTML = "";
    let hasMatches = false;
    Object.entries(matchesByRule).forEach(([ruleName, matches]) => {
      matches.forEach((match, index) => {
        hasMatches = true;
        const safeText = match.text
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
        tableRowsHTML += `
          <tr class="shield-warning-row">
            <td class="shield-warning-cell">${index === 0 ? ruleName : ""}</td>
            <td class="shield-warning-cell"><code style="background-color: rgba(${hexToRgb(
              config.styles.highlightColor
            )}, 0.3);">${safeText}</code></td>
            <td class="shield-warning-cell position-cell" data-index="${
              match.index
            }" data-length="${
          match.length
        }" style="cursor: pointer; text-decoration: underline;">${
          match.position
        }</td>
          </tr>
        `;
      });
    });
    const contentHTML = `
      <div class="shield-warning-content">
        <table class="shield-warning-table">
          <thead>
            <tr class="shield-warning-header-row">
              <th class="shield-warning-header-cell">Rule Name</th>
              <th class="shield-warning-header-cell">Detected Text</th>
              <th class="shield-warning-header-cell">Position</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
        ${
          !hasMatches
            ? '<p class="shield-warning-no-matches">No matches found</p>'
            : ""
        }
      </div>
    `;
    warningElement.innerHTML = headerHTML + contentHTML;
    const positionCells = warningElement.querySelectorAll(".position-cell");
    positionCells.forEach((cell) => {
      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(cell.dataset.index);
        const length = parseInt(cell.dataset.length);
        chatInputElement.focus();
        chatInputElement.setSelectionRange(index, index + length);
        const textBeforeSelection = chatInputElement.value.substring(0, index);
        const lines = textBeforeSelection.split("\n");
        const computedStyle = window.getComputedStyle(chatInputElement);
        const lineHeight =
          parseInt(computedStyle.lineHeight) ||
          parseInt(computedStyle.fontSize) * 1.2;
        const targetLine = lines.length - 1;
        const scrollPosition = targetLine * lineHeight;
        chatInputElement.scrollTop = Math.max(
          0,
          scrollPosition - lineHeight * 2
        );
      });
    });
  }
  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  function maskText(text, rule) {
    if (!rule.masking || !rule.masking.enabled) {
      return text;
    }
    const maskChar = rule.masking.pattern || "*";
    if (rule.masking.mode === "variable_value") {
      return maskVariableValue(text, rule);
    } else {
      return maskDirectText(text, rule);
    }
  }
  function maskVariableValue(text, rule) {
    return text.replace(
      new RegExp(rule.pattern),
      (match, varName, value, offset, string) => {
        const quotes = match.match(/["']/)[0];
        const maskedValue = "*".repeat(rule.masking.fixedLength || 3);
        return `${varName} = ${quotes}${maskedValue}${quotes}`;
      }
    );
  }
  function maskDirectText(text, rule) {
    if (rule.masking.preserveFormat) {
      return text.replace(/\S/g, rule.masking.pattern || "*");
    }
    let maskedText = text;
    const start = rule.masking.preserveStart || 0;
    const end = rule.masking.preserveEnd || 0;
    if (start > 0 || end > 0) {
      const textLength = text.length;
      const prefix = start > 0 ? text.substring(0, start) : "";
      const suffix = end > 0 ? text.substring(textLength - end) : "";
      const maskLength = textLength - start - end;
      const maskedPart = (rule.masking.pattern || "*").repeat(
        rule.masking.preserveLength ? maskLength : 3
      );
      maskedText = prefix + maskedPart + suffix;
    } else if (rule.masking.preserveLength) {
      maskedText = (rule.masking.pattern || "*").repeat(text.length);
    } else {
      maskedText = (rule.masking.pattern || "*").repeat(3);
    }
    return maskedText;
  }
  function hideShieldWarning() {
    const warningElement = document.getElementById("shield-warning-tooltip");
    if (warningElement) {
      warningElement.remove();
    }
  }
  function setupModalContainer() {
    modalContainer = document.createElement("div");
    modalContainer.id = "shield-checker-modal-container";
    modalContainer.style.display = "none";
    const modalContent = createModalContent();
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
  }
  function createModalContent() {
    const modalContent = document.createElement("div");
    modalContent.className = "shield-checker-modal";
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Content Shield</h3>
        <button class="ml-2 text-blue-400 text-lg hint--bottom-left hint--rounded hint--large" aria-label="Configure shield rules to detect sensitive information in chat messages. The extension will highlight potentially sensitive information with a red border around the chat input.">ⓘ</button>
      </div>
      <div class="modal-section">
        <div class="flex items-center justify-between">
          <label class="modal-section-title">Enable Content Shield</label>
          <div class="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" id="shield-checker-toggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${
              config.enabled ? "checked" : ""
            }>
            <label for="shield-checker-toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-500 cursor-pointer"></label>
          </div>
        </div>
      </div>
      <div class="modal-section">
        <div class="flex items-center justify-between mb-2">
          <label id="shield-rules-title" class="modal-section-title">Content Shield Rules (${
            config.rules.length
          })</label>
          <div class="flex space-x-2">
            <button id="delete-all-rules-btn" class="button button-danger" title="Delete all shield rules">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete All
            </button>
            <button id="add-rule-btn" class="button button-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Rule
            </button>
          </div>
        </div>
        <div id="shield-rules-list" class="space-y-2 max-h-[300px] overflow-y-auto">
          <!-- Rules will be populated here -->
        </div>
      </div>
      <div class="modal-section">
        <div class="flex items-center justify-between mb-2">
          <label class="modal-section-title">Appearance</label>
          <button id="toggle-style-settings" class="button button-primary text-xs py-1">
            <span id="toggle-style-text">Show</span> <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1" id="toggle-style-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
        <div id="style-settings-content" class="space-y-3" style="display: none;">
          <div class="form-group">
            <label for="highlight-color-input">Highlight Color</label>
            <div class="flex items-center">
              <input type="color" id="highlight-color-input" value="${
                config.styles.highlightColor
              }" 
                style="width: 50px; height: 30px; background: transparent; border: none; padding: 0; margin-right: 10px;">
              <input type="text" id="highlight-color-text" value="${
                config.styles.highlightColor
              }" 
                style="flex: 1;">
            </div>
          </div>
          <div class="form-group">
            <label for="border-width-input">Border Width</label>
            <select id="border-width-input" class="w-full">
              <option value="1px" ${
                config.styles.borderWidth === "1px" ? "selected" : ""
              }>Thin (1px)</option>
              <option value="2px" ${
                config.styles.borderWidth === "2px" ? "selected" : ""
              }>Medium (2px)</option>
              <option value="3px" ${
                config.styles.borderWidth === "3px" ? "selected" : ""
              }>Thick (3px)</option>
              <option value="4px" ${
                config.styles.borderWidth === "4px" ? "selected" : ""
              }>Very Thick (4px)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="warning-header-bg-input">Warning Header Color</label>
            <div class="flex items-center">
              <input type="color" id="warning-header-bg-input" value="${
                config.styles.warningHeaderBg
              }" 
                style="width: 50px; height: 30px; background: transparent; border: none; padding: 0; margin-right: 10px;">
              <input type="text" id="warning-header-text" value="${
                config.styles.warningHeaderBg
              }" 
                style="flex: 1;">
            </div>
          </div>
          <div class="form-group">
            <label>Menu & Keyboard Controls</label>
            <div class="space-y-2">
              <div class="flex items-center">
                <input type="checkbox" id="menu-visibility" class="mr-2" style="width: auto; appearance: auto; -webkit-appearance: auto; opacity: 1; position: static;" ${
                  config.menuButton.show ? "checked" : ""
                }>
                <label for="menu-visibility" class="text-sm" style="color: rgb(161, 161, 170);">Add to Typingmind Menu</label>
              </div>
              <div class="flex items-center">
                <label for="keyboard-shortcut" class="text-sm mr-2 w-32">Keyboard Shortcut:</label>
                <div class="relative flex-grow">
                  <input type="text" id="keyboard-shortcut" value="${
                    config.menuButton.shortcut
                  }" 
                    class="w-full" ${!config.menuButton.show ? "required" : ""}>
                  <button id="record-shortcut" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-400 hover:text-blue-500">
                    Record
                  </button>
                </div>
              </div>
              <p class="text-xs text-gray-400">Press the Record button and type your desired shortcut (e.g., Shift+Alt+P)</p>
              <div id="shortcut-error" class="text-red-500 text-xs hidden">A keyboard shortcut is required when extension is hidden from menu</div>
            </div>
          </div>
          <div class="form-group menu-placement-section" ${
            !config.menuButton.show ? 'style="opacity:0.5;"' : ""
          }>
            <label for="menu-placement">Menu Icon Placement</label>
            <div class="flex items-center space-x-2">
              <select id="placement-position" class="flex-1" ${
                !config.menuButton.show ? "disabled" : ""
              }>
                <option value="before" ${
                  config.placement.position === "before" ? "selected" : ""
                }>Before</option>
                <option value="after" ${
                  config.placement.position === "after" ? "selected" : ""
                }>After</option>
              </select>
              <select id="placement-reference" class="flex-1" ${
                !config.menuButton.show ? "disabled" : ""
              }>
                ${generateMenuItemOptions()}
              </select>
            </div>
            <p class="text-xs text-gray-400 mt-1">Placement will take effect after saving</p>
          </div>
          <button id="save-styles-btn" class="button button-primary mt-2">Save Styles</button>
        </div>
      </div>
      <div class="button-group">
        <button id="export-rules-btn" class="button button-primary" title="Export your rules to share or backup">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export
        </button>
        <button id="import-rules-btn" class="button button-primary" title="Import rules from another instance">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Import
        </button>
        <div style="flex-grow: 1;"></div>
        <button id="close-shield-modal" class="button button-danger">Close</button>
      </div>
    `;
    rulesList = modalContent.querySelector("#shield-rules-list");
    modalContent.addEventListener("click", (e) => {
      if (e.target.id === "close-shield-modal") {
        togglePrivacyModal();
      } else if (e.target.id === "add-rule-btn") {
        addNewRule();
      } else if (e.target.id === "delete-all-rules-btn") {
        deleteAllRules();
      } else if (e.target.id === "shield-checker-toggle") {
        toggleShieldChecker();
      } else if (e.target.id === "save-styles-btn") {
        saveStyleSettings();
      } else if (
        e.target.id === "toggle-style-settings" ||
        e.target.closest("#toggle-style-settings")
      ) {
        toggleStyleSettings();
      } else if (
        e.target.id === "export-rules-btn" ||
        e.target.closest("#export-rules-btn")
      ) {
        exportRules();
      } else if (
        e.target.id === "import-rules-btn" ||
        e.target.closest("#import-rules-btn")
      ) {
        importRules();
      } else if (e.target.id === "record-shortcut") {
        recordShortcut(e);
      }
      e.stopPropagation();
    });
    modalContent.addEventListener("input", (e) => {
      if (e.target.id === "highlight-color-input") {
        document.getElementById("highlight-color-text").value = e.target.value;
        applyStyleChanges();
      } else if (e.target.id === "highlight-color-text") {
        document.getElementById("highlight-color-input").value = e.target.value;
        applyStyleChanges();
      } else if (e.target.id === "warning-header-bg-input") {
        document.getElementById("warning-header-text").value = e.target.value;
        applyStyleChanges();
      } else if (e.target.id === "warning-header-text") {
        document.getElementById("warning-header-bg-input").value =
          e.target.value;
        applyStyleChanges();
      } else if (e.target.id === "border-width-input") {
        applyStyleChanges();
      } else if (e.target.id === "menu-visibility") {
        const isHidden = !e.target.checked;
        const placementSection = document.querySelector(
          ".menu-placement-section"
        );
        const placementPosition = document.getElementById("placement-position");
        const placementReference = document.getElementById(
          "placement-reference"
        );
        const shortcutInput = document.getElementById("keyboard-shortcut");
        const shortcutError = document.getElementById("shortcut-error");
        if (placementSection) {
          placementSection.style.opacity = !isHidden ? "1" : "0.5";
          placementPosition.disabled = isHidden;
          placementReference.disabled = isHidden;
        }
        if (
          isHidden &&
          (!shortcutInput.value || shortcutInput.value.trim() === "")
        ) {
          shortcutError.classList.remove("hidden");
          shortcutInput.setAttribute("required", "required");
        } else {
          shortcutError.classList.add("hidden");
          if (!isHidden) shortcutInput.removeAttribute("required");
        }
      }
    });
    return modalContent;
  }
  function generateMenuItemOptions() {
    let options = "";
    const sortedItems = Object.values(menuItems).sort(
      (a, b) => a.order - b.order
    );
    sortedItems.forEach((item) => {
      const selected =
        item.id === config.placement.referenceElement ? "selected" : "";
      options += `<option value="${item.id}" ${selected}>${item.label}</option>`;
    });
    return options;
  }
  function toggleShieldChecker() {
    config.enabled = !config.enabled;
    saveConfig();
    const toggle = document.getElementById("shield-checker-toggle");
    if (toggle) {
      toggle.checked = config.enabled;
    }
    checkForSensitiveInfo();
  }
  function togglePrivacyModal() {
    if (modalContainer.style.display === "none") {
      scanMenuItems();
      modalContainer.style.display = "flex";
      populateRulesList();
      const styleContent = document.getElementById("style-settings-content");
      if (styleContent) {
        styleContent.style.display = "none";
      }
      const toggleText = document.getElementById("toggle-style-text");
      if (toggleText) {
        toggleText.textContent = "Show";
      }
      const toggleIcon = document.getElementById("toggle-style-icon");
      if (toggleIcon) {
        toggleIcon.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
      }
      const closeOnOutsideClick = (e) => {
        if (e.target === modalContainer) {
          togglePrivacyModal();
          modalContainer.removeEventListener("click", closeOnOutsideClick);
        }
      };
      modalContainer.addEventListener("click", closeOnOutsideClick);
    } else {
      modalContainer.style.display = "none";
    }
  }
  function populateRulesList() {
    if (!rulesList) return;
    rulesList.innerHTML = "";
    const rulesTitle = document.querySelector("#shield-rules-title");
    if (rulesTitle) {
      rulesTitle.textContent = `Shield Rules (${config.rules.length})`;
    }
    config.rules.forEach((rule) => {
      const ruleElement = document.createElement("div");
      ruleElement.className = "rule-item";
      ruleElement.dataset.ruleId = rule.id;
      ruleElement.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input type="checkbox" class="rule-toggle mr-2" ${
              rule.active ? "checked" : ""
            }>
            <span class="rule-name font-medium text-white">${rule.name}</span>
          </div>
          <div class="flex space-x-2">
            <button class="edit-rule-btn icon-button edit" title="Edit Rule">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="delete-rule-btn icon-button delete" title="Delete Rule">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="rule-details">
          Type: ${rule.type === "regex" ? "Regular Expression" : "String Match"}
          <br>
          Pattern: <code>${rule.pattern}</code>
          ${
            rule.type === "string"
              ? `<br>Case Sensitive: ${rule.caseSensitive ? "Yes" : "No"}`
              : ""
          }
          ${
            rule.description
              ? `<br>Description: <span class="text-gray-400">${rule.description}</span>`
              : ""
          }
        </div>
      `;
      const toggleCheckbox = ruleElement.querySelector(".rule-toggle");
      toggleCheckbox.addEventListener("change", (e) => {
        toggleRule(rule.id, toggleCheckbox.checked);
        e.stopPropagation();
      });
      const editButton = ruleElement.querySelector(".edit-rule-btn");
      editButton.addEventListener("click", (e) => {
        editRule(rule.id);
        e.stopPropagation();
      });
      const deleteButton = ruleElement.querySelector(".delete-rule-btn");
      deleteButton.addEventListener("click", (e) => {
        deleteRule(rule.id);
        e.stopPropagation();
      });
      rulesList.appendChild(ruleElement);
    });
  }
  function toggleRule(ruleId, active) {
    const ruleIndex = config.rules.findIndex((r) => r.id === ruleId);
    if (ruleIndex !== -1) {
      config.rules[ruleIndex].active = active;
      saveConfig();
      checkForSensitiveInfo();
    }
  }
  function addNewRule() {
    showRuleEditor();
  }
  function editRule(ruleId) {
    const rule = config.rules.find((r) => r.id === ruleId);
    if (rule) {
      showRuleEditor(rule);
    }
  }
  function deleteRule(ruleId) {
    if (confirm("Are you sure you want to delete this rule?")) {
      config.rules = config.rules.filter((r) => r.id !== ruleId);
      saveConfig();
      populateRulesList();
      checkForSensitiveInfo();
    }
  }
  function showRuleEditor(existingRule = null) {
    const editorOverlay = document.createElement("div");
    editorOverlay.className = "rule-editor-overlay";
    editorOverlay.style.position = "fixed";
    editorOverlay.style.top = "0";
    editorOverlay.style.left = "0";
    editorOverlay.style.right = "0";
    editorOverlay.style.bottom = "0";
    editorOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    editorOverlay.style.backdropFilter = "blur(4px)";
    editorOverlay.style.webkitBackdropFilter = "blur(4px)";
    editorOverlay.style.zIndex = "100001";
    editorOverlay.style.display = "flex";
    editorOverlay.style.justifyContent = "center";
    editorOverlay.style.alignItems = "center";
    editorOverlay.style.padding = "1rem";
    editorOverlay.style.animation = "fadeIn 0.2s ease-out";
    const editorContent = document.createElement("div");
    editorContent.className = "shield-checker-modal";
    editorContent.style.animation = "slideIn 0.3s ease-out";
    editorContent.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${
          existingRule ? "Edit Rule" : "Add New Rule"
        }</h3>
      </div>
      <div class="modal-section">
        <div class="form-group">
          <label for="rule-name-input">Rule Name</label>
          <input type="text" id="rule-name-input" value="${
            existingRule ? existingRule.name : ""
          }">
        </div>
        <div class="form-group">
          <label for="rule-type-input">Rule Type</label>
          <select id="rule-type-input">
            <option value="string" ${
              existingRule && existingRule.type === "string" ? "selected" : ""
            }>String Match</option>
            <option value="regex" ${
              existingRule && existingRule.type === "regex" ? "selected" : ""
            }>Regular Expression</option>
            <option value="variable" ${
              existingRule && existingRule.type === "variable" ? "selected" : ""
            }>Variable Assignment</option>
          </select>
        </div>
        <div class="form-group">
          <label for="rule-pattern-input">Pattern</label>
          <input type="text" id="rule-pattern-input" value="${
            existingRule ? existingRule.pattern : ""
          }">
        </div>
        <div class="form-group">
          <label for="rule-description-input">Description (Optional)</label>
          <textarea id="rule-description-input" rows="2" placeholder="Describe what this rule detects...">${
            existingRule ? existingRule.description || "" : ""
          }</textarea>
        </div>
        <div id="case-sensitive-container" class="form-group" ${
          existingRule && existingRule.type !== "string"
            ? 'style="display:none;"'
            : ""
        }>
          <label class="flex items-center">
            <input type="checkbox" id="case-sensitive-input" class="mr-2" style="width: auto; appearance: auto; -webkit-appearance: auto; opacity: 1; position: static;" ${
              existingRule &&
              existingRule.type === "string" &&
              existingRule.caseSensitive
                ? "checked"
                : ""
            }>
            <span>Case Sensitive</span>
          </label>
        </div>
        <div id="regex-validation-message" class="validation-message" style="display: none; color: #f87171; font-size: 12px; margin-top: 6px;"></div>
      </div>
      <div class="button-group">
        <button id="cancel-rule-edit" class="button button-secondary">Cancel</button>
        <button id="save-rule-edit" class="button button-primary">Save</button>
      </div>
    `;
    const ruleTypeInput = editorContent.querySelector("#rule-type-input");
    const caseSensitiveContainer = editorContent.querySelector(
      "#case-sensitive-container"
    );
    const patternInput = editorContent.querySelector("#rule-pattern-input");
    const descriptionInput = editorContent.querySelector(
      "#rule-description-input"
    );
    const validationMessage = editorContent.querySelector(
      "#regex-validation-message"
    );
    ruleTypeInput.addEventListener("change", () => {
      caseSensitiveContainer.style.display =
        ruleTypeInput.value === "string" ? "block" : "none";
      validationMessage.style.display = "none";
      if (ruleTypeInput.value === "regex" && patternInput.value) {
        validateRegex(patternInput.value);
      }
    });
    patternInput.addEventListener("input", () => {
      if (ruleTypeInput.value === "regex") {
        validateRegex(patternInput.value);
      } else {
        validationMessage.style.display = "none";
      }
    });
    function validateRegex(pattern) {
      try {
        new RegExp(pattern);
        validationMessage.style.display = "none";
        return true;
      } catch (e) {
        validationMessage.textContent = `Invalid regex: ${e.message}`;
        validationMessage.style.display = "block";
        return false;
      }
    }
    const cancelButton = editorContent.querySelector("#cancel-rule-edit");
    cancelButton.addEventListener("click", (e) => {
      document.body.removeChild(editorOverlay);
      e.stopPropagation();
    });
    const saveButton = editorContent.querySelector("#save-rule-edit");
    saveButton.addEventListener("click", (e) => {
      const nameInput = editorContent.querySelector("#rule-name-input");
      const patternInput = editorContent.querySelector("#rule-pattern-input");
      const descriptionInput = editorContent.querySelector(
        "#rule-description-input"
      );
      const caseSensitiveInput = editorContent.querySelector(
        "#case-sensitive-input"
      );
      const name = nameInput.value.trim();
      const type = ruleTypeInput.value;
      const pattern = patternInput.value;
      const description = descriptionInput.value.trim();
      const caseSensitive =
        type === "string" ? caseSensitiveInput.checked : undefined;
      if (!name || !pattern) {
        alert("Name and pattern are required");
        return;
      }
      if (type === "regex" && !validateRegex(pattern)) {
        return;
      }
      if (existingRule) {
        const ruleIndex = config.rules.findIndex(
          (r) => r.id === existingRule.id
        );
        if (ruleIndex !== -1) {
          config.rules[ruleIndex] = {
            ...config.rules[ruleIndex],
            name,
            type,
            pattern,
            description,
            ...(type === "string" ? { caseSensitive } : {}),
          };
        }
      } else {
        config.rules.push({
          id: config.nextRuleId++,
          name,
          type,
          pattern,
          description,
          active: true,
          ...(type === "string" ? { caseSensitive } : {}),
        });
      }
      saveConfig();
      populateRulesList();
      checkForSensitiveInfo();
      document.body.removeChild(editorOverlay);
      e.stopPropagation();
    });
    editorOverlay.appendChild(editorContent);
    document.body.appendChild(editorOverlay);
    editorContent.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    editorOverlay.addEventListener("click", (e) => {
      document.body.removeChild(editorOverlay);
      e.stopPropagation();
    });
  }
  function toggleStyleSettings() {
    const styleContent = document.getElementById("style-settings-content");
    const toggleText = document.getElementById("toggle-style-text");
    const toggleIcon = document.getElementById("toggle-style-icon");
    if (styleContent.style.display === "none") {
      styleContent.style.display = "block";
      toggleText.textContent = "Hide";
      toggleIcon.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
    } else {
      styleContent.style.display = "none";
      toggleText.textContent = "Show";
      toggleIcon.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
    }
  }
  function applyStyleChanges() {
    const highlightColor = document.getElementById(
      "highlight-color-text"
    ).value;
    const borderWidth = document.getElementById("border-width-input").value;
    const warningHeaderBg = document.getElementById(
      "warning-header-text"
    ).value;
    if (lastActiveMatches.length > 0) {
      chatInputElement.style.border = `${borderWidth} solid ${highlightColor}`;
      chatInputElement.style.boxShadow = `0 0 5px ${highlightColor}`;
      const warningHeader = document.querySelector(".shield-warning-header");
      if (warningHeader) {
        warningHeader.style.backgroundColor = warningHeaderBg;
      }
      const highlightedTexts = document.querySelectorAll(
        ".shield-warning-cell code"
      );
      highlightedTexts.forEach((elem) => {
        elem.style.backgroundColor = `rgba(${hexToRgb(highlightColor)}, 0.3)`;
      });
    }
  }
  function saveStyleSettings() {
    const highlightColor = document.getElementById(
      "highlight-color-text"
    ).value;
    const borderWidth = document.getElementById("border-width-input").value;
    const warningHeaderBg = document.getElementById(
      "warning-header-text"
    ).value;
    const placementPosition =
      document.getElementById("placement-position").value;
    const placementReference = document.getElementById(
      "placement-reference"
    ).value;
    const menuVisibility = document.getElementById("menu-visibility").checked;
    const keyboardShortcut = document.getElementById("keyboard-shortcut").value;
    if (
      !menuVisibility &&
      (!keyboardShortcut || keyboardShortcut.trim() === "")
    ) {
      document.getElementById("shortcut-error").classList.remove("hidden");
      return;
    }
    config.styles.highlightColor = highlightColor;
    config.styles.borderWidth = borderWidth;
    config.styles.warningHeaderBg = warningHeaderBg;
    const placementChanged =
      config.placement.position !== placementPosition ||
      config.placement.referenceElement !== placementReference;
    config.placement.position = placementPosition;
    config.placement.referenceElement = placementReference;
    const menuButtonChanged =
      config.menuButton.show !== menuVisibility ||
      config.menuButton.shortcut !== keyboardShortcut;
    config.menuButton.show = menuVisibility;
    config.menuButton.shortcut = keyboardShortcut;
    saveConfig();
    if (lastActiveMatches.length > 0) {
      updateChatInputStyle(true);
    }
    if (menuButtonChanged) {
      setupKeyboardShortcut();
      if (menuVisibility) {
        if (!privacyButton || !privacyButton.parentNode) {
          setupShieldButton();
        } else if (placementChanged) {
          setupShieldButton();
        }
      } else if (privacyButton && privacyButton.parentNode) {
        privacyButton.parentNode.removeChild(privacyButton);
        privacyButton = null;
      }
    } else if (placementChanged && menuVisibility) {
      setupShieldButton();
    }
    const saveBtn = document.getElementById("save-styles-btn");
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saved!";
    saveBtn.disabled = true;
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 1500);
  }
  function exportRules() {
    const headers = [
      "id",
      "type",
      "pattern",
      "name",
      "active",
      "description",
      "caseSensitive",
    ];
    const rows = [
      headers.join("\t"),
      ...config.rules.map((rule) => {
        return [
          rule.id,
          rule.type,
          rule.pattern,
          rule.name,
          rule.active,
          rule.description || "",
          rule.caseSensitive || "",
        ].join("\t");
      }),
    ];
    const tsvContent = rows.join("\n");
    const blob = new Blob([tsvContent], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "typingmind-contentshield-rules.tsv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
  function importRules() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".tsv";
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        try {
          const lines = event.target.result.split("\n");
          const headers = lines[0].split("\t");
          const importedRules = lines
            .slice(1)
            .filter((line) => line.trim())
            .map((line) => {
              const values = line.split("\t");
              const rule = {
                id: parseInt(values[0]),
                type: values[1],
                pattern: values[2],
                name: values[3],
                active: values[4] === "true",
                description: values[5],
              };
              if (rule.type === "string") {
                rule.caseSensitive = values[6] === "true";
              }
              return rule;
            });
          let addedCount = 0;
          let skippedCount = 0;
          importedRules.forEach((importedRule) => {
            if (importedRule.type === "regex") {
              try {
                new RegExp(importedRule.pattern);
              } catch (e) {
                console.warn(
                  `Invalid regex in rule "${importedRule.name}": ${e.message}`
                );
                skippedCount++;
                return;
              }
            }
            const ruleExists = config.rules.some(
              (existingRule) =>
                existingRule.type === importedRule.type &&
                existingRule.pattern === importedRule.pattern
            );
            if (!ruleExists) {
              const newId = config.nextRuleId++;
              config.rules.push({
                ...importedRule,
                id: newId,
              });
              addedCount++;
            }
          });
          saveConfig();
          populateRulesList();
          checkForSensitiveInfo();
          const skipMessage =
            skippedCount > 0
              ? ` (${skippedCount} rules skipped due to validation errors)`
              : "";
          alert(
            `Import complete. Added ${addedCount} new rules${skipMessage}.`
          );
        } catch (error) {
          console.error("Import error:", error);
          alert(`Error importing rules: ${error.message}`);
        }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }
  function setupKeyboardShortcut() {
    document.removeEventListener("keydown", handleKeyboardShortcut);
    document.addEventListener("keydown", handleKeyboardShortcut);
  }
  function handleKeyboardShortcut(e) {
    const shortcut = parseShortcut(config.menuButton.shortcut);
    if (isShortcutMatch(e, shortcut)) {
      e.preventDefault();
      togglePrivacyModal();
    }
  }
  function parseShortcut(shortcutStr) {
    const keys = shortcutStr.split("+");
    return {
      ctrl: keys.includes("Ctrl"),
      alt: keys.includes("Alt"),
      shift: keys.includes("Shift"),
      key: keys[keys.length - 1],
    };
  }
  function isShortcutMatch(event, shortcut) {
    return (
      event.ctrlKey === shortcut.ctrl &&
      event.altKey === shortcut.alt &&
      event.shiftKey === shortcut.shift &&
      (event.key.toLowerCase() === shortcut.key.toLowerCase() ||
        event.code === "Key" + shortcut.key.toUpperCase())
    );
  }
  function recordShortcut(e) {
    e.preventDefault();
    const shortcutInput = document.getElementById("keyboard-shortcut");
    const recordBtn = document.getElementById("record-shortcut");
    recordBtn.textContent = "Listening...";
    recordBtn.classList.add("text-red-500");
    shortcutInput.value = "";
    shortcutInput.placeholder = "Type a key combination...";
    shortcutInput.focus();
    let modifiers = {
      ctrl: false,
      alt: false,
      shift: false,
      key: "",
    };
    function updateInputValue() {
      let parts = [];
      if (modifiers.ctrl) parts.push("Ctrl");
      if (modifiers.alt) parts.push("Alt");
      if (modifiers.shift) parts.push("Shift");
      if (modifiers.key && !/^(Control|Alt|Shift)$/.test(modifiers.key)) {
        parts.push(modifiers.key);
      }
      shortcutInput.value = parts.join("+");
      const hideMenu = document.getElementById("menu-visibility").checked;
      const shortcutError = document.getElementById("shortcut-error");
      if (hideMenu && shortcutInput.value.trim() !== "") {
        shortcutError.classList.add("hidden");
      }
    }
    function handleKeyDown(evt) {
      evt.preventDefault();
      if (evt.key === "Control" || evt.key === "Ctrl") {
        modifiers.ctrl = true;
      } else if (evt.key === "Alt") {
        modifiers.alt = true;
      } else if (evt.key === "Shift") {
        modifiers.shift = true;
      } else {
        if (evt.code.startsWith("Key")) {
          modifiers.key = evt.code.replace("Key", "");
        } else {
          modifiers.key = evt.key;
        }
        updateInputValue();
        stopListening();
      }
      updateInputValue();
    }
    function handleKeyUp(evt) {
      if (evt.key === "Control" || evt.key === "Ctrl") {
        modifiers.ctrl = false;
      } else if (evt.key === "Alt") {
        modifiers.alt = false;
      } else if (evt.key === "Shift") {
        modifiers.shift = false;
      }
      updateInputValue();
    }
    function stopListening() {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      recordBtn.textContent = "Record";
      recordBtn.classList.remove("text-red-500");
      shortcutInput.placeholder = "";
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    function documentClickHandler(evt) {
      if (evt.target !== shortcutInput && evt.target !== recordBtn) {
        stopListening();
        window.removeEventListener("click", documentClickHandler);
      }
    }
    setTimeout(() => {
      window.addEventListener("click", documentClickHandler);
    }, 100);
  }
  function addStyles() {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .toggle-checkbox:checked {
        right: 0;
        border-color: #68D391;
      }
      .toggle-checkbox:checked + .toggle-label {
        background-color: #68D391;
      }
      .toggle-label {
        transition: background-color 0.2s ease;
      }
      .toggle-checkbox:focus {
        outline: none;
        box-shadow: none;
      }
      .shield-warning-tooltip {
        position: absolute;
        top: 100%;
        left: 0;
        background-color: #1f1f1f;
        color: white;
        padding: 0;
        border-radius: 6px;
        z-index: 1000;
        margin-top: 50px;
        font-size: 12px;
        max-width: 500px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
      }
      .shield-warning-header {
        padding: 8px 12px;
        font-weight: bold;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
      }
      .shield-warning-title {
        display: flex;
        align-items: center;
      }
      .shield-warning-icon {
        margin-right: 8px;
      }
      .shield-warning-content {
        padding: 10px;
      }
      .shield-warning-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .shield-warning-header-row {
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        text-align: left;
      }
      .shield-warning-header-cell {
        padding: 5px;
      }
      .shield-warning-row {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .shield-warning-cell {
        padding: 5px;
      }
      .shield-warning-cell code {
        padding: 2px 4px;
        border-radius: 3px;
      }
      .shield-warning-no-matches {
        text-align: center;
        margin: 10px 0;
      }
      .shield-warning {
        position: absolute;
        top: 100%;
        left: 0;
        color: white;
        padding: 8px;
        border-radius: 4px;
        z-index: 1000;
        margin-top: 50px;
        font-size: 12px;
        max-width: 300px;
      }
      #shield-checker-modal-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        overflow-y: auto;
        animation: fadeIn 0.2s ease-out;
      }
      .shield-checker-modal {
        display: inline-block;
        width: 100%;
        background-color: rgb(9, 9, 11);
        border-radius: 0.5rem;
        padding: 1rem;
        text-align: left;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        transform: translateY(0);
        transition: all 0.3s ease-in-out;
        max-width: 32rem;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
        position: relative;
        z-index: 100000;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .icon-button {
        background: transparent;
        border: none;
        padding: 4px;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: all 0.2s;
      }
      .icon-button:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
      }
      .icon-button.edit {
        color: #60a5fa;
      }
      .icon-button.delete {
        color: #f87171;
      }
      [class*="hint--"] {
        position: relative;
        display: inline-block;
      }
      [class*="hint--"]::before,
      [class*="hint--"]::after {
        position: absolute;
        transform: translate3d(0, 0, 0);
        visibility: hidden;
        opacity: 0;
        z-index: 100000;
        pointer-events: none;
        transition: 0.3s ease;
        transition-delay: 0ms;
      }
      [class*="hint--"]::before {
        content: '';
        position: absolute;
        background: transparent;
        border: 6px solid transparent;
        z-index: 100000;
      }
      [class*="hint--"]::after {
        content: attr(aria-label);
        background: #383838;
        color: white;
        padding: 8px 10px;
        font-size: 12px;
        line-height: 16px;
        white-space: pre-wrap;
        box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.3);
        max-width: 400px !important;
        min-width: 200px !important;
        width: auto !important;
        border-radius: 4px;
      }
      .hint--top::after,
      .hint--top-right::after,
      .hint--top-left::after,
      .hint--bottom::after,
      .hint--bottom-right::after,
      .hint--bottom-left::after {
        max-width: 400px !important;
        min-width: 200px !important;
        width: auto !important;
      }
      [class*="hint--"]:hover::before,
      [class*="hint--"]:hover::after {
        visibility: visible;
        opacity: 1;
      }
      .hint--top::before {
        border-top-color: #383838;
        margin-bottom: -12px;
      }
      .hint--top::after {
        margin-bottom: -6px;
      }
      .hint--top::before,
      .hint--top::after {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
      }
      .hint--top-right::before {
        border-top-color: #383838;
        margin-bottom: -12px;
      }
      .hint--top-right::after {
        margin-bottom: -6px;
      }
      .hint--top-right::before,
      .hint--top-right::after {
        bottom: 100%;
        left: 0;
      }
      .hint--top-left::before {
        border-top-color: #383838;
        margin-bottom: -12px;
      }
      .hint--top-left::after {
        margin-bottom: -6px;
      }
      .hint--top-left::before,
      .hint--top-left::after {
        bottom: 100%;
        right: 0;
      }
      .hint--bottom::before {
        border-bottom-color: #383838;
        margin-top: -12px;
      }
      .hint--bottom::after {
        margin-top: -6px;
      }
      .hint--bottom::before,
      .hint--bottom::after {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
      }
      .hint--bottom-right::before {
        border-bottom-color: #383838;
        margin-top: -12px;
      }
      .hint--bottom-right::after {
        margin-top: -6px;
      }
      .hint--bottom-right::before,
      .hint--bottom-right::after {
        top: 100%;
        left: 0;
      }
      .hint--bottom-left::before {
        border-bottom-color: #383838;
        margin-top: -12px;
      }
      .hint--bottom-left::after {
        margin-top: -6px;
      }
      .hint--bottom-left::before,
      .hint--bottom-left::after {
        top: 100%;
        right: 0;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      .modal-header {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .modal-title {
        font-size: 1.25rem;
        font-weight: bold;
        text-align: center;
        color: white;
      }
      .modal-section {
        margin-top: 1rem;
        background-color: rgb(39, 39, 42);
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid rgb(63, 63, 70);
      }
      .modal-section-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: rgb(161, 161, 170);
        margin-bottom: 0.25rem;
      }
      .form-group {
        margin-bottom: 0.75rem;
      }
      .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: rgb(161, 161, 170);
        margin-bottom: 0.25rem;
      }
      .form-group input,
      .form-group select {
        width: 100%;
        padding: 0.375rem 0.5rem;
        border: 1px solid rgb(63, 63, 70);
        border-radius: 0.375rem;
        background-color: rgb(39, 39, 42);
        color: white;
        font-size: 0.875rem;
        line-height: 1.25rem;
        outline: none;
      }
      .form-group input:focus,
      .form-group select:focus {
        border-color: rgb(59, 130, 246);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      .button-group {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }
      .button {
        display: inline-flex;
        align-items: center;
        padding: 0.375rem 0.75rem;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.25rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .button-primary {
        background-color: rgb(37, 99, 235);
        color: white;
      }
      .button-primary:hover {
        background-color: rgb(29, 78, 216);
      }
      .button-secondary {
        background-color: rgb(82, 82, 91);
        color: white;
      }
      .button-secondary:hover {
        background-color: rgb(63, 63, 70);
      }
      .button-danger {
        background-color: rgb(220, 38, 38);
        color: white;
      }
      .button-danger:hover {
        background-color: rgb(185, 28, 28);
      }
      .button:disabled {
        background-color: rgb(82, 82, 91);
        cursor: not-allowed;
        opacity: 0.5;
      }
      .rule-item {
        background-color: #1d1d21;
        border: 1px solid rgb(63, 63, 70);
        border-radius: 0.375rem;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .rule-details {
        color: rgb(161, 161, 170);
        font-size: 0.75rem;
        margin-top: 0.25rem;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      .rule-details code {
        background-color: rgb(24, 24, 27);
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        word-break: break-all;
        white-space: normal;
        display: inline-block;
      }
      .masking-indicator {
        display: inline-flex;
        align-items: center;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        margin-left: 0.5rem;
      }
      .masking-enabled {
        background-color: rgba(34, 197, 94, 0.2);
        color: rgb(34, 197, 94);
      }
      .masking-disabled {
        background-color: rgba(239, 68, 68, 0.2);
        color: rgb(239, 68, 68);
      }
      #style-settings-content {
        overflow: hidden;
        transition: all 0.3s ease;
      }
      #toggle-style-icon {
        transition: transform 0.3s ease;
      }
      .confirmation-dialog {
        position: relative;
        z-index: 100003;
        animation: confirmIn 0.2s ease-out;
      }
      @keyframes confirmIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .form-group textarea {
        width: 100%;
        padding: 0.375rem 0.5rem;
        border: 1px solid rgb(63, 63, 70);
        border-radius: 0.375rem;
        background-color: rgb(39, 39, 42);
        color: white;
        font-size: 0.875rem;
        line-height: 1.25rem;
        outline: none;
        resize: vertical;
        min-height: 60px;
      }
      .form-group textarea:focus {
        border-color: rgb(59, 130, 246);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      .rule-details .text-gray-400 {
        color: rgb(156, 163, 175);
        font-style: italic;
      }
    `;
    document.head.appendChild(styleElement);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      addStyles();
      init();
    });
  } else {
    addStyles();
    init();
  }
  function deleteAllRules() {
    const confirmDialog = document.createElement("div");
    confirmDialog.className = "shield-checker-modal confirmation-dialog";
    confirmDialog.style.maxWidth = "24rem";
    confirmDialog.style.position = "relative";
    confirmDialog.style.zIndex = "100003";
    confirmDialog.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title text-red-500">Delete All Rules</h3>
      </div>
      <div class="modal-section">
        <p class="text-white mb-4">Are you sure you want to delete ALL ${config.rules.length} shield rules? This action cannot be undone.</p>
        <p class="text-gray-400 text-sm mb-4">You might want to export your rules first as a backup. Note that the checkbox is for activating/deactivating rules, not for selectively deleting them.</p>
        <div class="flex justify-end space-x-2">
          <button id="cancel-delete-all" class="button button-secondary">Cancel</button>
          <button id="confirm-delete-all" class="button button-danger">Delete All Rules</button>
        </div>
      </div>
    `;
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center";
    overlay.style.zIndex = "100002";
    overlay.appendChild(confirmDialog);
    document.body.appendChild(overlay);
    const confirmBtn = document.getElementById("confirm-delete-all");
    confirmBtn.addEventListener("click", () => {
      config.rules = [];
      config.nextRuleId = 1;
      saveConfig();
      populateRulesList();
      checkForSensitiveInfo();
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      const rulesSection = document.querySelector("#shield-rules-title");
      const successMessage = document.createElement("div");
      successMessage.className = "text-green-500 text-sm ml-2 inline-block";
      successMessage.textContent = "All rules deleted";
      rulesSection.appendChild(successMessage);
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 2000);
    });
    const cancelBtn = document.getElementById("cancel-delete-all");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }
    });
    confirmDialog.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
          document.removeEventListener("keydown", handleEscape);
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
})();
