import {sidebar, svg } from "./app.js";
import { $ } from "./ui.js";
import { handleNodeSelection, editorState } from "./editorService.js";

const createEl = (tag, {
    props = {},
    style = {}
} = {}, parent) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    if (parent) parent.appendChild(el);
    return el;
};

export const createNode = (x, y, editor, makeDraggable, config = {}) => {
    console.log(makeDraggable)
    const nodes = window.nodes;
    const id = config.id || crypto.randomUUID();
    const node = createEl("div", {
        props: {
            id,
            className: "node absolute bg-white bg-opacity-5 hover:border-blue-500 active:scale-90 transition border border-[#343740] shadow px-4 py-2 rounded cursor-move select-none"
        },
        style: {
            left: `${x}px`,
            top: `${y}px`
        }
    });
    node.dataset.id = id;
    createEl("div", {
        props: {
            className: "font-semibold truncate mb-2 text-white",
            textContent: config.title || "Untitled"
        }
    }, node);
    const inputConnector = createEl("div", {
        props: {
            className: "node-input-connector bg-blue-500 connector rounded-full absolute"
        },
        style: {
            left: "-6px",
            top: "50%",
            transform: "translateY(-50%)"
        }
    }, node);
    const rowsContainer = createEl("div", {
        props: {
            className: "space-y-2"
        }
    }, node);
    makeDraggable(node);
    editor.appendChild(node);
    const nodeData = {
        id,
        element: node,
        rows: [],
        inputConnector,
        rowsContainer,
        scene: {
            background: null,
            sprites: []
        },
        dialogue: "",
        speaker: "",
        speakerColor: "#ffffff",
        variableChanges: []
    };
    nodes.push(nodeData);
    return nodeData;
};

export function makeDraggable (el) {
    let offsetX, offsetY, isDragging = false;
    let selectedNodesOffsets = [];
    
    el.addEventListener("click", e => {
        e.stopPropagation();
        
        el.dispatchEvent(new CustomEvent("nodeToConnect", {
            detail: {
                node: el
            },
            bubbles: true
        }));
    });
    
    el.addEventListener("mousedown", e => {
        if (e.target.classList.contains("connector")) return;
        
        e.stopPropagation();
        
        if (!el.classList.contains("selected") && !e.shiftKey) {
            handleNodeSelection(el);
        } else if (!el.classList.contains("selected") && e.shiftKey) {
            handleNodeSelection(el);
        }
        
        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.zIndex = 1000;
        
        selectedNodesOffsets = [];
        editorState.selectedNodes.forEach(nodeId => {
            const nodeData = window.nodes.find(n => n.id === nodeId);
            if (nodeData && nodeData.element) {
                const nodeEl = nodeData.element;
                selectedNodesOffsets.push({
                    id: nodeId,
                    offsetLeft: e.clientX - nodeEl.offsetLeft,
                    offsetTop: e.clientY - nodeEl.offsetTop
                });
                
                nodeEl.style.zIndex = 1000;
            }
        });
    });
    
    document.addEventListener("mousemove", e => {
        if (!isDragging) return;
        
        if (editorState.selectedNodes.includes(el.dataset.id) && editorState.selectedNodes.length > 1) {
            selectedNodesOffsets.forEach(nodeOffset => {
                const nodeData = window.nodes.find(n => n.id === nodeOffset.id);
                if (nodeData && nodeData.element) {
                    const nodeEl = nodeData.element;
                    nodeEl.style.left = `${e.clientX - nodeOffset.offsetLeft}px`;
                    nodeEl.style.top = `${e.clientY - nodeOffset.offsetTop}px`;
                    
                    nodeEl.classList.add('dragging');
                }
            });
        } else {
            el.style.left = `${e.clientX - offsetX}px`;
            el.style.top = `${e.clientY - offsetY}px`;
            
            el.classList.add('dragging');
        }
    });
    
    el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        
        handleNodeSelection(el, true);
        
        el.dispatchEvent(new CustomEvent("nodeSelected", {
            detail: {
                node: el
            },
            bubbles: true
        }))
    });
    
    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        
        window.nodes.forEach(nodeData => {
            if (nodeData.element) {
                nodeData.element.style.zIndex = "";
                nodeData.element.classList.remove('dragging');
            }
        });
        
        editorState.selectedNodes.forEach(nodeId => {
            const nodeData = window.nodes.find(n => n.id === nodeId);
            if (nodeData && nodeData.element) {
                nodeData.element.dispatchEvent(new CustomEvent("updateConnection", {
                    bubbles: true
                }));
            }
        });
    });
};

export const selectNode = async (node, centerView = false) => {
    $('rightButtonContainer').classList.add("hidden");

    const nodeData = await handleNodeSelection(node, centerView);
    if (!nodeData) return;

    sidebar.classList.remove("hidden");
    const nodeTitle = node.querySelector("div.font-semibold").textContent;
    sidebar.querySelector("#nodeTitle").textContent = nodeTitle;
    const nodeItems = sidebar.querySelector("#nodeItems");
    nodeItems.innerHTML = "";
    
    const speakerColorPicker = $('speakerColorPicker');

    $('speakerInput').value = nodeData.speaker || "";
    if (window.dialogueEditor) {
        window.dialogueEditor.value(nodeData.dialogue || "");
    } else {
        $('dialogueInput').value = nodeData.dialogue || "";
    }

    console.log(nodeData);

    nodeData.rows.forEach(({
        row
    }) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "flex items-center justify-between p-2 bg-[#030712] border border-[#343740] rounded hover:border-blue-500 transition-colors cursor-pointer";
        
        const title = row.itemDetails?.title || "Untitled Choice";
        
        const titleSpan = document.createElement("span");
        titleSpan.textContent = title;
        titleSpan.className = "flex-grow";
        itemDiv.appendChild(titleSpan);
        
        const editBtn = document.createElement("button");
        editBtn.className = "ml-2 text-gray-400 hover:text-white";
        editBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
        </svg>`;
        
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation(); 
            row.dispatchEvent(new CustomEvent("editItem", {
                bubbles: true,
                detail: { row }
            }));
        });
        
        itemDiv.appendChild(editBtn);
        
        itemDiv.dataset.id = row.dataset.itemId;
        
        itemDiv.addEventListener("click", () => {
            row.dispatchEvent(new CustomEvent("editItem", {
                bubbles: true,
                detail: { row }
            }));
        });
        
        nodeItems.appendChild(itemDiv);
    });

    speakerColorPicker.value = nodeData.speakerColor;
};

export const duplicateNode = (originalNodeData, editor) => {
    const nodes = window.nodes;
    const originalNodeRect = originalNodeData.element.getBoundingClientRect();
    const offsetX = 50;
    const offsetY = 50;
    const x = originalNodeRect.left + window.scrollX + offsetX;
    const y = originalNodeRect.top + window.scrollY + offsetY;
    const newNodeData = createNode(x, y, editor, makeDraggable, {
        title: originalNodeData.element.querySelector('.font-semibold').textContent + " Copy"
    });
    newNodeData.dialogue = originalNodeData.dialogue;
    newNodeData.speaker = originalNodeData.speaker;
    newNodeData.scene.background = originalNodeData.scene.background;
    newNodeData.scene.sprites = originalNodeData.scene.sprites.map(sprite => ({...sprite}));

    return newNodeData;
};

export function deleteNode(nodeData, editor, connections) {
    if (!nodeData) return;

    editor.removeChild(nodeData.element);

    window.nodes = window.nodes.filter(node => node.id !== nodeData.id);

    if (connections) {
        let old = connections.filter(e => e.from.nodeId == nodeData.id || e.to.nodeId == nodeData.id)
        if (old.length > 0) {
            const lengthOfOld = old.length
            for (let index = 0; index < lengthOfOld; index++) {
                const lol = old[index]
                svg.removeChild(lol.line)
                connections.splice(connections.indexOf(lol), 1)   
            }
        }

    }
}
    