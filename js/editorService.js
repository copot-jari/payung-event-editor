import { uiConfig } from './config.js';
import { $ } from './ui.js';
import { loadSceneForNode } from './sprite.js';
import { updateConnections } from './connections.js';
import { deleteNode } from './nodes.js';
import { populateNodeVariableChanges } from './nodeVariables.js';

export const editorState = {
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    initialScrollX: 0,
    initialScrollY: 0,
    isSelecting: false,
    selectionStartX: 0,
    selectionStartY: 0,
    selectedNodes: []
};

export const editor = $(uiConfig.selectors.editor);

const selectionRect = document.createElement('div');
selectionRect.className = 'selection-rectangle absolute border border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none hidden';
selectionRect.style.zIndex = '999';
document.body.appendChild(selectionRect);

export function getSelectedNodesCount() {
    return editorState.selectedNodes.length;
}

export function updateSelectionUI() {
    const count = getSelectedNodesCount();
    const leftButtonContainer = document.getElementById('rightButtonContainer');
    const rightButtonContainer = document.querySelectorAll('#rightButtonContainer')[1];
    
    if (count > 1) {
        if (leftButtonContainer) {
            const selectionCountEl = document.getElementById('selectionCount');
            if (selectionCountEl) {
                selectionCountEl.textContent = `${count} nodes selected`;
            } else {
                const countButton = document.createElement('button');
                countButton.id = 'selectionCount';
                countButton.className = 'bg-blue-700 bg-opacity-50 hover:bg-opacity-100 transition border-blue-700 border text-white px-4 py-2 rounded';
                countButton.textContent = `${count} nodes selected`;
                leftButtonContainer.querySelector('.flex').appendChild(countButton);
            }
        }
        
        if (rightButtonContainer) {
            const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
            if (!bulkDeleteBtn) {
                const deleteButton = document.createElement('button');
                deleteButton.id = 'bulkDeleteBtn';
                deleteButton.className = 'bg-red-700 bg-opacity-50 hover:bg-opacity-100 transition border-red-700 border text-white px-4 py-2 rounded';
                deleteButton.textContent = `Delete ${count} nodes`;
                deleteButton.addEventListener('click', confirmBulkDelete);
                rightButtonContainer.querySelector('.flex').appendChild(deleteButton);
            } else {
                bulkDeleteBtn.textContent = `Delete ${count} nodes`;
            }
        }
    } else {
        const selectionCountEl = document.getElementById('selectionCount');
        if (selectionCountEl) {
            selectionCountEl.remove();
        }
        
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.remove();
        }
    }
}

export function setupPanning() {
    editor.addEventListener("mousedown", e => {
        if (e.target !== editor || e.button != 1) return;
        e.preventDefault();
        editorState.isPanning = true;
        editorState.panStartX = e.clientX;
        editorState.panStartY = e.clientY;
        editorState.initialScrollX = window.pageXOffset;
        editorState.initialScrollY = window.pageYOffset;
        editor.style.cursor = uiConfig.styles.panningCursor;
    });

    document.addEventListener("mousemove", e => {
        if (!editorState.isPanning) return;
        const dx = e.clientX - editorState.panStartX;
        const dy = e.clientY - editorState.panStartY;
        window.scrollTo(editorState.initialScrollX - dx, editorState.initialScrollY - dy);
    });

    document.addEventListener("mouseup", (e) => {
        if (editorState.isPanning && e.button == 1) {
            editorState.isPanning = false;
            editor.style.cursor = uiConfig.styles.defaultCursor;
        }
    });
}

export function setupAreaSelection() {
    editor.addEventListener("mousedown", e => {
        if (e.target !== editor || e.button !== 0 || editorState.isPanning) return;
        
        editorState.isSelecting = true;
        editorState.selectionStartX = e.clientX + window.scrollX;
        editorState.selectionStartY = e.clientY + window.scrollY;
        
        if (!e.shiftKey) {
            clearNodeSelection();
        }
        
        selectionRect.classList.remove('hidden');
        selectionRect.style.left = `${editorState.selectionStartX}px`;
        selectionRect.style.top = `${editorState.selectionStartY}px`;
        selectionRect.style.width = '0px';
        selectionRect.style.height = '0px';
        
        editor.classList.add('selecting');
    });
    
    document.addEventListener("mousemove", e => {
        if (!editorState.isSelecting) return;
        
        const currentX = e.clientX + window.scrollX;
        const currentY = e.clientY + window.scrollY;
        
        const left = Math.min(editorState.selectionStartX, currentX);
        const top = Math.min(editorState.selectionStartY, currentY);
        const width = Math.abs(currentX - editorState.selectionStartX);
        const height = Math.abs(currentY - editorState.selectionStartY);
        
        selectionRect.style.left = `${left}px`;
        selectionRect.style.top = `${top}px`;
        selectionRect.style.width = `${width}px`;
        selectionRect.style.height = `${height}px`;
        
        updateNodesInSelection(left, top, width, height);
    });
    
    document.addEventListener("mouseup", e => {
        if (!editorState.isSelecting) return;
        
        const width = parseInt(selectionRect.style.width);
        const height = parseInt(selectionRect.style.height);
        
        if (width > 5 || height > 5) {
            finalizeNodeSelection();
        }
        
        editorState.isSelecting = false;
        selectionRect.classList.add('hidden');
        
        editor.classList.remove('selecting');
    });
}

function updateNodesInSelection(left, top, width, height) {
    const selectionBounds = {
        left,
        top,
        right: left + width,
        bottom: top + height
    };
    
    window.nodes.forEach(nodeData => {
        const nodeEl = nodeData.element;
        const nodeRect = nodeEl.getBoundingClientRect();
        const nodeLeft = nodeRect.left + window.scrollX;
        const nodeTop = nodeRect.top + window.scrollY;
        const nodeRight = nodeLeft + nodeRect.width;
        const nodeBottom = nodeTop + nodeRect.height;
        
        const isInSelection = 
            nodeRight >= selectionBounds.left && 
            nodeLeft <= selectionBounds.right && 
            nodeBottom >= selectionBounds.top && 
            nodeTop <= selectionBounds.bottom;
        
        if (isInSelection) {
            nodeEl.classList.add('temp-selected', 'border-blue-300', 'border-2');
            if (!nodeEl.dataset.tempSelected) {
                nodeEl.dataset.tempSelected = 'true';
            }
        } else if (nodeEl.classList.contains('temp-selected')) {
            nodeEl.classList.remove('temp-selected', 'border-blue-300', 'border-2');
            delete nodeEl.dataset.tempSelected;
            
            if (editorState.selectedNodes.includes(nodeData.id)) {
                nodeEl.classList.add('selected', 'border-blue-500', 'border-2');
            }
        }
    });
}

function finalizeNodeSelection() {
    window.nodes.forEach(nodeData => {
        const nodeEl = nodeData.element;
        
        if (nodeEl.dataset.tempSelected === 'true') {
            nodeEl.classList.remove('temp-selected', 'border-blue-300');
            nodeEl.classList.add('selected', 'border-blue-500', 'border-2');
            if (!editorState.selectedNodes.includes(nodeData.id)) {
                editorState.selectedNodes.push(nodeData.id);
            }
            console.log("SELECTED NODES", editorState.selectedNodes)
            delete nodeEl.dataset.tempSelected;
            
        }
    });
    
    updateSelectionUI();
}

export function clearNodeSelection() {
    editorState.selectedNodes = [];
    window.nodes.forEach(nodeData => {
        nodeData.element.classList.remove('selected', 'temp-selected', 'border-blue-300', 'border-blue-500', 'border-2');
    });
    
    updateSelectionUI();

    window.selectedNode = null;
}

export function centerEditorView() {
    const editorRect = editor.getBoundingClientRect();
    const editorAbsX = editorRect.left + window.pageXOffset;
    const editorAbsY = editorRect.top + window.pageYOffset;
    const editorCenterX = editorAbsX + editorRect.width / 2;
    const editorCenterY = editorAbsY + editorRect.height / 2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const targetScrollX = editorCenterX - viewportCenterX;
    const targetScrollY = editorCenterY - viewportCenterY;
    window.scrollTo({
        left: targetScrollX,
        top: targetScrollY,
        behavior: "auto"
    });
}

export function centerNodeInView(node) {
    const rect = node.getBoundingClientRect();
    const nodeAbsoluteX = rect.left + window.pageXOffset;
    const nodeAbsoluteY = rect.top + window.pageYOffset;
    const nodeCenterX = nodeAbsoluteX + rect.width / 2;
    const nodeCenterY = nodeAbsoluteY + rect.height / 2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const targetScrollX = nodeCenterX - viewportCenterX;
    const targetScrollY = nodeCenterY - viewportCenterY;

    window.scrollTo({
        left: targetScrollX,
        top: targetScrollY,
        behavior: "smooth"
    });
}

export async function handleNodeSelection(node, centerView = false) {
    const nodeData = window.nodes.find(n => n.id === node.dataset.id);
    if (!nodeData) return;


    if (!window.event || !window.event.shiftKey) {
        clearNodeSelection();
    }

    node.classList.add("selected", "border-2", "border-blue-500");
    
    if (!editorState.selectedNodes.includes(nodeData.id)) {
        editorState.selectedNodes.push(nodeData.id);
    }

    window.selectedNodeDOM = node;
    window.selectedNodeData = nodeData;
    window.selectedNode = node;

    if (centerView) {
        if (window.hasUnsavedSceneChanges) {
            const shouldProceed = await window.customConfirm("You have unsaved scene changes. Do you want to proceed without saving?");
            if (!shouldProceed) {
                return;
            }
            if (typeof window.showUnsavedChangesToast === 'function') {
                window.showUnsavedChangesToast(false);
            }
        }
        loadSceneForNode(nodeData);
        centerNodeInView(node);
    }

    
    updateSelectionUI();
    
    populateNodeVariableChanges();

    return nodeData;
}

export function setupEditorEvents() {
    editor.addEventListener(uiConfig.events.nodeSelected, e => {
        if (window.connectionSelectionMode) {
            window.closeSidebar();
        }

        handleNodeSelection(e.detail.node, false);
    });

    editor.addEventListener(uiConfig.events.updateConnection, () => {
        updateConnections(window.connections);
    });

    editor.addEventListener("click", e => {
        if (e.target === editor) {
            window.closeSidebar();
        }
    });
    
    setupAreaSelection();
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            clearNodeSelection();
        }
    });
}

export function resetEditorTransform() {
    editor.style.transform = "";
}

export function confirmBulkDelete() {
    const count = getSelectedNodesCount();
    if (count <= 1) return;
    
    const deleteNodeModal = $(uiConfig.selectors.deleteNodeModal);
    const modalTitle = deleteNodeModal.querySelector('h2');
    const modalText = deleteNodeModal.querySelector('p');
    const confirmButton = $(uiConfig.selectors.confirmDeleteNodeButton);
    
    if (!modalTitle.dataset.originalText) {
        modalTitle.dataset.originalText = modalTitle.textContent;
        modalText.dataset.originalText = modalText.textContent;
        confirmButton.dataset.originalText = confirmButton.textContent;
    }
    
    modalTitle.textContent = 'Confirm Bulk Delete';
    modalText.textContent = `Are you sure you want to delete ${count} nodes?`;
    confirmButton.textContent = `Delete ${count} nodes`;
    
    deleteNodeModal.dataset.bulkDelete = 'true';
    
    deleteNodeModal.classList.remove(uiConfig.classes.hidden);
}

export function bulkDeleteNodes() {
    const selectedNodeIds = [...editorState.selectedNodes];
    const editor = $(uiConfig.selectors.editor);
    
    selectedNodeIds.forEach(nodeId => {
        const nodeData = window.nodes.find(n => n.id === nodeId);
        if (nodeData) {
            deleteNode(nodeData, editor, window.connections);
        }
    });
    
    clearNodeSelection();
    
    const deleteNodeModal = $(uiConfig.selectors.deleteNodeModal);
    const modalTitle = deleteNodeModal.querySelector('h2');
    const modalText = deleteNodeModal.querySelector('p');
    const confirmButton = $(uiConfig.selectors.confirmDeleteNodeButton);
    
    if (modalTitle.dataset.originalText) {
        modalTitle.textContent = modalTitle.dataset.originalText;
        modalText.textContent = modalText.dataset.originalText;
        confirmButton.textContent = confirmButton.dataset.originalText;
    }
    
    delete deleteNodeModal.dataset.bulkDelete;
} 