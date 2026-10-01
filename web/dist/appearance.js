(() => {
  const RESOURCE_NAME = typeof GetParentResourceName === "function" ? GetParentResourceName() : "illenium-appearance";
  const ROOT = document.getElementById("root");
  const state = {
    visible: false,
    data: null,
    settings: null,
    config: null,
    tab: "overview",
    busy: false,
    clothingSearch: "",
    notice: null
  };

  const post = async (endpoint, body) => {
    const response = await fetch(`https://${RESOURCE_NAME}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body || {})
    });
    return response.json();
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");

  const range = (setting, fallbackMax = 1) => ({
    min: Number(setting?.min ?? 0),
    max: Number(setting?.max ?? fallbackMax),
    step: Number(setting?.factor ?? 1)
  });

  const components = () => state.data?.components || [];
  const props = () => state.data?.props || [];
  const componentById = (id) => components().find((item) => Number(item.component_id) === Number(id)) || { component_id: id, drawable: 0, texture: 0 };
  const propById = (id) => props().find((item) => Number(item.prop_id) === Number(id)) || { prop_id: id, drawable: -1, texture: -1 };
  const componentSetting = (id) => (state.settings?.components || []).find((item) => Number(item.component_id) === Number(id));
  const propSetting = (id) => (state.settings?.props || []).find((item) => Number(item.prop_id) === Number(id));
  const clothingCatalog = () => state.settings?.clothing || { components: [], props: [], items: [] };

  const slider = (label, value, setting, change) => {
    const limits = range(setting);
    const current = Math.min(Math.max(Number(value) || 0, limits.min), limits.max);
    return `<label class="block space-y-2"><span class="flex items-center justify-between gap-3 font-[Manrope] text-xs text-white/65"><span>${escapeHtml(label)}</span><span class="font-[Space_Mono] text-[10px] text-cyan-200/75">${current}</span></span><input data-slider="true" type="range" min="${limits.min}" max="${limits.max}" step="${limits.step}" value="${current}" class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-200" data-change="${encodeURIComponent(change)}"></label>`;
  };

  const card = (title, content, badge = "live") => `<section class="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div class="mb-4 flex items-center justify-between"><h3 class="font-[Sora] text-xs font-semibold uppercase tracking-[0.14em] text-white/85">${escapeHtml(title)}</h3><span class="font-[Space_Mono] text-[9px] uppercase tracking-[0.18em] text-cyan-200/45">${escapeHtml(badge)}</span></div>${content}</section>`;

  const select = (label, value, options, change) => `<label class="block space-y-2"><span class="font-[Manrope] text-xs text-white/65">${escapeHtml(label)}</span><select data-select-change="${encodeURIComponent(change)}" class="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 font-[Manrope] text-sm text-white outline-none transition focus:border-cyan-200/60">${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;

  const request = async (endpoint, body) => {
    if (state.busy) return null;
    state.busy = true;
    try {
      return await post(endpoint, body);
    } finally {
      state.busy = false;
    }
  };

  const updateComponent = async (id, key, value) => {
    const item = { ...componentById(id), [key]: Number(value) };
    const result = await request("appearance_change_component", item);
    const index = components().findIndex((entry) => Number(entry.component_id) === Number(id));
    if (index >= 0) state.data.components[index] = item;
    if (result?.drawable) state.settings.components = state.settings.components.map((entry) => Number(entry.component_id) === Number(id) ? result : entry);
    render();
  };

  const updateProp = async (id, key, value) => {
    const item = { ...propById(id), [key]: Number(value) };
    const result = await request("appearance_change_prop", item);
    const index = props().findIndex((entry) => Number(entry.prop_id) === Number(id));
    if (index >= 0) state.data.props[index] = item;
    if (result?.drawable) state.settings.props = state.settings.props.map((entry) => Number(entry.prop_id) === Number(id) ? result : entry);
    render();
  };

  const updateNested = async (endpoint, rootKey, key, value) => {
    state.data[rootKey] = { ...(state.data[rootKey] || {}), [key]: Number(value) };
    await request(endpoint, state.data[rootKey]);
    render();
  };

  const updateFace = async (key, value) => {
    state.data.faceFeatures[key] = Number(value);
    await request("appearance_change_face_feature", state.data.faceFeatures);
    render();
  };

  const updateOverlay = async (key, field, value) => {
    state.data.headOverlays[key] = { ...(state.data.headOverlays[key] || {}), [field]: Number(value) };
    await request("appearance_change_head_overlay", state.data.headOverlays);
    render();
  };

  const textureCount = (catalogItem, fallback) => Math.max(Number(catalogItem?.textureCount ?? fallback ?? 1), 1);
  const hasBlockedDrawable = (setting, drawable) => (setting?.blacklist?.drawables || []).some((entry) => Number(entry) === Number(drawable));
  const hasBlockedTexture = (setting, drawable, texture) => hasBlockedDrawable(setting, drawable) || (setting?.blacklist?.textures || []).some((entry) => Number(entry) === Number(texture));

  const stepButton = (label, action, disabled = false) => `<button type="button" data-action="${escapeHtml(action)}" ${disabled ? "disabled" : ""} class="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 font-[Space_Mono] text-[10px] text-white/70 transition hover:border-cyan-200/50 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-25">${escapeHtml(label)}</button>`;

  const clothingImage = (image, fallback) => `<div class="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/80"><span class="absolute font-[Space_Mono] text-2xl text-cyan-100/20">${escapeHtml(fallback)}</span>${image ? `<img data-clothing-image="true" src="${escapeHtml(image)}" alt="" class="relative h-full w-full object-contain" loading="lazy">` : ""}</div>`;

  const componentChoice = (id, catalogItem, selected, setting) => {
    const drawable = Number(catalogItem.drawable);
    const texture = Number(selected.texture) || 0;
    const selectedCard = drawable === Number(selected.drawable);
    const blocked = hasBlockedDrawable(setting, drawable);
    const textureTotal = textureCount(catalogItem, setting?.texture?.max + 1);
    return `<article class="group rounded-2xl border ${selectedCard ? "border-cyan-200/70 bg-cyan-300/[0.10] ring-1 ring-cyan-200/20" : "border-white/10 bg-black/15"} ${blocked ? "pointer-events-none opacity-25" : ""} p-2 transition hover:border-cyan-200/45"><button type="button" data-clothing-choice="component" data-clothing-id="${id}" data-clothing-drawable="${drawable}" class="block w-full text-left">${clothingImage(catalogItem.image, String(drawable).padStart(3, "0"))}<span class="mt-2 block truncate font-[Sora] text-xs font-semibold text-white/85">${escapeHtml(catalogItem.label || `Style ${drawable}`)}</span><span class="mt-1 block font-[Space_Mono] text-[9px] uppercase tracking-[0.12em] text-white/35">style ${drawable}</span></button><div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2">${stepButton("−", `texture:component:${id}:${drawable}:${texture - 1}`, texture <= 0)}<span class="font-[Space_Mono] text-[10px] text-cyan-100/70">texture ${texture}/${textureTotal - 1}</span>${stepButton("+", `texture:component:${id}:${drawable}:${texture + 1}`, texture >= textureTotal - 1)}</div></article>`;
  };

  const propChoice = (id, catalogItem, selected, setting) => {
    const drawable = Number(catalogItem.drawable);
    const texture = Number(selected.texture) < 0 ? 0 : Number(selected.texture);
    const selectedCard = drawable === Number(selected.drawable);
    const blocked = hasBlockedDrawable(setting, drawable);
    const textureTotal = textureCount(catalogItem, setting?.texture?.max + 1);
    return `<article class="group rounded-2xl border ${selectedCard ? "border-cyan-200/70 bg-cyan-300/[0.10] ring-1 ring-cyan-200/20" : "border-white/10 bg-black/15"} ${blocked ? "pointer-events-none opacity-25" : ""} p-2 transition hover:border-cyan-200/45"><button type="button" data-clothing-choice="prop" data-clothing-id="${id}" data-clothing-drawable="${drawable}" class="block w-full text-left">${clothingImage(catalogItem.image, drawable < 0 ? "OFF" : String(drawable).padStart(3, "0"))}<span class="mt-2 block truncate font-[Sora] text-xs font-semibold text-white/85">${escapeHtml(catalogItem.label || (drawable < 0 ? "Remove" : `Style ${drawable}`))}</span><span class="mt-1 block font-[Space_Mono] text-[9px] uppercase tracking-[0.12em] text-white/35">${drawable < 0 ? "clear prop" : `style ${drawable}`}</span></button><div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2">${stepButton("−", `texture:prop:${id}:${drawable}:${texture - 1}`, texture <= 0 || drawable < 0)}<span class="font-[Space_Mono] text-[10px] text-cyan-100/70">texture ${drawable < 0 ? "—" : `${texture}/${textureTotal - 1}`}</span>${stepButton("+", `texture:prop:${id}:${drawable}:${texture + 1}`, texture >= textureTotal - 1 || drawable < 0)}</div></article>`;
  };

  const componentControl = (setting, label) => {
    const id = Number(setting.component_id);
    const selected = componentById(id);
    const catalog = (clothingCatalog().components || []).find((entry) => Number(entry.component_id) === id);
    const items = (catalog?.items || []).filter((item) => `${item.label} ${item.drawable}`.toLowerCase().includes(state.clothingSearch.toLowerCase()));
    return `<section class="rounded-2xl border border-white/10 bg-black/10 p-3"><div class="mb-3 flex items-center justify-between"><div><h4 class="font-[Sora] text-sm font-semibold text-white/85">${escapeHtml(label)}</h4><p class="mt-1 font-[Space_Mono] text-[9px] uppercase tracking-[0.13em] text-white/35">component ${String(id).padStart(2, "0")} · ${items.length} styles</p></div><button type="button" data-action="jump:${id}" class="rounded-lg border border-white/10 px-2.5 py-1.5 font-[Space_Mono] text-[9px] text-white/45 transition hover:border-cyan-200/40 hover:text-cyan-100">current #${Number(selected.drawable)}</button></div><div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">${items.map((item) => componentChoice(id, item, selected, setting)).join("") || "<p class=\"col-span-full py-5 text-center font-[Manrope] text-xs text-white/35\">No matching styles.</p>"}</div></section>`;
  };

  const propControl = (setting, label) => {
    const id = Number(setting.prop_id);
    const selected = propById(id);
    const catalog = (clothingCatalog().props || []).find((entry) => Number(entry.prop_id) === id);
    const items = (catalog?.items || []).filter((item) => `${item.label} ${item.drawable}`.toLowerCase().includes(state.clothingSearch.toLowerCase()));
    return `<section class="rounded-2xl border border-white/10 bg-black/10 p-3"><div class="mb-3 flex items-center justify-between"><div><h4 class="font-[Sora] text-sm font-semibold text-white/85">${escapeHtml(label)}</h4><p class="mt-1 font-[Space_Mono] text-[9px] uppercase tracking-[0.13em] text-white/35">prop ${String(id).padStart(2, "0")} · ${items.length} styles</p></div><button type="button" data-action="jump:prop:${id}" class="rounded-lg border border-white/10 px-2.5 py-1.5 font-[Space_Mono] text-[9px] text-white/45 transition hover:border-cyan-200/40 hover:text-cyan-100">current #${Number(selected.drawable)}</button></div><div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">${items.map((item) => propChoice(id, item, selected, setting)).join("") || "<p class=\"col-span-full py-5 text-center font-[Manrope] text-xs text-white/35\">No matching styles.</p>"}</div></section>`;
  };

  const renderOverview = () => {
    const models = (state.settings.ped?.model?.items || []).map((model) => ({ value: model, label: model }));
    const blend = state.data.headBlend || {};
    const blendSettings = state.settings.headBlend || {};
    const blendControls = [["Face father", "shapeFirst"], ["Face mother", "shapeSecond"], ["Skin father", "skinFirst"], ["Skin mother", "skinSecond"], ["Face mix", "shapeMix"], ["Skin mix", "skinMix"]].map(([label, key]) => slider(label, blend[key], blendSettings[key], `nested:headBlend:${key}`)).join("");
    const camera = `<div class="grid grid-cols-2 gap-2"><button data-action="camera:default" class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-[Sora] text-xs text-white/70 transition hover:border-cyan-200/40 hover:bg-cyan-300/10">Full view</button><button data-action="camera:head" class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-[Sora] text-xs text-white/70 transition hover:border-cyan-200/40 hover:bg-cyan-300/10">Head</button><button data-action="camera:torso" class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-[Sora] text-xs text-white/70 transition hover:border-cyan-200/40 hover:bg-cyan-300/10">Torso</button><button data-action="turn" class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-[Sora] text-xs text-white/70 transition hover:border-cyan-200/40 hover:bg-cyan-300/10">Turn around</button></div>`;
    return `<div class="grid gap-4 lg:grid-cols-2">${card("Identity", `${select("Character model", state.data.model, models, "model")}<div class="mt-4">${camera}</div>`)}${card("Inheritance", `<div class="space-y-4">${blendControls}</div>`)}${card("Hair", `<div class="space-y-4">${slider("Style", state.data.hair?.style, state.settings.hair?.style, "nested:hair:style")}${slider("Texture", state.data.hair?.texture, state.settings.hair?.texture, "nested:hair:texture")}${slider("Color", state.data.hair?.color, { min: 0, max: 63 }, "nested:hair:color")}${slider("Highlight", state.data.hair?.highlight, { min: 0, max: 63 }, "nested:hair:highlight")}</div>`)}${card("Eye colour", slider("Iris", state.data.eyeColor, state.settings.eyeColor, "eyeColor"))}</div>`;
  };

  const renderFace = () => {
    const labels = { noseWidth: "Nose width", nosePeakHigh: "Nose height", nosePeakSize: "Nose size", noseBoneHigh: "Nose bridge", noseBoneTwist: "Nose twist", nosePeakLowering: "Nose lowering", eyeBrownHigh: "Brow height", eyeBrownForward: "Brow depth", cheeksBoneHigh: "Cheek height", cheeksBoneWidth: "Cheek width", cheeksWidth: "Cheek fullness", eyesOpening: "Eye opening", lipsThickness: "Lip thickness", jawBoneWidth: "Jaw width", jawBoneBackSize: "Jaw size", chinBoneLowering: "Chin lowering", chinBoneLenght: "Chin length", chinBoneSize: "Chin size", chinHole: "Chin dimple", neckThickness: "Neck thickness" };
    return card("Face features", `<div class="grid gap-x-5 gap-y-4 md:grid-cols-2">${Object.keys(state.settings.faceFeatures || {}).map((key) => slider(labels[key] || key, state.data.faceFeatures?.[key], state.settings.faceFeatures[key], `face:${key}`)).join("")}</div>`);
  };

  const renderClothing = () => {
    const names = ["Head", "Mask", "Hair", "Upper body", "Lower body", "Bags", "Shoes", "Scarf and chains", "Shirt", "Body armor", "Decals", "Jackets"];
    const componentsMarkup = (state.settings.components || []).map((setting) => componentControl(setting, names[setting.component_id] || `Component ${setting.component_id}`)).join("");
    const itemMarkup = (clothingCatalog().items || []).map((item) => `<article class="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.04] p-3"><div class="grid grid-cols-[5rem_1fr] gap-3"><div class="flex h-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/80">${item.image ? `<img data-clothing-image="true" src="${escapeHtml(item.image)}" alt="" class="h-full w-full object-contain">` : "<span class=\"font-[Space_Mono] text-[9px] text-cyan-100/30\">ITEM</span>"}</div><div class="min-w-0"><h4 class="truncate font-[Sora] text-sm font-semibold text-white/90">${escapeHtml(item.label)}</h4><p class="mt-1 line-clamp-2 font-[Manrope] text-xs text-white/45">${escapeHtml(item.description || item.item)}</p><button type="button" data-wear-item="${escapeHtml(item.item)}" class="mt-3 rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 font-[Sora] text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-300/20">Wear item</button></div></div></article>`).join("");
    return `<div class="space-y-4">${card("Clothing catalog", `<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p class="max-w-xl font-[Manrope] text-xs leading-5 text-white/45">Choose an exact style card, then step textures one at a time. Add thumbnails under <span class="font-[Space_Mono] text-cyan-100/70">web/images/clothing</span>.</p><input data-clothing-search="true" value="${escapeHtml(state.clothingSearch)}" placeholder="Search styles..." class="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 font-[Manrope] text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-200/60 sm:w-48"></div><div class="space-y-3">${componentsMarkup}</div>`, "image cards")}${itemMarkup ? card("Wearable clothing items", `<div class="grid gap-3 md:grid-cols-2">${itemMarkup}</div>`, "inventory ready") : ""}</div>`;
  };

  const renderProps = () => {
    const names = { 0: "Hats and helmets", 1: "Glasses", 2: "Ear", 6: "Watches", 7: "Bracelets" };
    return `<div class="space-y-4">${card("Accessory catalog", `<div class="mb-4 flex items-center justify-between"><p class="font-[Manrope] text-xs text-white/45">Click a picture to select it. Texture buttons always move by exactly one.</p><input data-clothing-search="true" value="${escapeHtml(state.clothingSearch)}" placeholder="Search styles..." class="w-48 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 font-[Manrope] text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-200/60"></div><div class="space-y-3">${(state.settings.props || []).map((setting) => propControl(setting, names[setting.prop_id] || `Prop ${setting.prop_id}`)).join("")}</div>`, "image cards")}</div>`;
  };

  const renderAppearance = () => {
    const labels = { blemishes: "Blemishes", beard: "Beard", eyebrows: "Eyebrows", ageing: "Ageing", makeUp: "Make up", blush: "Blush", complexion: "Complexion", sunDamage: "Sun damage", lipstick: "Lipstick", moleAndFreckles: "Moles and freckles", chestHair: "Chest hair", bodyBlemishes: "Body blemishes" };
    return card("Appearance overlays", `<div class="grid gap-3 md:grid-cols-2">${Object.keys(state.settings.headOverlays || {}).map((key) => `<div class="rounded-xl border border-white/10 bg-black/15 p-3"><p class="mb-3 font-[Manrope] text-sm text-white/80">${escapeHtml(labels[key] || key)}</p>${slider("Style", state.data.headOverlays?.[key]?.style, state.settings.headOverlays[key]?.style, `overlay:${key}:style`)}${slider("Opacity", state.data.headOverlays?.[key]?.opacity, state.settings.headOverlays[key]?.opacity, `overlay:${key}:opacity`)}</div>`).join("")}</div>`);
  };

  const renderTattoos = () => {
    const groups = Object.entries(state.settings.tattoos?.items || {}).map(([zone, tattoos]) => `<div class="space-y-2"><p class="font-[Sora] text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/70">${escapeHtml(zone.replace("ZONE_", ""))}</p>${(tattoos || []).slice(0, 60).map((tattoo) => `<button data-tattoo="${escapeHtml(JSON.stringify(tattoo))}" class="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left transition hover:border-cyan-200/40 hover:bg-cyan-300/10"><span class="font-[Manrope] text-sm text-white/75">${escapeHtml(tattoo.label || tattoo.name || "Tattoo")}</span><span class="font-[Space_Mono] text-[10px] text-cyan-200/60">apply</span></button>`).join("")}</div>`).join("");
    return card("Tattoo library", `<div class="max-h-[31rem] space-y-5 overflow-y-auto pr-1">${groups || "<p class=\"text-sm text-white/45\">No tattoo data available.</p>"}</div>`);
  };

  const tabContent = { overview: renderOverview, face: renderFace, appearance: renderAppearance, clothing: renderClothing, props: renderProps, tattoos: renderTattoos };

  const showNotice = (message) => {
    state.notice = message;
    render();
    window.setTimeout(() => {
      if (state.notice === message) {
        state.notice = null;
        render();
      }
    }, 4000);
  };

  const render = () => {
    if (!state.visible || !state.data || !state.settings) {
      ROOT.innerHTML = "";
      return;
    }
    const tabs = [["overview", "Overview"], ["face", "Face"], ["appearance", "Appearance"], ["clothing", "Clothing"], ["props", "Accessories"], ["tattoos", "Tattoos"]];
    ROOT.innerHTML = `<main class="custom-ui-enter pointer-events-auto absolute inset-y-7 left-7 flex w-[min(50rem,calc(100vw-3.5rem))] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/60 ring-1 ring-cyan-200/10"><header class="flex items-start justify-between gap-5 border-b border-white/10 bg-white/[0.035] px-6 py-5"><div><p class="font-[Space_Mono] text-[10px] uppercase tracking-[0.24em] text-cyan-200/65">Personal identity // studio</p><h1 class="mt-2 font-[Sora] text-xl font-semibold tracking-tight text-white">Appearance lab</h1><p class="mt-1 font-[Manrope] text-xs text-white/45">Fine-tune every layer of your character in real time.</p></div><div class="flex gap-2"><button data-action="rotate:left" class="rounded-xl border border-white/10 px-3 py-2 font-[Space_Mono] text-[10px] text-white/60 transition hover:border-cyan-200/40 hover:text-cyan-100">↶</button><button data-action="rotate:right" class="rounded-xl border border-white/10 px-3 py-2 font-[Space_Mono] text-[10px] text-white/60 transition hover:border-cyan-200/40 hover:text-cyan-100">↷</button></div></header><nav class="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-3">${tabs.map(([id, label]) => `<button data-tab="${id}" class="shrink-0 rounded-lg px-3 py-2 font-[Sora] text-[10px] font-semibold uppercase tracking-[0.12em] transition ${state.tab === id ? "bg-cyan-300/15 text-cyan-100" : "text-white/40 hover:bg-white/5 hover:text-white/80"}">${label}</button>`).join("")}</nav>${state.notice ? `<div class="mx-4 mt-4 rounded-xl border border-rose-300/30 bg-rose-950/60 px-3 py-2.5 font-[Manrope] text-xs text-rose-100">${escapeHtml(state.notice)}</div>` : ""}<div class="min-h-0 flex-1 overflow-y-auto p-4">${tabContent[state.tab]()}</div><footer class="flex items-center justify-between border-t border-white/10 bg-black/15 px-6 py-4"><span class="font-[Space_Mono] text-[10px] uppercase tracking-[0.14em] text-white/30">Esc to cancel</span><div class="flex gap-2"><button data-action="exit" class="rounded-xl border border-white/10 px-4 py-2.5 font-[Sora] text-xs font-semibold text-white/60 transition hover:border-rose-200/40 hover:text-rose-100">Discard</button><button data-action="save" class="rounded-xl border border-cyan-200/40 bg-cyan-300/15 px-5 py-2.5 font-[Sora] text-xs font-semibold text-cyan-50 transition hover:bg-cyan-300/25">Save changes</button></div></footer></main>`;
    ROOT.querySelectorAll("img[data-clothing-image]").forEach((image) => image.addEventListener("error", () => image.classList.add("hidden"), { once: true }));
  };

  const closeAppearance = async (save) => {
    if (!state.visible) return;
    await post(save ? "appearance_save" : "appearance_exit", save ? state.data : {});
    state.visible = false;
    state.data = null;
    state.settings = null;
    state.clothingSearch = "";
    state.notice = null;
    render();
  };

  const selectClothing = async (type, id, drawable) => {
    if (type === "component") {
      const item = { ...componentById(id), drawable, texture: 0 };
      await request("appearance_change_component", item);
      const index = components().findIndex((entry) => Number(entry.component_id) === Number(id));
      if (index >= 0) state.data.components[index] = item;
      render();
      return;
    }
    const item = { ...propById(id), drawable, texture: drawable < 0 ? -1 : 0 };
    await request("appearance_change_prop", item);
    const index = props().findIndex((entry) => Number(entry.prop_id) === Number(id));
    if (index >= 0) state.data.props[index] = item;
    render();
  };

  const changeTexture = async (type, id, drawable, texture) => {
    const numericTexture = Number(texture);
    if (numericTexture < 0) return;
    if (type === "component") {
      await updateComponent(id, "drawable", drawable);
      await updateComponent(id, "texture", numericTexture);
      return;
    }
    await updateProp(id, "drawable", drawable);
    await updateProp(id, "texture", numericTexture);
  };

  ROOT.addEventListener("click", async (event) => {
    const tab = event.target.closest("button[data-tab]");
    if (tab) {
      state.tab = tab.dataset.tab;
      render();
      return;
    }

    const clothingChoice = event.target.closest("button[data-clothing-choice]");
    if (clothingChoice) {
      await selectClothing(clothingChoice.dataset.clothingChoice, Number(clothingChoice.dataset.clothingId), Number(clothingChoice.dataset.clothingDrawable));
      return;
    }

    const wearItem = event.target.closest("button[data-wear-item]");
    if (wearItem) {
      const result = await request("appearance_wear_clothing_item", { item: wearItem.dataset.wearItem });
      if (result?.ok === true && result.appearanceData) {
        state.data = result.appearanceData;
        state.notice = null;
        render();
      } else if (result?.error) {
        showNotice(result.error);
      }
      return;
    }

    const tattooButton = event.target.closest("button[data-tattoo]");
    if (tattooButton) {
      await request("appearance_apply_tattoo", { tattoo: JSON.parse(tattooButton.dataset.tattoo) });
      return;
    }

    const action = event.target.closest("button[data-action]")?.dataset.action;
    if (!action) return;
    if (action.startsWith("texture:")) {
      const [, type, id, drawable, texture] = action.split(":");
      await changeTexture(type, Number(id), Number(drawable), Number(texture));
      return;
    }
    if (action === "save") await closeAppearance(true);
    if (action === "exit") await closeAppearance(false);
    if (action === "rotate:left") await post("rotate_left", {});
    if (action === "rotate:right") await post("rotate_right", {});
    if (action === "turn") await post("appearance_turn_around", {});
    if (action.startsWith("camera:")) await post("appearance_set_camera", action.slice(7));
  });

  ROOT.addEventListener("input", (event) => {
    const search = event.target.closest("input[data-clothing-search]");
    if (search) {
      state.clothingSearch = search.value;
      render();
    }
  });

  ROOT.addEventListener("change", async (event) => {
    const input = event.target.closest("input[data-slider]");
    const selectElement = event.target.closest("select[data-select-change]");
    if (input) {
      const [scope, first, second] = decodeURIComponent(input.dataset.change).split(":");
      if (scope === "component") await updateComponent(first, second, input.value);
      if (scope === "prop") await updateProp(first, second, input.value);
      if (scope === "nested") await updateNested(first === "headBlend" ? "appearance_change_head_blend" : first === "hair" ? "appearance_change_hair" : "appearance_change_eye_color", first, second, input.value);
      if (scope === "face") await updateFace(first, input.value);
      if (scope === "overlay") await updateOverlay(first, second, input.value);
      if (scope === "eyeColor") {
        state.data.eyeColor = Number(input.value);
        await request("appearance_change_eye_color", state.data.eyeColor);
        render();
      }
    }
    if (selectElement && decodeURIComponent(selectElement.dataset.selectChange) === "model") {
      const result = await request("appearance_change_model", selectElement.value);
      if (result) {
        state.settings = result.appearanceSettings || state.settings;
        state.data = result.appearanceData || state.data;
        render();
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.visible) closeAppearance(false);
  });

  window.addEventListener("message", async (event) => {
    const { action, data } = event.data;
    if (action === "appearance_display") {
      state.visible = true;
      state.tab = "overview";
      render();
      const [settings, appearance] = await Promise.all([post("appearance_get_settings", {}), post("appearance_get_data", {})]);
      state.settings = settings?.appearanceSettings;
      state.config = appearance?.config;
      state.data = appearance?.appearanceData;
      render();
    }
    if (action === "appearance_hide") {
      state.visible = false;
      state.data = null;
      state.settings = null;
      render();
    }
  });
})();
