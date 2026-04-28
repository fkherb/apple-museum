
const products = window.APPLE_PRODUCTS || [];
const timelineEvents = window.TIMELINE_EVENTS || [];
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const CATEGORY_ORDER = window.CATEGORY_ORDER || ["Desktop", "All-in-One", "Laptop", "Mobile", "Wearable", "Home & Networking"];
const state = {
  category: "",
  family: "",
  subfamily: "",
  query: "",
  year: "",
  sort: "year-asc",
  era: "all",
  activeFamily: null,
  activeSubfamily: null
};

const fieldMap = {
  productName: "Product Name",
  releaseYear: "Release Year",
  discontinuedYear: "Disc. Year",
  type: "Product Type",
  modelNumber: "Model Number(s)",
  identifier: "Model Identifier(s)",
  form: "Form Factor",
  display: "Display Type",
  screen: "Screen Size",
  colors: "Colors",
  cpu: "CPU / Chip",
  gpu: "GPU / Graphics",
  memory: "Memory / Ram",
  storage: "Storage Capacity",
  storageType: "Storage Type",
  shippingOS: "Shipping OS",
  lastOS: "Last Supported OS",
  features: "Major Features",
  notes: "Notes"
};

function val(p, key) { return p[fieldMap[key]] || ""; }
function cat(p) {
  const c = p.museumCategory || p.category || "Other";
  return (c === "Home" || c === "Networking") ? "Home & Networking" : c;
}
function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
function byCategoryOrder(a,b) {
  const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
}
function yearsLabel(items) {
  const ys = items.map(p => Number(p.releaseYear)).filter(Boolean);
  return ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : "Year unknown";
}
function productText(p) {
  return [
    p["Product Name"], cat(p), p.family, p.subfamily, p.generation,
    val(p,"modelNumber"), val(p,"identifier"), val(p,"cpu"), val(p,"gpu"),
    val(p,"features"), val(p,"notes"), val(p,"lastOS"), val(p,"colors")
  ].join(" ").toLowerCase();
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function escapeAttr(str) { return escapeHtml(str).replace(/"/g,"&quot;"); }

function primaryImage(p) {
  return p.imageUrl || (p.imageLinks && p.imageLinks[0] && p.imageLinks[0].url) || "";
}
function renderProductImage(p, className="product-thumb") {
  const src = primaryImage(p);
  if (!src) return "";
  return `<img class="${className}" src="${escapeAttr(src)}" alt="${escapeAttr(p["Product Name"])}" loading="lazy" />`;
}
function normalizeLinks(rawLinks, fallbackName) {
  if (!rawLinks) return [];
  if (Array.isArray(rawLinks)) return rawLinks.filter(l => l && l.url);
  return [];
}
function renderLinksSection(p) {
  const groups = [
    ["Apple Support", normalizeLinks(p.appleSupportLinks, p["Product Name"])],
    ["Tech Specs", normalizeLinks(p.techSpecLinks, p["Product Name"])],
    ["Images", normalizeLinks(p.imageLinks, p["Product Name"])]
  ].filter(([,links]) => links.length);
  if (!groups.length) return "";
  return `<section class="links-panel">
    <h3>Links</h3>
    ${groups.map(([label, links]) => `<div class="link-row">
      <span>${escapeHtml(label)}</span>
      <div class="link-pills">${links.map(link => `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label || p["Product Name"])}</a>`).join("")}</div>
    </div>`).join("")}
  </section>`;
}


function setActiveNav() {
  const page = document.body.dataset.page;
  $$("[data-page]").forEach(a => {
    if (a.dataset.page === page) a.classList.add("is-current");
  });
}

function setStats() {
  if (!$("#stat-products")) return;
  const years = products.map(p => Number(p.releaseYear)).filter(Boolean);
  $("#stat-products").textContent = products.length.toLocaleString();
  $("#stat-years").textContent = `${Math.min(...years)}–${Math.max(...years)}`;
  $("#stat-families").textContent = uniq(products.map(p => p.family)).length;
  $("#stat-categories").textContent = CATEGORY_ORDER.length;
}

function renderCategoryOverview() {
  const el = $("#category-overview");
  if (!el) return;
  const grouped = {};
  CATEGORY_ORDER.forEach(c => grouped[c] = []);
  products.forEach(p => { (grouped[cat(p)] ||= []).push(p); });
  el.innerHTML = CATEGORY_ORDER.map(c => {
    const items = grouped[c] || [];
    const fams = uniq(items.map(p => p.family)).length;
    return `<a class="category-tile" href="families.html?category=${encodeURIComponent(c)}">
      <span>${escapeHtml(c)}</span>
      <strong>${items.length}</strong>
      <small>${fams} famil${fams === 1 ? "y" : "ies"} · ${yearsLabel(items)}</small>
    </a>`;
  }).join("");
}

function populateCatalogFilters() {
  if (!$("#category-filter")) return;
  const categorySelect = $("#category-filter");
  categorySelect.innerHTML = `<option value="">All categories</option>`;
  CATEGORY_ORDER.forEach(c => categorySelect.append(new Option(c, c)));
  refreshDependentFilters();
}

function refreshDependentFilters() {
  const familySelect = $("#family-filter");
  const subfamilySelect = $("#subfamily-filter");
  if (!familySelect || !subfamilySelect) return;
  const families = uniq(products.filter(p => !state.category || cat(p) === state.category).map(p => p.family));
  const subfamilies = uniq(products.filter(p =>
    (!state.category || cat(p) === state.category) &&
    (!state.family || p.family === state.family)
  ).map(p => p.subfamily));

  familySelect.innerHTML = `<option value="">All families</option>`;
  families.forEach(f => familySelect.append(new Option(f, f)));
  if (families.includes(state.family)) familySelect.value = state.family; else state.family = "";

  subfamilySelect.innerHTML = `<option value="">All subfamilies</option>`;
  subfamilies.forEach(s => subfamilySelect.append(new Option(s, s)));
  if (subfamilies.includes(state.subfamily)) subfamilySelect.value = state.subfamily; else state.subfamily = "";
}

function filteredProducts() {
  let result = products.filter(p => {
    const matchesQuery = !state.query || productText(p).includes(state.query.toLowerCase());
    const matchesCategory = !state.category || cat(p) === state.category;
    const matchesFamily = !state.family || p.family === state.family;
    const matchesSubfamily = !state.subfamily || p.subfamily === state.subfamily;
    const matchesYear = !state.year || Number(p.releaseYear) === Number(state.year);
    return matchesQuery && matchesCategory && matchesFamily && matchesSubfamily && matchesYear;
  });
  result.sort((a,b) => {
    if (state.sort === "year-desc") return (b.releaseYear||0) - (a.releaseYear||0) || a["Product Name"].localeCompare(b["Product Name"]);
    if (state.sort === "name-asc") return a["Product Name"].localeCompare(b["Product Name"]);
    if (state.sort === "family-asc") return cat(a).localeCompare(cat(b)) || a.family.localeCompare(b.family) || a.subfamily.localeCompare(b.subfamily) || (a.releaseYear||0)-(b.releaseYear||0);
    return (a.releaseYear||0) - (b.releaseYear||0) || a["Product Name"].localeCompare(b["Product Name"]);
  });
  return result;
}

function productCard(p) {
  const path = `${cat(p)} → ${p.family} → ${p.subfamily}`;
  return `<article class="product-card ${primaryImage(p) ? "has-image" : ""}" data-id="${escapeAttr(p.id)}">
    ${renderProductImage(p)}
    <div class="path">${escapeHtml(path)}</div>
    <h3>${escapeHtml(p["Product Name"])}</h3>
    <p class="spec-line">${escapeHtml(val(p,"cpu") || val(p,"features") || "Specs available in the detail view.")}</p>
    <div class="chips">
      ${p.releaseYear ? `<span class="chip">${p.releaseYear}</span>` : ""}
      ${val(p,"form") ? `<span class="chip">${escapeHtml(val(p,"form"))}</span>` : ""}
      ${val(p,"screen") ? `<span class="chip">${escapeHtml(val(p,"screen"))}</span>` : ""}
    </div>
  </article>`;
}

function attachProductClicks(root=document) {
  root.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => openProduct(card.dataset.id));
  });
}

function renderProducts() {
  const grid = $("#product-grid");
  if (!grid) return;
  const items = filteredProducts();
  $("#result-count").textContent = `${items.length.toLocaleString()} product${items.length === 1 ? "" : "s"}`;
  if (!items.length) {
    grid.innerHTML = `<div class="empty">No products matched. Your filter combo is doing too much.</div>`;
    return;
  }
  grid.innerHTML = items.map(productCard).join("");
  attachProductClicks(grid);
}

function renderFamilies(activeCategory = null) {
  if (!$("#family-grid")) return;
  const params = new URLSearchParams(location.search);
  activeCategory = activeCategory || params.get("category") || "Desktop";
  if (!CATEGORY_ORDER.includes(activeCategory)) activeCategory = "Desktop";

  const tabs = $("#category-tabs");
  tabs.innerHTML = CATEGORY_ORDER.map(c => `<button class="pill ${c === activeCategory ? "is-active" : ""}" data-category-tab="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("");
  tabs.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    renderFamilies(btn.dataset.categoryTab);
    resetFamilyPanels();
  }));

  const subset = products.filter(p => cat(p) === activeCategory);
  const familyGroups = {};
  subset.forEach(p => {
    const key = p.family || "Other";
    (familyGroups[key] ||= []).push(p);
  });

  $("#family-browser-title").textContent = `${activeCategory} families`;
  $("#family-browser-copy").textContent = `Choose a ${activeCategory.toLowerCase()} family to see its subfamilies first.`;

  $("#family-grid").innerHTML = Object.entries(familyGroups).sort((a,b)=>a[0].localeCompare(b[0])).map(([family, items]) => {
    const subCount = uniq(items.map(p => p.subfamily)).length;
    return `<article class="family-card" data-category="${escapeAttr(activeCategory)}" data-family="${escapeAttr(family)}">
      <div class="mini-path">${escapeHtml(activeCategory)}</div>
      <strong>${escapeHtml(family)}</strong>
      <p>${subCount} subfamil${subCount === 1 ? "y" : "ies"} · ${yearsLabel(items)}</p>
      <div class="count">${items.length} product${items.length === 1 ? "" : "s"} →</div>
    </article>`;
  }).join("");
  $$(".family-card").forEach(card => card.addEventListener("click", () => openFamily(card.dataset.category, card.dataset.family)));
}

function resetFamilyPanels() {
  $("#subfamily-section")?.classList.add("hidden");
  $("#products-section")?.classList.add("hidden");
}

function openFamily(category, family) {
  state.activeFamily = { category, family };
  state.activeSubfamily = null;
  const items = products.filter(p => cat(p) === category && p.family === family);
  const groups = {};
  items.forEach(p => { (groups[p.subfamily || "Products"] ||= []).push(p); });

  $("#subfamily-section").classList.remove("hidden");
  $("#products-section").classList.add("hidden");
  $("#family-panel-path").textContent = `${category} → ${family}`;
  $("#family-panel-title").textContent = `${family} subfamilies`;
  $("#family-panel-copy").textContent = `${items.length} products across ${Object.keys(groups).length} subfamilies.`;
  $("#subfamily-grid").innerHTML = Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0])).map(([subfamily, subItems]) => `
    <article class="subfamily-card" data-subfamily="${escapeAttr(subfamily)}">
      <div class="mini-path">${escapeHtml(category)} → ${escapeHtml(family)}</div>
      <strong>${escapeHtml(subfamily)}</strong>
      <p>${subItems.length} product${subItems.length === 1 ? "" : "s"} · ${yearsLabel(subItems)}</p>
      <div class="count">View products →</div>
    </article>
  `).join("");
  $$(".subfamily-card").forEach(card => card.addEventListener("click", () => openSubfamily(card.dataset.subfamily)));
  $("#subfamily-section").scrollIntoView({behavior: "smooth", block: "start"});
}

function openSubfamily(subfamily) {
  const active = state.activeFamily;
  if (!active) return;
  state.activeSubfamily = subfamily;
  const items = products.filter(p => cat(p) === active.category && p.family === active.family && p.subfamily === subfamily)
    .sort((a,b)=>(a.releaseYear||0)-(b.releaseYear||0)||a["Product Name"].localeCompare(b["Product Name"]));
  $("#products-section").classList.remove("hidden");
  $("#subfamily-panel-path").textContent = `${active.category} → ${active.family} → ${subfamily}`;
  $("#subfamily-panel-title").textContent = subfamily;
  $("#subfamily-panel-copy").textContent = `${items.length} clickable product${items.length === 1 ? "" : "s"} in this subfamily · ${yearsLabel(items)}.`;

  $("#generation-groups").innerHTML = `
    <section class="generation-group subfamily-products-group">
      <div class="generation-heading">
        <h3>All ${escapeHtml(subfamily)} products</h3>
        <span>${yearsLabel(items)}</span>
      </div>
      <div class="product-grid compact">${items.map(productCard).join("")}</div>
    </section>
  `;
  attachProductClicks($("#generation-groups"));
  $("#products-section").scrollIntoView({behavior: "smooth", block: "start"});
}

function renderTimeline() {
  const list = $("#timeline-list");
  if (!list) return;
  const filtered = timelineEvents.filter(e => {
    if (state.era === "all") return true;
    const decade = Math.floor(Number(e.year) / 10) * 10;
    if (state.era === "1970") return e.year < 1990;
    return decade === Number(state.era);
  });
  list.innerHTML = filtered.map(e => {
    const match = products.find(p => Number(p.releaseYear) === Number(e.year) && e.title.toLowerCase().includes((p.family || "").toLowerCase()));
    return `<article class="timeline-item">
      <div class="timeline-year">${e.year}</div>
      <div class="timeline-body">
        <span class="badge">${escapeHtml(e.type)}</span>
        <h3>${escapeHtml(e.title)}</h3>
        <p>${escapeHtml(e.body || "")}</p>
      </div>
    </article>`;
  }).join("");
}

function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p || !$("#product-dialog")) return;
  const detailFields = [
    ["Release Year", p["Release Year"]],
    ["Discontinued", p["Disc. Year"] || "Current / unknown"],
    ["Product Type", p["Product Type"]],
    ["Category", cat(p)],
    ["Model Number(s)", val(p,"modelNumber") || "—"],
    ["Model Identifier(s)", val(p,"identifier") || "—"],
    ["Form Factor", val(p,"form") || "—"],
    ["Display", [val(p,"display"), val(p,"screen")].filter(Boolean).join(" · ") || "—"],
    ["Colors", val(p,"colors") || "—"],
    ["CPU / Chip", val(p,"cpu") || "—"],
    ["GPU / Graphics", val(p,"gpu") || "—"],
    ["Memory / RAM", val(p,"memory") || "—"],
    ["Storage", [val(p,"storage"), val(p,"storageType")].filter(Boolean).join(" · ") || "—"],
    ["Shipping OS", val(p,"shippingOS") || "—"],
    ["Last Supported OS", val(p,"lastOS") || "—"],
    ["Notes", val(p,"notes") || "—"]
  ];
  $("#dialog-content").innerHTML = `<div class="dialog-hero ${primaryImage(p) ? "has-hero-image" : ""}">
    ${renderProductImage(p, "dialog-product-image")}
    <div class="path">${escapeHtml(cat(p))} → ${escapeHtml(p.family)} → ${escapeHtml(p.subfamily)}</div>
    <h2>${escapeHtml(p["Product Name"])}</h2>
    <p>${escapeHtml(val(p,"features") || "A catalog entry from the Apple Product Museum dataset.")}</p>
  </div>
  <div class="detail-grid">
    ${detailFields.map(([label,value]) => `<div class="detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join("")}
  </div>
  ${renderLinksSection(p)}`;
  $("#product-dialog").showModal();
}

function wireEvents() {
  if ($("#search")) $("#search").addEventListener("input", e => { state.query = e.target.value; renderProducts(); });
  if ($("#category-filter")) $("#category-filter").addEventListener("change", e => { state.category = e.target.value; refreshDependentFilters(); renderProducts(); });
  if ($("#family-filter")) $("#family-filter").addEventListener("change", e => { state.family = e.target.value; refreshDependentFilters(); renderProducts(); });
  if ($("#subfamily-filter")) $("#subfamily-filter").addEventListener("change", e => { state.subfamily = e.target.value; renderProducts(); });
  if ($("#year-filter")) $("#year-filter").addEventListener("input", e => { state.year = e.target.value; renderProducts(); });
  if ($("#sort")) $("#sort").addEventListener("change", e => { state.sort = e.target.value; renderProducts(); });
  if ($("#clear-filters")) $("#clear-filters").addEventListener("click", () => {
    Object.assign(state, {category:"", family:"", subfamily:"", query:"", year:"", sort:"year-asc"});
    $("#search").value = ""; $("#category-filter").value = ""; $("#year-filter").value = ""; $("#sort").value = "year-asc";
    refreshDependentFilters(); renderProducts();
  });
  if ($("#dialog-close")) $("#dialog-close").addEventListener("click", () => $("#product-dialog").close());
  if ($("#product-dialog")) $("#product-dialog").addEventListener("click", e => { if (e.target.id === "product-dialog") $("#product-dialog").close(); });
  $$(".timeline-controls .pill").forEach(btn => btn.addEventListener("click", () => {
    $$(".timeline-controls .pill").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.era = btn.dataset.era;
    renderTimeline();
  }));
  if ($("#back-to-families")) $("#back-to-families").addEventListener("click", () => resetFamilyPanels());
  if ($("#back-to-subfamilies")) $("#back-to-subfamilies").addEventListener("click", () => {
    $("#products-section").classList.add("hidden");
    $("#subfamily-section").scrollIntoView({behavior:"smooth", block:"start"});
  });
}

setActiveNav();
setStats();
renderCategoryOverview();
populateCatalogFilters();
renderTimeline();
renderFamilies();
renderProducts();
wireEvents();
