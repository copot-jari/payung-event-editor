import { deleteNode, duplicateNode, makeDraggable, selectNode } from "./nodes.js";
import { commitSceneChangesToNodeData, loadSceneForNode } from "./sprite.js";
import { $, connections, dbInstance, duplicateNodeButton, editItemModal, editor, sidebar, spriteDetailModal, uiConfig } from "./app.js";

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

export function inheritPreviousNode() {
    const parentalConnection = connections.filter(e => 
        e.to.nodeId == window.selectedNodeData.id
    )
    if (parentalConnection.length > 0) {
        const parentNode = window.nodes.filter(e => e.id == parentalConnection[0].from.nodeId)[0];
        window.selectedNodeData.scene = JSON.parse(JSON.stringify(parentNode.scene));
        loadSceneForNode(window.selectedNodeData)
    }
}

function previewSceneStart() {
    previewFlow(dbInstance, window.selectedNodeData)
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
        $('inheritPrevious').addEventListener('click', inheritPreviousNode)
        $('Preview').addEventListener('click', previewSceneStart)
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

function previewFlow(db, startingNodeId) {     
    commitSceneChangesToNodeData();   
    var viewerWindow = window.open("", "VNViewer", "width=1280,height=720");
    viewerWindow.nodes = window.nodes;
    viewerWindow.firstNode = startingNodeId;

    var HTMLString = getFile("viewer.html") //some way to get file as HTML string
    
        
    viewerWindow.document.write(HTMLString);
    viewerWindow.document.close();
  }


  
function getFile(U) {
    var X = new XMLHttpRequest();
    X.open('GET', U, false);
    X.send();
    return X.responseText;
}