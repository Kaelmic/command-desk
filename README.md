# Command Desk

Your personal projects, tasks, links, focus, and notes dashboard.

## Open in VS Code

1. Extract this ZIP.
2. In VS Code, choose File > Open Folder and select command-desk.
3. Open index.html in your browser. No install or build is required.
4. Alternatively, use VS Code Live Server for a consistent local address.

## Files

- index.html: page structure
- styles.css: layout, colours, and responsive styles (all colours are theme variables)
- app.js: dashboard logic, forms, and browser storage

Use Format Document in VS Code (Shift+Alt+F on Windows) to format the source to your preference.

## Features

- **Projects**: category, status, description, links, and a next milestone shown on each card. Cards show task progress and are sorted Active first.
- **Tasks**: add, edit (click the title), delete with Undo, priority (High / Normal / Low), and due dates with Overdue / Due today labels. Filter by All / Open / Overdue / Done, and use Clear completed.
- **Search**: scoped to the current view (projects, tasks, or links). It never switches views on you.
- **Focus, quick links, notes**: as before. Notes autosave.
- **Backups**: Export / Import, a "last backup" indicator, and a reminder banner after 14 days without a backup.
- **Keyboard**: press `/` to search and `n` to add a new item for the current view.
- **Stability**: keyboard focus and scroll position are kept when the page re-renders, and the dashboard refreshes date labels when you return to the tab. Multiple open tabs stay in sync.

## Your data

Data is saved in localStorage for the browser and address you use. It does not sync across devices. Clearing browser site data removes it.

Saved data carries a version number. Older saves (including backups from the first version) are upgraded automatically when loaded: new fields get defaults and invalid links are dropped. If a save is ever unreadable, a copy is kept under the key `mic-command-desk-v1-corrupt` before defaults are loaded.

To bring your existing dashboard data over, click Export backup on the hosted dashboard, then Import backup on your local version. Keep using the same local address so your data stays available.

This version does not read your project files or fetch live data from other apps. Project entries and task counts are managed within Command Desk. Live integrations can be added later.

This package contains the application source only, with no hosting credentials or saved personal records.

## Theme

Use the Light mode / Dark mode button in the header. Your choice is remembered in this browser. Before choosing, the theme follows your device preference. Theme settings are separate from project data and backups.
