(() => {
  const RESOURCE_NAME = typeof GetParentResourceName === "function" ? GetParentResourceName() : "illenium-appearance";
  const LAYER = document.getElementById("custom-ui-layer");
  const TEXT_UI = document.getElementById("custom-text-ui");
  const TEXT_LABEL = document.getElementById("custom-text-label");
  const NOTIFICATIONS = document.getElementById("custom-notifications");
  const CONTEXT = document.getElementById("custom-context");
  const CONTEXT_TITLE = document.getElementById("custom-context-title");
  const CONTEXT_DESCRIPTION = document.getElementById("custom-context-description");
  const CONTEXT_OPTIONS = document.getElementById("custom-context-options");
  const CONTEXT_BACK = document.getElementById("custom-context-back");
  const CONTEXT_CLOSE = document.getElementById("custom-context-close");
  const DIALOG = document.getElementById("custom-dialog");
  const DIALOG_TITLE = document.getElementById("custom-dialog-title");
  const DIALOG_FIELDS = document.getElementById("custom-dialog-fields");
  const DIALOG_CANCEL = document.getElementById("custom-dialog-cancel");
  const DIALOG_SUBMIT = document.getElementById("custom-dialog-submit");
  const state = { contextId: null, dialogId: null, dialogFields: [] };

  const post = (endpoint, body) => fetch(`https://${RESOURCE_NAME}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body || {}),
  });

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");

  const typeClass = {
    success: "border-emerald-300/30 bg-emerald-950/90 text-emerald-100",
    error: "border-rose-300/30 bg-rose-950/90 text-rose-100",
    warning: "border-amber-300/30 bg-amber-950/90 text-amber-100",
    inform: "border-cyan-300/30 bg-slate-950/95 text-cyan-50",
  };

  const showLayer = () => {
    LAYER.classList.remove("hidden");
  };

  const hideLayerIfIdle = () => {
    if (CONTEXT.classList.contains("hidden") && DIALOG.classList.contains("hidden") && TEXT_UI.classList.contains("hidden") && NOTIFICATIONS.children.length === 0) {
      LAYER.classList.add("hidden");
    }
  };

  const showNotification = (data) => {
    showLayer();
    const notification = document.createElement("article");
    const style = typeClass[data.type] || typeClass.inform;
    notification.className = `custom-ui-enter pointer-events-auto w-[22rem] rounded-2xl border px-4 py-3 shadow-2xl shadow-black/40 ${style}`;
    notification.innerHTML = `<div class="flex items-start gap-3"><div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-current opacity-80"></div><div class="min-w-0"><p class="font-[Sora] text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">${escapeHtml(data.title)}</p><p class="mt-1 font-[Manrope] text-sm leading-5 opacity-90">${escapeHtml(data.description)}</p></div></div>`;
    NOTIFICATIONS.appendChild(notification);
    window.setTimeout(() => {
      notification.remove();
      hideLayerIfIdle();
    }, Number(data.duration) || 4500);
  };

  const showContext = (data) => {
    showLayer();
    state.contextId = data.id;
    CONTEXT_TITLE.textContent = data.title || "Menu";
    CONTEXT_DESCRIPTION.textContent = data.description || "Select an action to continue";
    CONTEXT_OPTIONS.innerHTML = (data.options || []).map((option, index) => {
      const disabled = option.disabled ? "opacity-35 cursor-not-allowed" : "hover:border-cyan-200/40 hover:bg-cyan-300/10 cursor-pointer";
      const arrow = option.hasMenu ? "<span class=\"text-cyan-200/60\">›</span>" : "<span class=\"text-white/20\">↵</span>";
      return `<button type="button" data-context-index="${index}" class="group flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition-all duration-150 ${disabled}" ${option.disabled ? "disabled" : ""}><span class="flex min-w-0 items-center gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 font-[Space_Mono] text-xs text-cyan-200">${escapeHtml(option.icon ? "•" : String(index + 1).padStart(2, "0"))}</span><span class="min-w-0"><span class="block truncate font-[Sora] text-sm font-semibold text-white">${escapeHtml(option.title)}</span>${option.description ? `<span class="mt-0.5 block truncate font-[Manrope] text-xs text-white/45">${escapeHtml(option.description)}</span>` : ""}</span></span>${arrow}</button>`;
    }).join("");
    CONTEXT_BACK.classList.toggle("hidden", !data.menu);
    CONTEXT.classList.remove("hidden");
    DIALOG.classList.add("hidden");
  };

  const createField = (field) => {
    const wrapper = document.createElement("label");
    wrapper.className = "block space-y-2";
    wrapper.innerHTML = `<span class="block font-[Sora] text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">${escapeHtml(field.label)}</span>`;
    if (field.type === "select") {
      const select = document.createElement("select");
      select.className = "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 font-[Manrope] text-sm text-white outline-none transition focus:border-cyan-200/60";
      select.disabled = field.disabled === true;
      (field.options || []).forEach((option) => {
        const element = document.createElement("option");
        element.value = option.value ?? "";
        element.textContent = option.label;
        element.selected = String(element.value) === String(field.default ?? "");
        select.appendChild(element);
      });
      wrapper.appendChild(select);
      return wrapper;
    }
    const input = document.createElement("input");
    input.type = field.type === "number" ? "number" : "text";
    input.value = field.default ?? "";
    input.placeholder = field.placeholder ?? "";
    input.disabled = field.disabled === true;
    input.required = field.required === true;
    input.className = "w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3 font-[Manrope] text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/60 focus:bg-cyan-300/[0.06]";
    wrapper.appendChild(input);
    return wrapper;
  };

  const showDialog = (data) => {
    showLayer();
    state.dialogId = data.id;
    state.dialogFields = data.fields || [];
    DIALOG_TITLE.textContent = data.title || "Enter details";
    DIALOG_FIELDS.replaceChildren(...state.dialogFields.map(createField));
    DIALOG.classList.remove("hidden");
    CONTEXT.classList.add("hidden");
  };

  const closeCustomUi = () => {
    CONTEXT.classList.add("hidden");
    DIALOG.classList.add("hidden");
    TEXT_UI.classList.add("hidden");
    hideLayerIfIdle();
  };

  CONTEXT_OPTIONS.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-context-index]");
    if (!button) return;
    post("custom_ui_context_select", { contextId: state.contextId, index: Number(button.dataset.contextIndex) });
  });

  CONTEXT_BACK.addEventListener("click", () => post("custom_ui_context_back", { contextId: state.contextId }));
  CONTEXT_CLOSE.addEventListener("click", () => post("custom_ui_context_close", {}));

  DIALOG_CANCEL.addEventListener("click", () => {
    post("custom_ui_dialog_result", { id: state.dialogId, cancelled: true });
    DIALOG.classList.add("hidden");
    hideLayerIfIdle();
  });

  DIALOG_SUBMIT.addEventListener("click", () => {
    const fields = [...DIALOG_FIELDS.children];
    if (fields.some((field) => {
      const input = field.querySelector("input, select");
      return input?.required && !input.value.trim();
    })) return;
    const values = fields.map((field) => field.querySelector("input, select")?.value ?? "");
    post("custom_ui_dialog_result", { id: state.dialogId, values });
    DIALOG.classList.add("hidden");
    hideLayerIfIdle();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!DIALOG.classList.contains("hidden")) {
      post("custom_ui_dialog_result", { id: state.dialogId, cancelled: true });
      DIALOG.classList.add("hidden");
      hideLayerIfIdle();
      return;
    }
    if (!CONTEXT.classList.contains("hidden")) post("custom_ui_context_close", {});
  });

  window.addEventListener("message", (event) => {
    const { action, data } = event.data;
    if (action === "custom_notify") showNotification(data);
    if (action === "custom_context") showContext(data);
    if (action === "custom_dialog") showDialog(data);
    if (action === "custom_context_close" || action === "custom_reset") closeCustomUi();
    if (action === "custom_text_ui") {
      showLayer();
      TEXT_UI.classList.toggle("hidden", data.visible !== true);
      TEXT_LABEL.textContent = data.text || "";
      if (data.visible !== true) hideLayerIfIdle();
    }
  });
})();
