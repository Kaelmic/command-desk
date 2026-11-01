"use strict";

/* ---------- Constants ---------- */
const KEY = "mic-command-desk-v1"; // kept so existing saved data still loads
const VERSION = 2;
const CATEGORIES = ["Business", "Development", "Learning", "Content"];
const STATUSES = ["Active", "Planning", "Paused", "Completed"];
const PRIORITIES = ["high", "normal", "low"];
const BACKUP_REMINDER_DAYS = 14;

const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

const initial = {
  projects: [
    {
      id: "p1",
      name: "PrimeRidge Studios",
      category: "Business",
      status: "Active",
      description:
        "Websites and systems. Build useful work, then get it in front of people.",
      url: "https://primeridgestudios.com",
      repo: "",
      next: "",
    },
    {
      id: "p2",
      name: "Orqiva",
      category: "Development",
      status: "Active",
      description: "An all-around tracker for pitches and personal finances.",
      url: "",
      repo: "",
      next: "",
    },
    {
      id: "p3",
      name: "JD Auto Detailing",
      category: "Development",
      status: "Active",
      description:
        "An automotive website with a focus on detail and presentation.",
      url: "",
      repo: "https://github.com/Kaelmic/jd-auto-detailing",
      next: "",
    },
    {
      id: "p4",
      name: "Developer learning",
      category: "Learning",
      status: "Active",
      description: "C#, web fundamentals, and practical projects.",
      url: "https://www.freecodecamp.org/learn/",
      repo: "",
      next: "",
    },
    {
      id: "p5",
      name: "Content studio",
      category: "Content",
      status: "Planning",
      description: "Short stories, workout content, and project showcases.",
      url: "",
      repo: "",
      next: "",
    },
  ],
  tasks: [],
  links: [
    {
      id: "l1",
      name: "PrimeRidge Studios",
      url: "https://primeridgestudios.com",
    },
    { id: "l2", name: "GitHub", url: "https://github.com/Kaelmic" },
    {
      id: "l3",
      name: "freeCodeCamp",
      url: "https://www.freecodecamp.org/learn/",
    },
  ],
  notes: "",
  focus: "",
};

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const clone = (o) => JSON.parse(JSON.stringify(o));
const str = (v, d = "") => (typeof v === "string" ? v : d);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function safe(u) {
  try {
    const x = new URL(u);
    return ["https:", "http:"].includes(x.protocol) ? x.href : "";
  } catch {
    return "";
  }
}
const okUrl = (u) => (safe(u) ? u : "");
const hostOf = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateStr(new Date());
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateStr(d);
};
const fmtDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};
const daysSince = (iso) => {
  const n = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};
const ago = (iso) => {
  const d = daysSince(iso);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

/* ---------- Data: load, migrate, save ---------- */
// Normalises any saved/imported data into the current shape, so fields added in
// future versions never break older saves.
function migrate(d) {
  if (!d || typeof d !== "object") d = clone(initial);
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
  return {
    version: VERSION,
    projects: list(d.projects).map((p) => ({
      id: str(p.id) || uid(),
      name: str(p.name, "Untitled"),
      category: CATEGORIES.includes(p.category) ? p.category : "Business",
      status: STATUSES.includes(p.status) ? p.status : "Active",
      description: str(p.description),
      url: okUrl(str(p.url)),
      repo: okUrl(str(p.repo)),
      next: str(p.next),
    })),
    tasks: list(d.tasks).map((t) => ({
      id: str(t.id) || uid(),
      title: str(t.title, "Untitled task"),
      project: str(t.project),
      due: /^\d{4}-\d{2}-\d{2}$/.test(str(t.due)) ? t.due : "",
      done: !!t.done,
      priority: PRIORITIES.includes(t.priority) ? t.priority : "normal",
    })),
    links: list(d.links)
      .filter((l) => safe(str(l.url)))
      .map((l) => ({
        id: str(l.id) || uid(),
        name: str(l.name) || hostOf(l.url),
        url: l.url,
      })),
    notes: str(d.notes),
    focus: str(d.focus),
    created: str(d.created) || new Date().toISOString(),
    lastBackup: str(d.lastBackup) || null,
  };
}

let data;
try {
  const raw = localStorage.getItem(KEY);
  try {
    data = migrate(raw ? JSON.parse(raw) : null);
  } catch {
    // Unreadable save: keep a copy rather than silently overwriting it.
    try {
      localStorage.setItem(KEY + "-corrupt", raw);
    } catch {}
    data = migrate(null);
  }
} catch {
  data = migrate(null);
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    toast("Couldn’t save: browser storage is full or blocked. Export a backup.");
    return false;
  }
}

/* ---------- UI state ---------- */
let view = "overview",
  filter = "All", // project category filter
  tfilter = "All", // task status filter
  bannerDismissed = false,
  returnSel = null;

/* ---------- Toast (with optional undo) ---------- */
let toastTimer;
function toast(msg, undo) {
  const el = $("#toast");
  el.textContent = msg;
  if (undo) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-undo";
    b.textContent = "Undo";
    b.onclick = () => {
      undo();
      el.style.display = "none";
    };
    el.append(b);
  }
  el.style.display = "flex";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = "none"), undo ? 5000 : 2400);
}

/* ---------- View builders ---------- */
const query = () => $("#search").value.trim().toLowerCase();
const projName = (id) =>
  data.projects.find((p) => p.id === id)?.name || "Personal";
const isOverdue = (t) => !!t.due && !t.done && t.due < todayStr();

function projects() {
  const q = query();
  const rank = (s) => STATUSES.indexOf(s);
  const list = data.projects
    .filter(
      (p) =>
        (filter === "All" || p.category === filter) &&
        [p.name, p.description, p.next, p.category]
          .join(" ")
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => rank(a.status) - rank(b.status));
  return (
    '<div class="projects">' +
    list
      .map((p) => {
        const mine = data.tasks.filter((t) => t.project === p.id);
        const open = mine.filter((t) => !t.done).length;
        const done = mine.length - open;
        const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
        const milestone = p.next
          ? `<div class="milestone">⚑ ${esc(p.next)}</div>`
          : p.status === "Completed"
            ? ""
            : '<div class="milestone none">No milestone set</div>';
        const progress = mine.length
          ? `<div class="progress" role="progressbar" aria-label="Task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div><div class="progress-label">${done} of ${mine.length} tasks done</div>`
          : "";
        return `<article class="panel project" tabindex="0" role="button" data-project="${esc(p.id)}" aria-label="Edit ${esc(p.name)}"><div class="row"><div class="icon cat-${esc(p.category.toLowerCase())}">${esc(p.name.slice(0, 1))}</div><span class="badge">${esc(p.status)}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>${milestone}${progress}<footer class="row"><span>${esc(p.category)}</span><span>${open} open task${open === 1 ? "" : "s"} ↗</span></footer></article>`;
      })
      .join("") +
    "</div>" +
    (list.length
      ? ""
      : `<div class="empty">${data.projects.length ? "No projects found." : "No projects yet. Add your first one."}</div>`)
  );
}

const PRI_RANK = { high: 0, normal: 1, low: 2 };
function sortTasks(list) {
  return [...list].sort(
    (a, b) =>
      a.done - b.done ||
      (a.due || "9999").localeCompare(b.due || "9999") ||
      PRI_RANK[a.priority] - PRI_RANK[b.priority],
  );
}

function dueInfo(t) {
  if (!t.due) return null;
  if (isOverdue(t)) return { cls: "overdue", text: "Overdue · " + fmtDate(t.due) };
  if (t.due === todayStr() && !t.done) return { cls: "today", text: "Due today" };
  if (t.due === tomorrowStr() && !t.done) return { cls: "", text: "Due tomorrow" };
  return { cls: "", text: fmtDate(t.due) };
}

function taskRow(t) {
  const due = dueInfo(t);
  const pri =
    t.priority === "high"
      ? '<span class="pri high">High</span>'
      : t.priority === "low"
        ? '<span class="pri low">Low</span>'
        : "";
  return `<div class="task ${t.done ? "done" : ""}"><input type="checkbox" aria-label="Complete ${esc(t.title)}" data-check="${esc(t.id)}" ${t.done ? "checked" : ""}><div class="taskbody"><button type="button" class="tasktitle" data-edit-task="${esc(t.id)}" aria-label="Edit ${esc(t.title)}">${esc(t.title)}</button><small>${esc(projName(t.project))}${due ? ` · <span class="due ${due.cls}">${esc(due.text)}</span>` : ""}</small></div>${pri}<button class="delete" data-delete-task="${esc(t.id)}" aria-label="Delete ${esc(t.title)}">×</button></div>`;
}

function tasklist({ limit, openOnly, status = "All", useSearch } = {}) {
  const q = useSearch ? query() : "";
  const list = sortTasks(
    data.tasks.filter((t) => {
      if (openOnly && t.done) return false;
      if (status === "Open" && t.done) return false;
      if (status === "Done" && !t.done) return false;
      if (status === "Overdue" && !isOverdue(t)) return false;
      return (
        !q || (t.title + " " + projName(t.project)).toLowerCase().includes(q)
      );
    }),
  );
  if (!list.length) {
    return `<div class="empty">${
      !data.tasks.length
        ? "A clear slate.<br>Add your first next step."
        : openOnly && !data.tasks.some((t) => !t.done)
          ? "All caught up. ✓"
          : "No tasks match."
    }</div>`;
  }
  return list.slice(0, limit || list.length).map(taskRow).join("");
}

function tasksView() {
  const today = todayStr();
  const counts = {
    All: data.tasks.length,
    Open: data.tasks.filter((t) => !t.done).length,
    Overdue: data.tasks.filter(isOverdue).length,
    Done: data.tasks.filter((t) => t.done).length,
  };
  return (
    '<div class="toolbar">' +
    Object.keys(counts)
      .map(
        (f) =>
          `<button class="btn filter ${tfilter === f ? "active" : ""}" data-tfilter="${f}">${f} (${counts[f]})</button>`,
      )
      .join("") +
    (counts.Done
      ? '<button class="textbtn spacer" data-clear-done>Clear completed</button>'
      : "") +
    '</div><div class="panel pad">' +
    tasklist({ status: tfilter, useSearch: true }) +
    "</div>"
  );
}

function links() {
  const q = view === "links" ? query() : "";
  const list = data.links.filter(
    (l) => !q || (l.name + " " + l.url).toLowerCase().includes(q),
  );
  if (!list.length)
    return `<div class="empty">${data.links.length ? "No links match." : "No shortcuts yet. Add your first link."}</div>`;
  return (
    '<div class="linkgrid">' +
    list
      .map(
        (l) =>
          `<div class="panel link"><a href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.name)} ↗<small>${esc(hostOf(l.url))}</small></a><button class="delete" data-delete-link="${esc(l.id)}" aria-label="Delete ${esc(l.name)}">×</button></div>`,
      )
      .join("") +
    "</div>"
  );
}

function notes() {
  return `<div class="panel pad"><div class="sectionhead"><h2>Scratchpad</h2><small>Autosaves as you type</small></div><textarea class="note" id="notes" aria-label="Personal notes" placeholder="Ideas, reminders, things to come back to…">${esc(data.notes)}</textarea></div>`;
}

function backupBanner() {
  if (bannerDismissed) return "";
  const days = daysSince(data.lastBackup || data.created);
  if (days < BACKUP_REMINDER_DAYS) return "";
  const msg = data.lastBackup
    ? `Your last backup was ${days} days ago.`
    : "You haven’t backed up this workspace yet.";
  return `<div class="banner" role="note"><span>${msg} Your data lives only in this browser.</span><span><button class="textbtn" data-export-now>Export now</button><button class="textbtn" data-dismiss-banner>Dismiss</button></span></div>`;
}

/* ---------- Render ---------- */
const FOCUS_KEYS = [
  ["check", "data-check"],
  ["project", "data-project"],
  ["filter", "data-filter"],
  ["tfilter", "data-tfilter"],
  ["editTask", "data-edit-task"],
  ["deleteTask", "data-delete-task"],
  ["deleteLink", "data-delete-link"],
];
// Remember which element in the content area has focus, so it can be restored
// after the area is rebuilt.
function focusSelector() {
  const a = document.activeElement;
  if (!a || !$("#content").contains(a)) return null;
  for (const [k, attr] of FOCUS_KEYS)
    if (a.dataset[k] !== undefined)
      return `[${attr}="${CSS.escape(a.dataset[k])}"]`;
  if (a.id) return "#" + CSS.escape(a.id);
  return null;
}

const HEADINGS = {
  overview: "A little clarity. A lot of progress.",
  projects: "Your projects",
  tasks: "Make the next step clear.",
  links: "Everything within reach.",
  notes: "Room to think.",
};
const SEARCH_LABEL = {
  overview: "Search projects…",
  projects: "Search projects…",
  tasks: "Search tasks…",
  links: "Search links…",
};

function updateStorageInfo() {
  $("#storage-info").textContent =
    "● Saved on this browser · Last backup: " +
    (data.lastBackup ? ago(data.lastBackup) : "never");
}

function render() {
  const sel = focusSelector();
  const scrollY = window.scrollY;

  document.querySelectorAll("nav button").forEach((b) => {
    const on = b.dataset.view === view;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#breadcrumb").textContent = view.toUpperCase();
  $("#heading").textContent = HEADINGS[view];
  $("#subtitle").textContent =
    view === "overview"
      ? "Your projects, priorities, and next steps — together."
      : "One workspace. Keep moving at your own pace.";

  const search = $("#search");
  search.classList.toggle("hidden", view === "notes");
  search.placeholder = "⌕  " + (SEARCH_LABEL[view] || "");
  search.setAttribute("aria-label", SEARCH_LABEL[view]?.replace("…", "") || "Search");

  const add = $("#add");
  add.classList.toggle("hidden", view === "notes");
  add.textContent =
    view === "tasks"
      ? "+ Add task"
      : view === "links"
        ? "+ Add link"
        : "+ New project";

  let html = "";
  if (view === "overview") {
    const active = data.projects.filter((p) => p.status === "Active").length;
    const open = data.tasks.filter((t) => !t.done).length;
    const overdue = data.tasks.filter(isOverdue).length;
    html = `${backupBanner()}<div class="stats"><div class="stat"><label>ACTIVE PROJECTS</label><b>${active}</b><small>Across your workspace</small></div><div class="stat"><label>OPEN TASKS</label><b>${open}</b>${overdue ? `<small class="alert">${overdue} overdue</small>` : "<small>Your next steps</small>"}</div><div class="stat"><label>COMPLETED TASKS</label><b>${data.tasks.filter((t) => t.done).length}</b><small>Progress, one step at a time</small></div><div class="stat"><label>QUICK LINKS</label><b>${data.links.length}</b><small>Ready when you need them</small></div></div><div class="layout"><div><div class="sectionhead"><h2>Project workspace</h2><button class="textbtn" data-go="projects">View all projects ↗</button></div>${projects()}<section class="links"><div class="sectionhead"><h2>Your shortcuts</h2><button class="textbtn" data-new-link>Add link +</button></div>${links()}</section></div><div class="right"><div><div class="panel pad focus"><div class="eyebrow">One thing at a time</div><h2>${esc(data.focus || "What deserves your attention today?")}</h2><p>Choose one meaningful step. Give it your focus.</p><button class="btn" id="focus">${data.focus ? "Change focus" : "Set today’s focus"} ↗</button></div><div class="panel pad"><div class="sectionhead"><h2>Next steps</h2><button class="textbtn" data-new-task>+ Add</button></div>${tasklist({ limit: 5, openOnly: true })}</div></div>${notes()}</div></div>`;
  }
  if (view === "projects")
    html =
      '<div class="toolbar">' +
      ["All", ...CATEGORIES]
        .map(
          (f) =>
            `<button class="btn filter ${filter === f ? "active" : ""}" data-filter="${f}">${f}</button>`,
        )
        .join("") +
      "</div>" +
      projects();
  if (view === "tasks") html = tasksView();
  if (view === "links") html = links();
  if (view === "notes") html = notes();
  $("#content").innerHTML = html;

  $("#notes")?.addEventListener("input", (e) => {
    data.notes = e.target.value;
    save();
  });
  $("#focus")?.addEventListener("click", () => openForm("focus"));

  if (sel) $(sel)?.focus({ preventScroll: true });
  window.scrollTo(0, scrollY);
  updateStorageInfo();
}

/* ---------- Forms ---------- */
function field(label, name, value = "", type = "text", required = false) {
  return `<label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""}>`;
}
function select(label, name, options, current) {
  return `<label for="f-${name}">${label}</label><select id="f-${name}" name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
}

function openForm(type, id) {
  returnSel = focusSelector();
  const p = type === "project" ? data.projects.find((x) => x.id === id) : null;
  const t = type === "task" ? data.tasks.find((x) => x.id === id) : null;
  let fields = "";

  if (type === "project")
    fields =
      field("Project name", "name", p?.name, "text", true) +
      `<label for="f-description">Description</label><textarea id="f-description" name="description">${esc(p?.description || "")}</textarea>` +
      select("Area", "category", CATEGORIES.map((c) => [c, c]), p?.category) +
      select("Status", "status", STATUSES.map((s) => [s, s]), p?.status) +
      field("Live app / website URL", "url", p?.url, "url") +
      field("Repository URL", "repo", p?.repo, "url") +
      field("Next milestone", "next", p?.next) +
      (p
        ? `<div class="toolbar" style="margin:15px 0 0">${safe(p.url) ? `<a class="btn" href="${esc(safe(p.url))}" target="_blank" rel="noopener noreferrer">Open app ↗</a>` : ""}${safe(p.repo) ? `<a class="btn" href="${esc(safe(p.repo))}" target="_blank" rel="noopener noreferrer">Repository ↗</a>` : ""}</div>`
        : "");
  if (type === "task")
    fields =
      field("What needs doing?", "title", t?.title, "text", true) +
      select(
        "Project",
        "project",
        [["", "Personal"], ...data.projects.map((x) => [x.id, x.name])],
        t?.project || "",
      ) +
      select(
        "Priority",
        "priority",
        [["high", "High"], ["normal", "Normal"], ["low", "Low"]],
        t?.priority || "normal",
      ) +
      field("Due date (optional)", "due", t?.due, "date");
  if (type === "link")
    fields =
      field("Label", "name", "", "text", true) +
      field("URL", "url", "", "url", true);
  if (type === "focus")
    fields = field("Your main focus", "focus", data.focus, "text", true);

  const title =
    type === "project"
      ? p ? "Project details" : "New project"
      : type === "task"
        ? t ? "Edit task" : "Add a next step"
        : type === "link" ? "Add a shortcut" : "Today’s focus";

  $("#form").innerHTML = `<h2>${title}</h2>${fields}<div class="actions">${p || t ? '<button type="button" class="btn danger" id="remove">Delete</button>' : ""}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save</button></div>`;
  $("#cancel").onclick = () => $("#modal").close();

  if (p)
    $("#remove").onclick = () => {
      if (
        confirm("Delete this project? Its tasks will be kept as personal tasks.")
      ) {
        data.projects = data.projects.filter((x) => x.id !== id);
        data.tasks.forEach((x) => {
          if (x.project === id) x.project = "";
        });
        save();
        $("#modal").close();
        render();
      }
    };
  if (t)
    $("#remove").onclick = () => {
      $("#modal").close();
      deleteTask(id);
    };

  $("#form").onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    for (const k in v) if (typeof v[k] === "string") v[k] = v[k].trim();

    if (type === "project") {
      if (!v.name) return toast("Give the project a name");
      for (const k of ["url", "repo"])
        if (v[k] && !safe(v[k])) return toast("Enter an http or https URL");
      if (p) Object.assign(p, v);
      else data.projects.push({ id: uid(), ...v });
    }
    if (type === "task") {
      if (!v.title) return toast("Describe the task first");
      if (t) Object.assign(t, v);
      else data.tasks.push({ id: uid(), done: false, ...v });
    }
    if (type === "link") {
      if (!v.name) return toast("Give the link a label");
      if (!safe(v.url)) return toast("Enter an http or https URL");
      data.links.push({ id: uid(), ...v });
    }
    if (type === "focus") data.focus = v.focus;

    const ok = save();
    $("#modal").close();
    render();
    if (ok) toast("Saved to your workspace");
  };
  $("#modal").showModal();
}

/* ---------- Deletes (with undo) ---------- */
function deleteTask(id) {
  const i = data.tasks.findIndex((t) => t.id === id);
  if (i < 0) return;
  const [item] = data.tasks.splice(i, 1);
  save();
  render();
  toast("Task deleted", () => {
    data.tasks.splice(Math.min(i, data.tasks.length), 0, item);
    save();
    render();
  });
}
function deleteLink(id) {
  const i = data.links.findIndex((l) => l.id === id);
  if (i < 0) return;
  const [item] = data.links.splice(i, 1);
  save();
  render();
  toast("Link deleted", () => {
    data.links.splice(Math.min(i, data.links.length), 0, item);
    save();
    render();
  });
}

/* ---------- Backup ---------- */
function exportBackup() {
  data.lastBackup = new Date().toISOString();
  save();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `command-desk-backup-${todayStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  render();
  toast("Backup exported");
}

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("button,[data-project]");
  if (!b) return;
  const d = b.dataset;
  if (d.view || d.go) {
    view = d.view || d.go;
    filter = "All";
    tfilter = "All";
    $("#search").value = "";
    render();
    window.scrollTo(0, 0);
  }
  if (d.project) openForm("project", d.project);
  if (b.hasAttribute("data-new-task")) openForm("task");
  if (b.hasAttribute("data-new-link")) openForm("link");
  if (d.editTask) openForm("task", d.editTask);
  if (d.filter) {
    filter = d.filter;
    render();
  }
  if (d.tfilter) {
    tfilter = d.tfilter;
    render();
  }
  if (d.deleteTask) deleteTask(d.deleteTask);
  if (d.deleteLink) deleteLink(d.deleteLink);
  if (b.hasAttribute("data-clear-done")) {
    const removed = data.tasks.filter((t) => t.done);
    if (removed.length && confirm(`Remove ${removed.length} completed task${removed.length === 1 ? "" : "s"}?`)) {
      data.tasks = data.tasks.filter((t) => !t.done);
      save();
      render();
      toast("Completed tasks cleared", () => {
        data.tasks.push(...removed);
        save();
        render();
      });
    }
  }
  if (b.hasAttribute("data-export-now")) exportBackup();
  if (b.hasAttribute("data-dismiss-banner")) {
    bannerDismissed = true;
    render();
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.dataset?.project) {
    e.preventDefault();
    openForm("project", e.target.dataset.project);
    return;
  }
  // Shortcuts: "/" focuses search, "n" adds a new item for the current view.
  if (e.metaKey || e.ctrlKey || e.altKey || $("#modal").open) return;
  if (e.target.matches?.("input,textarea,select") || e.target.isContentEditable) return;
  if (e.key === "/" && !$("#search").classList.contains("hidden")) {
    e.preventDefault();
    $("#search").focus();
  }
  if (e.key === "n" && !$("#add").classList.contains("hidden")) {
    e.preventDefault();
    $("#add").click();
  }
});

document.addEventListener("change", (e) => {
  if (e.target.dataset?.check) {
    const t = data.tasks.find((x) => x.id === e.target.dataset.check);
    if (!t) return;
    t.done = e.target.checked;
    save();
    render();
  }
});

$("#search").oninput = render;
$("#add").onclick = () =>
  openForm(view === "tasks" ? "task" : view === "links" ? "link" : "project");
$("#export").onclick = exportBackup;
$("#import").onclick = () => $("#file").click();
$("#file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (
      !d ||
      !Array.isArray(d.projects) ||
      !Array.isArray(d.tasks) ||
      !Array.isArray(d.links) ||
      typeof d.notes !== "string"
    )
      throw Error();
    if (confirm("Replace this browser’s workspace with the backup?")) {
      data = migrate(d);
      save();
      render();
      toast("Backup imported");
    }
  } catch {
    toast("That is not a valid Command Desk backup");
  }
  e.target.value = "";
};

// Click on the dialog backdrop closes it. Checking e.target avoids closing
// on the synthetic click a keyboard "Enter" sends to the Save button.
$("#modal").addEventListener("click", (e) => {
  if (e.target !== e.currentTarget) return;
  const r = e.currentTarget.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
    e.currentTarget.close();
});
// Dialog closed: put focus back where it was, even if the area was re-rendered.
$("#modal").addEventListener("close", () => {
  if (returnSel) $(returnSel)?.focus({ preventScroll: true });
  returnSel = null;
});

// Keep several open tabs in step, and refresh date-based labels (overdue, today)
// when you come back to the tab.
window.addEventListener("storage", (e) => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    data = migrate(JSON.parse(e.newValue));
    render();
  } catch {}
});
document.addEventListener("visibilitychange", () => {
  const a = document.activeElement;
  if (document.visibilityState === "visible" && !$("#modal").open && !a?.matches?.("input,textarea,select"))
    render();
});

save(); // persist any migration of older saved data
render();

/* ---------- Theme ---------- */
const themeButton = document.getElementById("theme-toggle");
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeButton.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
  themeButton.setAttribute("aria-pressed", String(dark));
  themeButton.setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode",
  );
}
themeButton.addEventListener("click", () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(
      "mic-command-desk-theme",
      document.documentElement.dataset.theme,
    );
  } catch {}
  updateThemeButton();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  try {
    if (localStorage.getItem("mic-command-desk-theme")) return;
  } catch {}
  document.documentElement.dataset.theme = e.matches ? "dark" : "light";
  updateThemeButton();
});
updateThemeButton();
