(function () {
  const vscode = acquireVsCodeApi();
  const state = {
    messages: [],
    timeline: [],
    toolLogs: [],
    context: [],
    diffTargets: [],
    mode: "auto",
    isStreaming: false,
    agentFilter: "all"
  };

  const chatEl = document.getElementById("chat");
  const promptEl = document.getElementById("prompt");
  const sendBtn = document.getElementById("send");
  const cancelBtn = document.getElementById("cancel");
  const modeSelect = document.getElementById("modeSelect");
  const timelineList = document.getElementById("timelineList");
  const toolLogEntries = document.getElementById("toolLogEntries");
  const contextEntries = document.getElementById("contextEntries");
  const storeKeyBtn = document.getElementById("storeKey");
  const clearKeyBtn = document.getElementById("clearKey");
  const apiKeyInput = document.getElementById("apiKey");
  const agentFilterContainer = document.getElementById("agentFilters");
  const memoryChart = document.getElementById("memoryChart");
  const memoryCtx = memoryChart.getContext ? memoryChart.getContext("2d") : null;

  function renderMessages() {
    chatEl.innerHTML = "";
    state.messages.forEach((message) => {
      const container = document.createElement("div");
      container.className = `message ${message.role}`;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${message.role.toUpperCase()} • ${new Date(message.createdAt).toLocaleTimeString()} • ${message.status}`;
      container.appendChild(meta);

      const chipRow = document.createElement("div");
      chipRow.className = "agent-chips";
      (message.agents ?? ["assistant"]).forEach((agent) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = agent;
        chipRow.appendChild(chip);
      });
      container.appendChild(chipRow);

      const content = document.createElement("div");
      content.className = "content";
      content.textContent = message.content;
      container.appendChild(content);

      if (message.diffTargets && message.diffTargets.length) {
        const list = document.createElement("div");
        list.textContent = "Pending diffs:";
        message.diffTargets.forEach((path) => {
          const btn = document.createElement("button");
          btn.textContent = path;
          btn.addEventListener("click", () => vscode.postMessage({ type: "chat:openDiff", path }));
          list.appendChild(btn);
        });
        container.appendChild(list);
      }

      chatEl.appendChild(container);
    });
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function renderTimeline(events) {
    timelineList.innerHTML = "";
    const filtered = events.filter((event) => shouldDisplayEvent(event));
    filtered.forEach((event) => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = `[${event.stage}] ${event.message}`;
      item.appendChild(title);
      if (event.details) {
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(event.details, null, 2);
        item.appendChild(pre);
      }
      timelineList.appendChild(item);
    });
  }

  function renderToolLogs(logs) {
    toolLogEntries.innerHTML = "";
    logs.forEach((log) => {
      const wrapper = document.createElement("div");
      wrapper.className = "tool-log";
      const title = document.createElement("div");
      title.innerHTML = `<span class="tag">${log.tool}</span> exit=${log.exitCode ?? "?"}`;
      wrapper.appendChild(title);
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(log.args, null, 2);
      wrapper.appendChild(pre);
      if (log.stdout) {
        const stdout = document.createElement("pre");
        stdout.textContent = log.stdout;
        wrapper.appendChild(stdout);
      }
      if (log.stderr) {
        const stderr = document.createElement("pre");
        stderr.textContent = log.stderr;
        wrapper.appendChild(stderr);
      }
      toolLogEntries.appendChild(wrapper);
    });
  }

  function renderContext(memoryHits) {
    contextEntries.innerHTML = "";
    renderMemoryChart(memoryHits);
    memoryHits.forEach((hit) => {
      const container = document.createElement("div");
      container.className = "context-hit";
      const line = document.createElement("div");
      line.textContent = `${hit.filePath} (${(hit.score * 100).toFixed(1)}%)`;
      container.appendChild(line);
      if (hit.chunk) {
        const pre = document.createElement("pre");
        pre.textContent = hit.chunk;
        container.appendChild(pre);
      }
      const openBtn = document.createElement("button");
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => vscode.postMessage({ type: "chat:openFile", path: hit.filePath }));
      container.appendChild(openBtn);
      contextEntries.appendChild(container);
    });
  }

  sendBtn.addEventListener("click", () => {
    const text = promptEl.value.trim();
    if (!text) {
      return;
    }
    vscode.postMessage({ type: "chat:send", text });
    promptEl.value = "";
  });

  cancelBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "chat:cancel" });
  });

  modeSelect.addEventListener("change", () => {
    vscode.postMessage({ type: "chat:mode", mode: modeSelect.value });
  });

  storeKeyBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "chat:storeToken", token: apiKeyInput.value });
    apiKeyInput.value = "";
  });

  clearKeyBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "chat:logout" });
  });

  agentFilterContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLButtonElement && target.dataset.agent) {
      const agent = target.dataset.agent;
      state.agentFilter = agent;
      vscode.postMessage({ type: "chat:agentFilter", agent });
      Array.from(agentFilterContainer.querySelectorAll(".agent-filter")).forEach((btn) =>
        btn.classList.toggle("selected", btn === target)
      );
      renderTimeline(state.timeline);
    }
  });

  window.addEventListener("message", (event) => {
    const { type, payload } = event.data;
    if (type === "session:update") {
      state.messages = payload.messages ?? [];
      state.mode = payload.mode ?? "auto";
      state.isStreaming = payload.isStreaming;
      state.agentFilter = payload.agentFilter ?? state.agentFilter ?? "all";
      modeSelect.value = state.mode;
      renderMessages();
      const streamingMsg = state.messages.find((msg) => msg.status === "streaming");
      state.timeline = (streamingMsg?.events ?? state.messages.at(-1)?.events) ?? [];
      state.toolLogs = (streamingMsg?.toolLogs ?? state.messages.at(-1)?.toolLogs) ?? [];
      state.context = (streamingMsg?.memory ?? state.messages.at(-1)?.memory) ?? [];
      renderTimeline(state.timeline);
      renderToolLogs(state.toolLogs);
      renderContext(state.context);
    }
  });

  vscode.postMessage({ type: "chat:ready" });

  function shouldDisplayEvent(event) {
    if (state.agentFilter === "all") {
      return true;
    }
    const stageAgent = stageToAgent(event.stage);
    return stageAgent === state.agentFilter;
  }

  function stageToAgent(stage) {
    switch (stage) {
      case "plan":
        return "planner";
      case "code_intel":
      case "tool":
      case "sandbox":
        return "coder";
      case "summary":
        return "reviewer";
      default:
        return "assistant";
    }
  }

  function renderMemoryChart(hits) {
    if (!memoryCtx) {
      return;
    }
    memoryCtx.clearRect(0, 0, memoryChart.width, memoryChart.height);
    if (!hits.length) {
      return;
    }
    const topHits = hits.slice(0, 5);
    const barHeight = memoryChart.height / topHits.length;
    topHits.forEach((hit, index) => {
      const width = Math.max(5, Math.min(memoryChart.width, hit.score * memoryChart.width));
      const y = index * barHeight + barHeight / 4;
      memoryCtx.fillStyle = "#4caf50";
      memoryCtx.fillRect(0, y, width, barHeight / 2);
      memoryCtx.fillStyle = "#ffffff";
      memoryCtx.font = "11px sans-serif";
      memoryCtx.fillText(hit.filePath, 4, y + barHeight / 2);
    });
  }
})();
