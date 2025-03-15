import { $, buildConditionRow, buildFlagRow, buildClearAllButton } from './ui.js';
import { uiConfig } from './config.js';
import { 
  initDatabase, 
  saveStateToDB, 
  saveProjectToFile,
  loadProjectFromPath,
  loadStateFromDBToUI 
} from './database.js';
import { 
  setupDatabaseEvents, 
  setupAddNodeButton, 
  setupGlobalEvents 
} from './eventHandlers.js';
import {
  createNode,
  makeDraggable,
  selectNode,
  duplicateNode,
} from "./nodes.js";
import {
  createRow,
  removeRow
} from "./items.js";
import {
  updateConnections
} from "./connections.js";
import {
  commitSceneChangesToNodeData,
  resizeCanvas
} from "./sprite.js";
import { 
  closeSidebar, 
  iniializeSidebar,
  selectNodeAndUpdateSidebar 
} from "./sidebar.js";
import {
  setupEditorEvents,
  setupPanning,
  setupAreaSelection,
  clearNodeSelection,
  updateSelectionUI,
  resetEditorTransform
} from "./editorService.js";
import { initVariableEditor, loadVariables, populateVariableEditor } from './variables.js';
import { initializeScriptEditor, getScriptContent, clearScriptContent } from './scriptParser.js';
import { populateNodeVariableChanges } from './nodeVariables.js';
import { loadEntities, initEntityEditor } from './entities.js';

window.nodes = [];
window.selectedNode = null;
window.connections = [];
window.dbInstance = null;
window.connectionSelectionMode = false;
window.selectedConnectionTarget = null;
let currentEditItem = null;

async function initializeApp() {
    window.db = await initDatabase();
    window.dbInstance = window.db;
    window.connections = [];
    window.globalVariables = [];
    window.currentProjectPath = null;
    console.log("DB Instance")
    console.log(window.dbInstance)
    const urlParams = new URLSearchParams(window.location.search);
    const projectPath = urlParams.get('project');
    
    if (projectPath) {
        try {
            console.log('Loading project from path:', projectPath);
            const success = await loadProjectFromPath(projectPath, (newDb) => {
                window.db = newDb;
                window.dbInstance = newDb;
            });
            
            if (success) {
                await loadStateFromDBToUI(window.db, editor, window.connections, spriteList);
                window.globalVariables = await loadVariables(window.db);
                await loadEntities();
                iniializeSidebar();
            } else {
                console.error('Failed to load project from path:', projectPath);
                alert('Failed to load project. Please try again.');
            }
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project: ' + error.message);
        }
    }

    initVariableEditor();
    initEntityEditor();

    setupPanning();
    setupEditorEvents();
    setupAreaSelection();
    setupDatabaseEvents();
    setupAddNodeButton();
    setupGlobalEvents();
    
    updateSelectionUI();
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearNodeSelection();
            window.closeSidebar();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);

export const svg = $(uiConfig.selectors.connectionsSVG),
  sidebar = $(uiConfig.selectors.sidebar),
  addItemButton = $(uiConfig.selectors.addItemButton),
  addNodeButton = $(uiConfig.selectors.addNodeButton),
  editItemModal = $(uiConfig.selectors.editItemModal),
  addConditionBtn = $(uiConfig.selectors.addConditionButton),
  conditionsList = $(uiConfig.selectors.conditionsList),
  addFlagBtn = $(uiConfig.selectors.addFlagButton),
  flagsList = $(uiConfig.selectors.flagsList),
  duplicateNodeButton = $(uiConfig.selectors.duplicateNodeButton),
  confirmItemBtn = $(uiConfig.selectors.confirmItemButton),
  deleteItemBtn = $(uiConfig.selectors.deleteItemButton),
  saveDBButton = $(uiConfig.selectors.saveDBButton),
  returnToMenuButton = document.getElementById('returnToMenu'),
  itemTitleInput = $(uiConfig.selectors.itemTitleInput),
  spriteDetailModal = $('spriteDetailModal');

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

saveDBButton.addEventListener("click", async () => {
    try {
        await saveStateToDB(window.db, window.connections);
        
        if (window.electron && window.currentProjectPath) {
            const success = await saveProjectToFile(window.db);
            if (success) {
                alert('Project saved successfully!');
            } else {
                alert('Failed to save project. Please try again.');
            }
        } else {
            alert('No project path found. Please create a new project from the main menu.');
        }
    } catch (error) {
        console.error('Error saving project:', error);
        alert('Failed to save project. Please try again.');
    }
});


addNodeButton.addEventListener("click", () => {
  const screenCenterX = window.innerWidth / 2 + window.pageXOffset;
  const screenCenterY = window.innerHeight / 2 + window.pageYOffset;
  const editorRect = editor.getBoundingClientRect();
  const editorAbsX = editorRect.left + window.pageXOffset;
  const editorAbsY = editorRect.top + window.pageYOffset;
  const x = screenCenterX - editorAbsX;
  const y = screenCenterY - editorAbsY;
  createNode(x, y, editor, makeDraggable);
});

window.addEventListener("load", () => {
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
});

editor.addEventListener(uiConfig.events.nodeSelected, e => {
  if (window.connectionSelectionMode || !sidebar.classList.contains(uiConfig.classes.hidden)) {
    closeSidebar()
  }
  const nodeData = window.nodes.find(n => n.element === e.detail.node);
  selectNode(e.detail.node, false);
  selectNodeAndUpdateSidebar(nodeData);
});

window.addEventListener("keyup", e => {
  if (e.key === "Escape") {
    closeSidebar()
  }
});

editor.addEventListener(uiConfig.events.updateConnection, () => updateConnections(window.connections));

editor.addEventListener("click", e => {
  if (e.target === editor) {
    closeSidebar()
  }
});

addItemButton.addEventListener("click", () => {
  if (!window.selectedNode) return;
  resetEditorTransform();
  conditionsList.innerHTML = "";
  flagsList.innerHTML = "";
  
  const defaultChoiceContainer = document.createElement('div');
  defaultChoiceContainer.className = 'flex items-center space-x-2 hidden mt-4 mb-2';
  
  const defaultChoiceLabel = document.createElement('label');
  defaultChoiceLabel.textContent = 'Default choice (when no conditions are met):';
  defaultChoiceLabel.className = 'text-white';
  
  const defaultChoiceCheckbox = document.createElement('input');
  defaultChoiceCheckbox.type = 'checkbox';
  defaultChoiceCheckbox.id = 'defaultChoiceCheckbox';
  defaultChoiceCheckbox.checked = false;
  
  defaultChoiceContainer.appendChild(defaultChoiceLabel);
  defaultChoiceContainer.appendChild(defaultChoiceCheckbox);
  
  const conditionsContainer = conditionsList.parentElement;
  conditionsContainer.parentElement.insertBefore(defaultChoiceContainer, conditionsContainer);
  
  window.selectedConnectionTarget = null;
  itemTitleInput.value = "";
  editItemModal.classList.remove(uiConfig.classes.hidden);
  editItemModal.classList.add('flex');
  currentEditItem = {
      nodeId: window.selectedNode.dataset.id
  };
});

editItemModal.addEventListener('click', (e) => {
  if (e.target === editItemModal) {
    editItemModal.classList.add(uiConfig.classes.hidden);
    editItemModal.classList.remove('flex');
  }
});

spriteDetailModal.addEventListener('click', (e) => {
  if (e.target === spriteDetailModal) {
    spriteDetailModal.classList.add(uiConfig.classes.hidden);
    spriteDetailModal.classList.remove('flex');
  }
});

addConditionBtn.addEventListener("click", () => conditionsList.appendChild(buildConditionRow()));

addFlagBtn.addEventListener("click", () => flagsList.appendChild(buildFlagRow()));

document.addEventListener(uiConfig.events.editItem, e => {
  console.log("Editing It")
  const {
      row
  } = e.detail;
  console.log(row.dataset)
  let old = window.connections.filter(e => e.from.itemId == row.dataset.itemId)
  if (old.length > 0) {
      old = old[0]
      $("connections").removeChild(old.line)
      window.connections.splice(window.connections.indexOf(old), 1)
  }
  conditionsList.innerHTML = "";
  flagsList.innerHTML = "";
  itemTitleInput.value = row.itemDetails?.title || "";
  
  const defaultChoiceContainer = document.createElement('div');
  defaultChoiceContainer.className = 'flex items-center space-x-2 hidden mt-4 mb-2';
  
  const defaultChoiceLabel = document.createElement('label');
  defaultChoiceLabel.textContent = 'Default choice (when no conditions are met):';
  defaultChoiceLabel.className = 'text-white';
  
  const defaultChoiceCheckbox = document.createElement('input');
  defaultChoiceCheckbox.type = 'checkbox';
  defaultChoiceCheckbox.id = 'defaultChoiceCheckbox';
  defaultChoiceCheckbox.checked = row.itemDetails?.isDefault || false;
  
  defaultChoiceContainer.appendChild(defaultChoiceLabel);
  defaultChoiceContainer.appendChild(defaultChoiceCheckbox);
  
  const conditionsContainer = conditionsList.parentElement;
  conditionsContainer.parentElement.insertBefore(defaultChoiceContainer, conditionsContainer);
  
  (row.itemDetails?.conditions || []).forEach(cond => conditionsList.appendChild(buildConditionRow(cond)));
  (row.itemDetails?.flags || []).forEach(flag => flagsList.appendChild(buildFlagRow(flag)));
  currentEditItem = {
      nodeId: row.parentElement.parentElement.dataset.id,
      editingRow: row
  };
  editItemModal.classList.remove(uiConfig.classes.hidden);
  let svg = document.getElementById("connections") 
  const nodeData = window.nodes.find(n => n.id === currentEditItem.nodeId);
  removeRow(nodeData, window.connections, row, svg)
});

confirmItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = window.nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  const conditions = [...conditionsList.children].map(div => {
      const [variable, operator, value] = div.querySelectorAll(uiConfig.selectors.conditionRowInputsSelector);
      return {
          variable: variable.value,
          operator: operator.value,
          value: value.value
      };
  });
  const flags = [...flagsList.children].map(div => {
      const [flagName, checkbox] = div.querySelectorAll(uiConfig.selectors.flagRowInputsSelector);
      return {
          flagName: flagName.value,
          value: checkbox.checked
      };
  });
  const title = itemTitleInput.value;
  
  const defaultChoiceCheckbox = document.getElementById('defaultChoiceCheckbox');
  const isDefault = defaultChoiceCheckbox ? defaultChoiceCheckbox.checked : false;
  
  const details = {
      title,
      conditions,
      flags,
      isDefault,
      connectionTarget: window.selectedConnectionTarget
  };
  console.log(currentEditItem)
  createRow(nodeData, details, svg, window.connections, currentEditItem.itemDetails ? currentEditItem.itemDetails.itemId : null);
  editItemModal.classList.add(uiConfig.classes.hidden);
  currentEditItem = null;
  selectNode(nodeData.element, false);
});

deleteItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = window.nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  commitSceneChangesToNodeData();
  editItemModal.classList.add(uiConfig.classes.hidden);
  currentEditItem = null;
  selectNode(nodeData.element, false);
});

async function animate() {
  updateConnections(window.connections);
  requestAnimationFrame(animate);
  resizeCanvas()
}
requestAnimationFrame(animate);



  $('parseScript').addEventListener('click', () => {
    $('parseScriptModal').classList.remove('hidden');
    initializeScriptEditor();
  });

  $('parseScriptClose').addEventListener('click', () => {
    $('parseScriptModal').classList.add('hidden');
    clearScriptContent();
  });

  $('parseScriptSubmit').addEventListener('click', () => {
    const scriptText = getScriptContent().trim();
    if (!scriptText) { 
      alert("Script is empty"); 
      return; 
    }
    
    const groups = scriptText.split(/\n\s*\n/);
    groups.forEach((group, groupIndex) => {
      const lines = group.split('\n').filter(line => line.trim() !== '');
      const groupNodes = [];
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        let speaker, dialogue;

        if (trimmedLine.startsWith('-')) {
          speaker = "Description";
          dialogue = trimmedLine.slice(1).trim();
        } else {
          const parts = line.split(':');
          if (parts.length < 2) return;
          speaker = parts[0].trim();
          dialogue = parts.slice(1).join(':').trim();
        }
        
        let x = 100 + index * 250;
        let y = 100 + groupIndex * 150;        
        
        const screenCenterX = window.innerWidth / 2 + window.pageXOffset;
        const screenCenterY = window.innerHeight / 2 + window.pageYOffset;
        const editorRect = editor.getBoundingClientRect();
        const editorAbsX = editorRect.left + window.pageXOffset;
        const editorAbsY = editorRect.top + window.pageYOffset;
        x += screenCenterX - editorAbsX;
        y += screenCenterY - editorAbsY;
        const newNode = createNode(x, y, document.getElementById('editor'), makeDraggable, { 
          title: speaker === "Description" ? "Description" : speaker 
        });
        newNode.dialogue = dialogue;
        newNode.speaker = speaker;
        if (speaker === "Description") {
          newNode.speakerColor = "#888888";
        }
        groupNodes.push(newNode);
      });
      
      for (let i = 0; i < groupNodes.length - 1; i++) {
        const currentNode = groupNodes[i];
        const nextNode = groupNodes[i+1];
        const itemDetails = {
          title: "PRE_CONT",
          connectionTarget: nextNode.id,
          conditions: [],
          flags: []
        };
        
        createRow(currentNode, itemDetails, document.getElementById('connections'), window.connections);
      }
    });
    
    $('parseScriptModal').classList.add('hidden');
    clearScriptContent();
  });

const rightButtonContainer = $('rightButtonContainer');
const variableEditorBtn = document.createElement('button');
variableEditorBtn.className = 'bg-blue-700 bg-opacity-50 hover:bg-opacity-100 transition border-blue-700 border text-white px-4 py-2 rounded';
variableEditorBtn.textContent = 'Variables';
variableEditorBtn.addEventListener('click', () => {
    populateVariableEditor();
    $('variableEditorModal').classList.remove('hidden');
});
rightButtonContainer.querySelector('.flex').appendChild(variableEditorBtn);