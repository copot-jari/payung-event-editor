import { deleteNode, duplicateNode, makeDraggable, selectNode } from "./nodes.js";
import { commitSceneChangesToNodeData, loadSceneForNode } from "./sprite.js";
import { $ } from "./ui.js";
import { uiConfig } from "./config.js";
import { bulkDeleteNodes } from "./editorService.js";
import { initNodeVariableChanges, populateNodeVariableChanges } from "./nodeVariables.js";

export function closeSidebar() {
    
    // if (window.hasUnsavedSceneChanges) {
    //     const shouldProceed = confirm("You have unsaved scene changes. Do you want to proceed without saving?");
    //     if (!shouldProceed) {
    //         return; 
    //     }
    //     window.hasUnsavedSceneChanges = false;
    //     window.originalSceneState = null;
    //     window.showUnsavedChangesToast(false);
    // }

    window.nodes.forEach(n => n.element.classList.remove(uiConfig.classes.nodeSelectedBorder, uiConfig.classes.nodeSelectedBorderColor));
    window.selectedNode = null;
    window.selectedNodeData = null;
    $(uiConfig.selectors.sidebar).classList.add(uiConfig.classes.hidden);
    $(uiConfig.selectors.editItemModal).classList.add(uiConfig.classes.hidden);
    $(uiConfig.selectors.editItemModal).classList.remove('flex');
    $('spriteDetailModal').classList.add(uiConfig.classes.hidden);
    $('spriteDetailModal').classList.remove('flex');
    $(uiConfig.selectors.editor).style.transform = "";
    $('rightButtonContainer').classList.remove("hidden")
}

export function inheritPreviousNode() {
    const parentalConnection = window.connections.filter(e => 
        e.to.nodeId == window.selectedNodeData.id
    )
    if (parentalConnection.length > 0) {
        const parentNode = window.nodes.filter(e => e.id == parentalConnection[0].from.nodeId)[0];
        window.selectedNodeData.scene = JSON.parse(JSON.stringify(parentNode.scene));
        loadSceneForNode(window.selectedNodeData)
    }
}

function previewSceneStart() {
    previewFlow(window.dbInstance, window.selectedNodeData)
}

function updateNodeTitle() {
    if (window.selectedNodeData && window.selectedNodeDOM) {
        const titleText = `${window.selectedNodeData.speaker || ''} - ${window.selectedNodeData.dialogue || ''}`;
        window.selectedNodeDOM.querySelector("div.font-semibold").textContent = titleText;
        $(uiConfig.selectors.sidebar).querySelector("#nodeTitle").textContent = titleText;
    }
}

export function iniializeSidebar() {
    document.addEventListener("DOMContentLoaded", () => {
        window.dialogueEditor = new EasyMDE({
            element: $(uiConfig.selectors.dialogueInput),
            toolbar: false,
            autoDownloadFontAwesome: false,
            spellChecker: false,
        });
        
        window.dialogueEditor.codemirror.on("change", () => {
            if (window.selectedNodeData) {
                window.selectedNodeData.dialogue = window.dialogueEditor.value();
                updateNodeTitle();
            }
        });
        
        $(uiConfig.selectors.speakerInput).addEventListener("input", (e) => {
            if (window.selectedNodeData) {
                window.selectedNodeData.speaker = e.target.value;
                updateNodeTitle();
            }
        });
        const speakerColorPicker = $('speakerColorPicker');
        speakerColorPicker.addEventListener('input', (e) => {
            if (window.selectedNodeData) {
                window.selectedNodeData.speakerColor = e.target.value;
            }
        });
        
        $(uiConfig.selectors.deleteNodeButtonSidebar).addEventListener('click', () => {
            $(uiConfig.selectors.deleteNodeModal).classList.remove(uiConfig.classes.hidden); 
        });

        $(uiConfig.selectors.confirmDeleteNodeButton).addEventListener('click', () => {
            const deleteNodeModal = $(uiConfig.selectors.deleteNodeModal);
            
            if (deleteNodeModal.dataset.bulkDelete === 'true') {
                bulkDeleteNodes();
            } else if (window.selectedNodeData) {
                deleteNode(window.selectedNodeData, editor, connections);
                closeSidebar(); 
            }
            
            deleteNodeModal.classList.add(uiConfig.classes.hidden); 
        });

        $(uiConfig.selectors.cancelDeleteNodeButton).addEventListener('click', () => {
            const deleteNodeModal = $(uiConfig.selectors.deleteNodeModal);
            
            if (deleteNodeModal.dataset.bulkDelete === 'true') {
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
            
            deleteNodeModal.classList.add(uiConfig.classes.hidden); 
        });
        $('inheritPrevious').addEventListener('click', inheritPreviousNode)
        $('Preview').addEventListener('click', previewSceneStart)
        
        initNodeVariableChanges();
    });

    $(uiConfig.selectors.duplicateNodeButton).addEventListener("click", () => {
        if (window.selectedNode) {
            const selectedNodeData = window.nodes.find(n => n.element === window.selectedNode);
            if (selectedNodeData) {
                const newNodeData = duplicateNode(selectedNodeData, editor, makeDraggable);
                selectNode(newNodeData.element, sidebar, editor);
            }
        }
    });

}

function previewFlow(db, startingNodeId) {     
    if (window.selectedNodeData) {
        window.selectedNodeData.dialogue = window.dialogueEditor.value();
    }
    
    var viewerWindow = window.open("", "VNViewer", "width=1280,height=720");
    viewerWindow.nodes = window.nodes;
    viewerWindow.firstNode = startingNodeId;
    
    if (window.globalVariables) {
        viewerWindow.globalVariables = new Map();
        window.globalVariables.forEach((value, key) => {
            viewerWindow.globalVariables.set(key, JSON.parse(JSON.stringify(value)));
        });
    }

    var HTMLString = getFile("viewer.html") 
    
    viewerWindow.document.write(HTMLString);
    viewerWindow.document.close();
}

function getFile(U) {
    var X = new XMLHttpRequest();
    X.open('GET', U, false);
    X.send();
    return X.responseText;
}

window.closeSidebar = closeSidebar;