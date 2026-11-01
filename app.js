const KEY = "mic-command-desk-v1";
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
let data;
try {
  data = JSON.parse(localStorage.getItem(KEY)) || initial;
} catch {
  data = initial;
}
let view = "overview",
  filter = "All";
const $ = (s) => document.querySelector(s);
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
function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 2400);
}
const colors = {
  Business: ["#eeeafa", "#7960a7"],
  Development: ["#e8eef8", "#5678ae"],
  Learning: ["#fcf2df", "#aa823a"],
  Content: ["#f8e9e7", "#b56b61"],
};
function projects() {
  const q = $("#search").value.toLowerCase();
  const list = data.projects.filter(
    (p) =>
      (filter === "All" || p.category === filter) &&
      (p.name + " " + p.description).toLowerCase().includes(q),
  );
  return (
    '<div class="projects">' +
    list
      .map((p) => {
        const c = colors[p.category] || colors.Business;
        const tasks = data.tasks.filter(
          (t) => t.project === p.id && !t.done,
        ).length;
        return `<article class="panel project" tabindex="0" role="button" data-project="${p.id}" aria-label="Edit ${esc(p.name)}"><div class="row"><div class="icon" style="--tint:${c[0]};--color:${c[1]}">${esc(p.name.slice(0, 1))}</div><span class="badge">${esc(p.status)}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><footer class="row"><span>${esc(p.category)}</span><span>${tasks} open task${tasks === 1 ? "" : "s"} ↗</span></footer></article>`;
      })
      .join("") +
    "</div>" +
    (list.length ? "" : '<div class="empty">No projects found.</div>')
  );
}
function tasklist(limit) {
  const list = [...data.tasks].sort((a, b) => a.done - b.done);
  return (
    list
      .slice(0, limit || list.length)
      .map(
        (t) =>
          `<div class="task ${t.done ? "done" : ""}"><input type="checkbox" aria-label="Complete ${esc(t.title)}" data-check="${t.id}" ${t.done ? "checked" : ""}><div><div class="tasktitle">${esc(t.title)}</div><small>${esc(data.projects.find((p) => p.id === t.project)?.name || "Personal")}${t.due ? " · " + esc(t.due) : ""}</small></div><button class="delete" data-delete-task="${t.id}" aria-label="Delete task">×</button></div>`,
      )
      .join("") ||
    '<div class="empty">A clear slate.<br>Add your first next step.</div>'
  );
}
function links() {
  return (
    '<div class="linkgrid">' +
    data.links
      .map(
        (l) =>
          `<div class="panel link"><a href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;overflow-wrap:anywhere">${esc(l.name)} ↗<small>${esc(new URL(safe(l.url)).hostname)}</small></a><button class="delete" data-delete-link="${l.id}" aria-label="Delete ${esc(l.name)}">×</button></div>`,
      )
      .join("") +
    "</div>"
  );
}
function notes() {
  return `<div class="panel pad"><div class="sectionhead"><h2>Scratchpad</h2><small>Autosaves as you type</small></div><textarea class="note" id="notes" aria-label="Personal notes" placeholder="Ideas, reminders, things to come back to…">${esc(data.notes)}</textarea></div>`;
}
function render() {
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("#breadcrumb").textContent = view.toUpperCase();
  $("#heading").textContent =
    view === "overview"
      ? "A little clarity. A lot of progress."
      : {
          projects: "Your projects",
          tasks: "Make the next step clear.",
          links: "Everything within reach.",
          notes: "Room to think.",
        }[view];
  $("#subtitle").textContent =
    view === "overview"
      ? "Your projects, priorities, and next steps — together."
      : "One workspace. Keep moving at your own pace.";
  $("#add").textContent =
    view === "tasks"
      ? "+ Add task"
      : view === "links"
        ? "+ Add link"
        : "+ New project";
  let html = "";
  if (view === "overview") {
    const active = data.projects.filter((p) => p.status === "Active").length;
    html = `<div class="stats"><div class="stat"><label>ACTIVE PROJECTS</label><b>${active}</b><small>Across your workspace</small></div><div class="stat"><label>OPEN TASKS</label><b>${data.tasks.filter((t) => !t.done).length}</b><small>Your next steps</small></div><div class="stat"><label>COMPLETED TASKS</label><b>${data.tasks.filter((t) => t.done).length}</b><small>Progress, one step at a time</small></div><div class="stat"><label>QUICK LINKS</label><b>${data.links.length}</b><small>Ready when you need them</small></div></div><div class="layout"><div><div class="sectionhead"><h2>Project workspace</h2><button class="textbtn" data-go="projects">View all projects ↗</button></div>${projects()}<section class="links"><div class="sectionhead"><h2>Your shortcuts</h2><button class="textbtn" data-new-link>Add link +</button></div>${links()}</section></div><div class="right"><div><div class="panel pad focus"><div class="eyebrow">One thing at a time</div><h2>${esc(data.focus || "What deserves your attention today?")}</h2><p>Choose one meaningful step. Give it your focus.</p><button class="btn" id="focus">${data.focus ? "Change focus" : "Set today’s focus"} ↗</button></div><div class="panel pad"><div class="sectionhead"><h2>Next steps</h2><button class="textbtn" data-new-task>+ Add</button></div>${tasklist(5)}</div></div>${notes()}</div></div>`;
  }
  if (view === "projects")
    html =
      '<div class="toolbar">' +
      ["All", "Business", "Development", "Learning", "Content"]
        .map(
          (f) =>
            `<button class="btn filter ${filter === f ? "active" : ""}" data-filter="${f}">${f}</button>`,
        )
        .join("") +
      "</div>" +
      projects();
  if (view === "tasks")
    html = '<div class="panel pad">' + tasklist() + "</div>";
  if (view === "links") html = links();
  if (view === "notes") html = notes();
  $("#content").innerHTML = html;
  $("#notes")?.addEventListener("input", (e) => {
    data.notes = e.target.value;
    save();
  });
  $("#focus")?.addEventListener("click", () => openForm("focus"));
}
function field(label, name, value = "", type = "text", required = false) {
  return `<label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""}>`;
}
function openForm(type, id) {
  let p = data.projects.find((p) => p.id === id);
  let fields = "";
  if (type === "project")
    fields =
      field("Project name", "name", p?.name, "text", true) +
      `<label>Description</label><textarea name="description">${esc(p?.description || "")}</textarea><label>Area</label><select name="category">${["Business", "Development", "Learning", "Content"].map((c) => `<option ${p?.category === c ? "selected" : ""}>${c}</option>`).join("")}</select><label>Status</label><select name="status">${["Active", "Planning", "Paused", "Completed"].map((s) => `<option ${p?.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>` +
      field("Live app / website URL", "url", p?.url, "url") +
      field("Repository URL", "repo", p?.repo, "url") +
      field("Next milestone", "next", p?.next) +
      (p
        ? `<div class="toolbar" style="margin-top:15px">${safe(p.url) ? `<a class="btn" href="${esc(safe(p.url))}" target="_blank" rel="noopener">Open app ↗</a>` : ""}${safe(p.repo) ? `<a class="btn" href="${esc(safe(p.repo))}" target="_blank" rel="noopener">Repository ↗</a>` : ""}</div>`
        : "");
  if (type === "task")
    fields =
      field("What needs doing?", "title", "", "text", true) +
      `<label>Project</label><select name="project"><option value="">Personal</option>${data.projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>` +
      field("Due date (optional)", "due", "", "date");
  if (type === "link")
    fields =
      field("Label", "name", "", "text", true) +
      field("URL", "url", "", "url", true);
  if (type === "focus")
    fields = field("Your main focus", "focus", data.focus, "text", true);
  $("#form").innerHTML =
    `<h2>${type === "project" ? (p ? "Project details" : "New project") : type === "task" ? "Add a next step" : type === "link" ? "Add a shortcut" : "Today’s focus"}</h2>${fields}<div class="actions">${p ? '<button type="button" class="btn" id="remove">Delete</button>' : ""}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save</button></div>`;
  $("#cancel").onclick = () => $("#modal").close();
  if (p)
    $("#remove").onclick = () => {
      if (
        confirm(
          "Delete this project? Its tasks will be kept as personal tasks.",
        )
      ) {
        data.projects = data.projects.filter((x) => x.id !== id);
        data.tasks.forEach((t) => {
          if (t.project === id) t.project = "";
        });
        save();
        $("#modal").close();
        render();
      }
    };
  $("#form").onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (type === "project") {
      if (p) Object.assign(p, v);
      else data.projects.push({ id: uid(), ...v });
    }
    if (type === "task") data.tasks.push({ id: uid(), done: false, ...v });
    if (type === "link") {
      if (!safe(v.url)) {
        toast("Enter an http or https URL");
        return;
      }
      data.links.push({ id: uid(), ...v });
    }
    if (type === "focus") data.focus = v.focus;
    save();
    $("#modal").close();
    render();
    toast("Saved to your workspace");
  };
  $("#modal").showModal();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button,[data-project]");
  if (!b) return;
  if (b.dataset.view || b.dataset.go) {
    view = b.dataset.view || b.dataset.go;
    filter = "All";
    $("#search").value = "";
    render();
  }
  if (b.dataset.project) openForm("project", b.dataset.project);
  if (b.hasAttribute("data-new-task")) openForm("task");
  if (b.hasAttribute("data-new-link")) openForm("link");
  if (b.dataset.filter) {
    filter = b.dataset.filter;
    render();
  }
  if (b.dataset.deleteTask) {
    data.tasks = data.tasks.filter((t) => t.id !== b.dataset.deleteTask);
    save();
    render();
  }
  if (b.dataset.deleteLink) {
    data.links = data.links.filter((l) => l.id !== b.dataset.deleteLink);
    save();
    render();
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.dataset.project) {
    e.preventDefault();
    openForm("project", e.target.dataset.project);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.check) {
    data.tasks.find((t) => t.id === e.target.dataset.check).done =
      e.target.checked;
    save();
    render();
  }
});
$("#search").oninput = () => {
  if (view !== "overview" && view !== "projects") view = "projects";
  render();
};
$("#add").onclick = () =>
  openForm(view === "tasks" ? "task" : view === "links" ? "link" : "project");
$("#export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "command-desk-backup.json";
  a.click();
  URL.revokeObjectURL(url);
};
$("#import").onclick = () => $("#file").click();
$("#file").onchange = async (e) => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (
      !Array.isArray(d.projects) ||
      !Array.isArray(d.tasks) ||
      !Array.isArray(d.links) ||
      typeof d.notes !== "string" ||
      d.links.some((l) => !safe(l.url))
    )
      throw Error();
    if (confirm("Replace this browser’s workspace with the backup?")) {
      data = d;
      save();
      render();
      toast("Backup imported");
    }
  } catch {
    toast("That is not a valid Command Desk backup");
  }
  e.target.value = "";
};
render();

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
