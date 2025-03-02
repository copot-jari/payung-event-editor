import { uiConfig } from './config.js';
import { $ } from './ui.js';
import { createNode, makeDraggable, selectNode } from './nodes.js';
import { updateConnections } from './connections.js';
import { closeSidebar } from './sidebar.js';
import { saveStateToDB, saveProjectToFile, loadStateFromDBToUI } from './database.js';
import { centerEditorView } from './editorService.js';
import { createRow } from './items.js';

const editor = $(uiConfig.selectors.editor);

export function setupPanning() {
    let isPanning = false;
    let panStartX, panStartY, initialScrollX, initialScrollY;

    editor.addEventListener("mousedown", e => {
        if (e.target !== editor || e.button != 1) return;
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        initialScrollX = window.pageXOffset;
        initialScrollY = window.pageYOffset;
        editor.style.cursor = uiConfig.styles.panningCursor;
    });

    document.addEventListener("mousemove", e => {
        if (!isPanning) return;
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        window.scrollTo(initialScrollX - dx, initialScrollY - dy);
    });

    document.addEventListener("mouseup", (e) => {
        if (isPanning && e.button == 1) {
            isPanning = false;
            editor.style.cursor = uiConfig.styles.defaultCursor;
        }
    });
}

export function setupEditorEvents() {
    editor.addEventListener(uiConfig.events.nodeSelected, e => {
        if (window.connectionSelectionMode || !$(uiConfig.selectors.sidebar).classList.contains(uiConfig.classes.hidden)) {
            closeSidebar();
        }
        selectNode(e.detail.node);
    });

    editor.addEventListener(uiConfig.events.updateConnection, () => updateConnections(window.connections));

    editor.addEventListener("click", e => {
        if (e.target === editor) {
            closeSidebar();
        }
    });
}

export async function setupDatabaseEvents() {
    $(uiConfig.selectors.returnToMenuButton).addEventListener('click', async () => {
        if (!await window.customConfirm("Have you saved the project? Clicking 'OK' will return to the main menu.")) {
            return;
        } else {
            if (window.electron) {
                window.electron.returnToMenu();
            } else {
                window.location.href = 'menu.html';
            }

        }

    });
}

export function setupAddNodeButton() {
    $(uiConfig.selectors.addNodeButton).addEventListener('click', () => {
        const newNode = createNode(window.editor, makeDraggable);
        window.nodes.push(newNode);
        selectNode(newNode.element);
    });
}

export function setupGlobalEvents() {
    window.addEventListener("keyup", e => {
        if (e.key === "Escape") {
            closeSidebar();
        }
    });

    window.addEventListener("load", () => {
        centerEditorView();
    });
} 