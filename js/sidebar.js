import { deleteNode, duplicateNode, makeDraggable, selectNode } from "./nodes.js";
import { commitSceneChangesToNodeData } from "./sprite.js";
import { $, connections, duplicateNodeButton, editItemModal, editor, sidebar, spriteDetailModal, uiConfig } from "./app.js";

export function closeSidebar() {
    window.nodes.forEach(n => n.element.classList.remove(uiConfig.classes.nodeSelectedBorder, uiConfig.classes.nodeSelectedBorderColor));
    commitSceneChangesToNodeData()
    window.selectedNode = null;
    sidebar.classList.add(uiConfig.classes.hidden);
    editItemModal.classList.add(uiConfig.classes.hidden);
    spriteDetailModal.classList.add(uiConfig.classes.hidden);
    editor.style.transform = "";
    $('rightButtonContainer').classList.remove("hidden")
}

export function iniializeSidebar() {
    document.addEventListener("DOMContentLoaded", () => {
        window.dialogueEditor = new EasyMDE({
            element: $(uiConfig.selectors.dialogueInput),
            toolbar: false,
            autoDownloadFontAwesome: false,
            spellChecker: false,
        });
        $(uiConfig.selectors.speakerInput).addEventListener("input", (e) => {
            if (window.selectedNodeData) {
                window.selectedNodeData.speaker = e.target.value;
            }
        });
        const speakerColorPicker = document.getElementById('speakerColorPicker');
        speakerColorPicker.addEventListener('input', (e) => {
            if (window.selectedNodeData) {
                window.selectedNodeData.speakerColor = e.target.value;
            }
        });
        
        $(uiConfig.selectors.deleteNodeButtonSidebar).addEventListener('click', () => {
            $(uiConfig.selectors.deleteNodeModal).classList.remove(uiConfig.classes.hidden); 
        });

        $(uiConfig.selectors.confirmDeleteNodeButton).addEventListener('click', () => {
            if (window.selectedNodeData) {
                deleteNode(window.selectedNodeData, editor, connections);
                closeSidebar(); 
            }
            $(uiConfig.selectors.deleteNodeModal).classList.add(uiConfig.classes.hidden); 
        });

        $(uiConfig.selectors.cancelDeleteNodeButton).addEventListener('click', () => {
            $(uiConfig.selectors.deleteNodeModal).classList.add(uiConfig.classes.hidden); 
        });
    });

    duplicateNodeButton.addEventListener("click", () => {
        if (window.selectedNode) {
            const selectedNodeData = window.nodes.find(n => n.element === window.selectedNode);
            if (selectedNodeData) {
                const newNodeData = duplicateNode(selectedNodeData, editor, makeDraggable);
                selectNode(newNodeData.element, sidebar, editor);
            }
        }
    });

}