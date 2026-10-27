const STORAGE_KEY = "notes-app-notes";
const homeView = document.getElementById("home-view");
const editorView = document.getElementById("editor-view");
const notesContainer = document.getElementById("container");
const searchInput = document.getElementById("inputSearch");
const sortingSelect = document.getElementById("sorting");
const emptyMessage = document.getElementById("empty-message");
const homeMessage = document.getElementById("home-message");
const editorMessage = document.getElementById("editor-message");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const contentInput = document.getElementById("note-content");
const saveButton = document.getElementById("save-note");
const deleteButton = document.getElementById("delete-note");

let notes = [];
let editingNoteId = null;

function showMessage(element, message) {
    element.textContent = message;
    element.classList.toggle("hidden", !message);
}

function loadNotes() {
    try {
        const savedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (!Array.isArray(savedNotes)) {
            throw new Error("Saved notes must be a list.");
        }

        notes = savedNotes.filter((note) =>
            note &&
            typeof note.id === "string" &&
            typeof note.title === "string" &&
            typeof note.body === "string" &&
            Number.isFinite(note.createdAt) &&
            Number.isFinite(note.updatedAt)
        );
        showMessage(homeMessage, "");
        showMessage(editorMessage, "");
    } catch (error) {
        console.error("Could not load saved notes.", error);
        showMessage(homeMessage, "Saved notes could not be loaded from this browser.");
        showMessage(editorMessage, "Saved notes could not be loaded from this browser.");
        notes = [];
    }
}

function saveNotes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        showMessage(homeMessage, "");
        showMessage(editorMessage, "");
        return true;
    } catch (error) {
        console.error("Could not save notes.", error);
        showMessage(editorMessage, "Your changes could not be saved in this browser.");
        return false;
    }
}

function makeNoteId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVisibleNotes() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const visibleNotes = notes.filter((note) =>
        `${note.title} ${note.body}`.toLocaleLowerCase().includes(query)
    );

    switch (sortingSelect.value) {
        case "alphabets":
            visibleNotes.sort((first, second) => first.title.localeCompare(second.title));
            break;
        case "edited":
            visibleNotes.sort((first, second) => second.updatedAt - first.updatedAt);
            break;
        case "created":
            visibleNotes.sort((first, second) => second.createdAt - first.createdAt);
            break;
    }

    return visibleNotes;
}

function renderNotes() {
    const visibleNotes = getVisibleNotes();
    notesContainer.replaceChildren();
    emptyMessage.textContent = "No notes match your search.";
    emptyMessage.classList.toggle("hidden", visibleNotes.length > 0 || notes.length === 0);

    visibleNotes.forEach((note) => {
        const card = document.createElement("article");
        card.className = "bg-[#f7f7f7]";

        const editLink = document.createElement("a");
        editLink.href = `#edit=${encodeURIComponent(note.id)}`;
        editLink.className = "block p-5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#437993]";

        const heading = document.createElement("h2");
        heading.className = "break-words text-base font-normal leading-6";
        heading.textContent = note.title;

        const body = document.createElement("p");
        body.className = "whitespace-pre-wrap break-words text-base leading-6";
        body.textContent = note.body;

        const date = document.createElement("p");
        date.className = "text-base leading-6";
        date.textContent = new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date(note.updatedAt));

        editLink.append(heading, body, date);
        card.append(editLink);
        notesContainer.append(card);
    });
}

function openEditor(note) {
    editingNoteId = note ? note.id : null;
    titleInput.value = note ? note.title : "";
    contentInput.value = note ? note.body : "";
    saveButton.textContent = note ? "Update" : "Add Notes";
    deleteButton.classList.toggle("hidden", !note);
    saveButton.disabled = false;
    saveButton.classList.remove("cursor-not-allowed", "opacity-50");
    showMessage(editorMessage, "");
}

function renderRoute() {
    const route = window.location.hash.slice(1);
    const isEditor = route === "new" || route.startsWith("edit=");

    homeView.classList.toggle("hidden", isEditor);
    editorView.classList.toggle("hidden", !isEditor);

    if (!isEditor) {
        document.title = "Notes App";
        renderNotes();
        return;
    }

    if (route === "new") {
        document.title = "Create a Note | Notes App";
        openEditor(null);
        titleInput.focus();
        return;
    }

    const editId = new URLSearchParams(route).get("edit");
    const note = notes.find((item) => item.id === editId);
    if (!note) {
        document.title = "Edit Note | Notes App";
        openEditor(null);
        showMessage(editorMessage, "That note could not be found. Go back Home and try again.");
        saveButton.disabled = true;
        saveButton.classList.add("cursor-not-allowed", "opacity-50");
        return;
    }

    document.title = "Edit Note | Notes App";
    openEditor(note);
}

searchInput.addEventListener("input", renderNotes);
sortingSelect.addEventListener("change", renderNotes);
window.addEventListener("hashchange", renderRoute);

noteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const body = contentInput.value.trim();

    if (!title || !body) {
        noteForm.reportValidity();
        return;
    }

    const now = Date.now();
    if (editingNoteId) {
        const note = notes.find((item) => item.id === editingNoteId);
        if (!note) {
            showMessage(editorMessage, "That note could not be found. Go back Home and try again.");
            return;
        }
        note.title = title;
        note.body = body;
        note.updatedAt = now;
    } else {
        notes.push({
            id: makeNoteId(),
            title,
            body,
            createdAt: now,
            updatedAt: now
        });
    }

    if (saveNotes()) {
        window.location.hash = "home";
    }
});

deleteButton.addEventListener("click", () => {
    if (!editingNoteId) return;

    const updatedNotes = notes.filter((note) => note.id !== editingNoteId);
    if (updatedNotes.length === notes.length) {
        showMessage(editorMessage, "That note could not be found. Go back Home and try again.");
        return;
    }

    const previousNotes = notes;
    notes = updatedNotes;
    if (saveNotes()) {
        window.location.hash = "home";
    } else {
        notes = previousNotes;
    }
});

loadNotes();
renderRoute();
