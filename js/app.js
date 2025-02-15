import {
  initDatabase,
  saveStateToDB,
  downloadDatabase,
  loadDatabaseFile
} from "./database.js";
import {
  createNode,
  makeDraggable,
  selectNode,
  duplicateNode as duplicateNodeFn
} from "./nodes.js";
import {
  createRow,
  removeRow
} from "./items.js";
import {
  updateConnections
} from "./connections.js";
import {
  commitSceneChangesToNodeData
} from "./sprite.js";

const $ = id => document.getElementById(id);


const uiConfig = {
  selectors: {
      editor: "editor",
      connectionsSVG: "connections",
      sidebar: "sidebar",
      addItemButton: "addItem",
      addNodeButton: "addNode",
      editItemModal: "editItemModal",
      addConditionButton: "addCondition",
      conditionsList: "conditionsList",
      addFlagButton: "addFlag",
      flagsList: "flagsList",
      duplicateNodeButton: "duplicateNode",
      selectConnectionButton: "selectConnection",
      selectedConnectionDiv: "selectedConnection",
      confirmItemButton: "confirmItem",
      deleteItemButton: "deleteItem",
      saveDBButton: "saveDB",
      loadDBButton: "loadDB",
      dbFileInput: "dbFileInput",
      itemTitleInput: "itemTitleInput",
      nodeElementSelector: "div.node",
      nodeTitleSelectorInNode: "div.font-semibold",
      conditionRowInputsSelector: "input, select",
      flagRowInputsSelector: "input",
      dialogueInput: "dialogueInput",
      speakerInput: "speakerInput"
  },
  classes: {
      hidden: "hidden",
      nodeSelectedBorder: "border-2",
      nodeSelectedBorderColor: "border-blue-500",
      conditionFlagRow: "flex space-x-2 items-center",
      inputField: "border p-1"
  },
  text: {
      selectedConnectionPrefix: "Selected: ",
      selectConnectionTargetPrompt: "Click on a node to select as connection target...",
      variablePlaceholder: "Variable",
      operatorOptions: ["=", ">", "<", "!="],
      valuePlaceholder: "Value",
      flagNamePlaceholder: "Flag Name",
      trueFalseLabel: "True/False",
      defaultItemTitlePrefix: "Choice "
  },
  events: {
      nodeSelected: "nodeSelected",
      nodeToConnect: "nodeToConnect",
      updateConnection: "updateConnection",
      editItem: "editItem"
  },
  styles: {
      panningCursor: "grabbing",
      defaultCursor: "default"
  },
  defaultNodeTitle: "Untitled" 
};

let nodes = [],
  connections = [];
let selectedNode = null,
  currentEditItem = null,
  connectionSelectionMode = false,
  selectedConnectionTarget = null;
let dbInstance = null;

const editor = $(uiConfig.selectors.editor),
  svg = $(uiConfig.selectors.connectionsSVG),
  sidebar = $(uiConfig.selectors.sidebar),
  addItemButton = $(uiConfig.selectors.addItemButton),
  addNodeButton = $(uiConfig.selectors.addNodeButton),
  editItemModal = $(uiConfig.selectors.editItemModal),
  addConditionBtn = $(uiConfig.selectors.addConditionButton),
  conditionsList = $(uiConfig.selectors.conditionsList),
  addFlagBtn = $(uiConfig.selectors.addFlagButton),
  flagsList = $(uiConfig.selectors.flagsList),
  duplicateNodeButton = $(uiConfig.selectors.duplicateNodeButton),
  selectConnectionBtn = $(uiConfig.selectors.selectConnectionButton),
  selectedConnectionDiv = $(uiConfig.selectors.selectedConnectionDiv),
  confirmItemBtn = $(uiConfig.selectors.confirmItemButton),
  deleteItemBtn = $(uiConfig.selectors.deleteItemButton),
  saveDBButton = $(uiConfig.selectors.saveDBButton),
  loadDBButton = $(uiConfig.selectors.loadDBButton),
  dbFileInput = $(uiConfig.selectors.dbFileInput),
  itemTitleInput = $(uiConfig.selectors.itemTitleInput);

let isPanning = false;
let panStartX, panStartY, initialScrollX, initialScrollY;

initDatabase().then(db => dbInstance = db);

editor.addEventListener("mousedown", e => {
  if (e.target !== editor) return;
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

document.addEventListener("mouseup", () => {
  if (isPanning) {
      isPanning = false;
      editor.style.cursor = uiConfig.styles.defaultCursor;
  }
});

duplicateNodeButton.addEventListener("click", () => {
  if (selectedNode) {
      const selectedNodeData = nodes.find(n => n.element === selectedNode);
      if (selectedNodeData) {
          const newNodeData = duplicateNodeFn(selectedNodeData, editor, nodes, makeDraggable);
          selectNode(newNodeData.element, sidebar, editor, nodes);
      }
  }
});

saveDBButton.addEventListener("click", () => {
  saveStateToDB(dbInstance, nodes, connections);
  downloadDatabase(dbInstance);
});

loadDBButton.addEventListener("click", () => dbFileInput.click());

dbFileInput.addEventListener("change", e => {
  if (e.target.files.length)
      loadDatabaseFile(e.target.files[0], newDb => {
          dbInstance = newDb;
          loadStateFromDBToUI();
      });
});

addNodeButton.addEventListener("click", () => {
  const screenCenterX = window.innerWidth / 2 + window.pageXOffset;
  const screenCenterY = window.innerHeight / 2 + window.pageYOffset;
  const editorRect = editor.getBoundingClientRect();
  const editorAbsX = editorRect.left + window.pageXOffset;
  const editorAbsY = editorRect.top + window.pageYOffset;
  const x = screenCenterX - editorAbsX;
  const y = screenCenterY - editorAbsY;
  createNode(x, y, editor, nodes, makeDraggable);
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
  selectedNode = e.detail.node;
  if (connectionSelectionMode || !sidebar.classList.contains(uiConfig.classes.hidden)) return
  selectNode(selectedNode, sidebar, editor, nodes);
});

editor.addEventListener(uiConfig.events.nodeToConnect, e => {
  selectedNode = e.detail.node;
  if (connectionSelectionMode) {
      selectedConnectionTarget = selectedNode.dataset.id;
      selectedConnectionDiv.textContent = uiConfig.text.selectedConnectionPrefix + selectedNode.querySelector(uiConfig.selectors.nodeTitleSelectorInNode).textContent;
      sidebar.classList.remove(uiConfig.classes.hidden);
      editItemModal.classList.remove(uiConfig.classes.hidden);
      connectionSelectionMode = false;
  }
});

window.addEventListener("keyup", e => {
  if (e.key === "Escape") {
      if (connectionSelectionMode) {
          commitSceneChangesToNodeData()
          sidebar.classList.remove(uiConfig.classes.hidden);
          editItemModal.classList.remove(uiConfig.classes.hidden);
          connectionSelectionMode = false;
      } else if (selectedNode != null) {
          nodes.forEach(n => n.element.classList.remove(uiConfig.classes.nodeSelectedBorder, uiConfig.classes.nodeSelectedBorderColor));
          selectedNode = null;
          commitSceneChangesToNodeData()
          sidebar.classList.add(uiConfig.classes.hidden);
          spriteDetailModal.classList.add(uiConfig.classes.hidden);;
          editor.style.transform = "";
      }
  }
});

editor.addEventListener(uiConfig.events.updateConnection, () => updateConnections(nodes, connections));

editor.addEventListener("click", e => {
  if (e.target === editor) {
      nodes.forEach(n => n.element.classList.remove(uiConfig.classes.nodeSelectedBorder, uiConfig.classes.nodeSelectedBorderColor));
      selectedNode = null;
      commitSceneChangesToNodeData()
      sidebar.classList.add(uiConfig.classes.hidden);
      spriteDetailModal.classList.add(uiConfig.classes.hidden);;
      editor.style.transform = "";
  }
});

const buildConditionRow = (cond = {}) => {
  const row = document.createElement("div");
  row.className = uiConfig.classes.conditionFlagRow;
  const variable = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: uiConfig.text.variablePlaceholder,
      className: uiConfig.classes.inputField,
      value: cond.variable || ""
  });
  const operator = document.createElement("select");
  operator.className = uiConfig.classes.inputField;
  uiConfig.text.operatorOptions.forEach(op => {
      const option = document.createElement("option");
      option.value = op;
      option.textContent = op;
      if (op === cond.operator) option.selected = true;
      operator.appendChild(option);
  });
  const value = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: uiConfig.text.valuePlaceholder,
      className: uiConfig.classes.inputField,
      value: cond.value || ""
  });
  row.append(variable, operator, value);
  return row;
};

const buildFlagRow = (flag = {}) => {
  const row = document.createElement("div");
  row.className = uiConfig.classes.conditionFlagRow;
  const flagName = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: uiConfig.text.flagNamePlaceholder,
      className: uiConfig.classes.inputField,
      value: flag.flagName || ""
  });
  const label = document.createElement("label");
  label.className = "flex items-center space-x-1"; 
  const checkbox = Object.assign(document.createElement("input"), {
      type: "checkbox",
      checked: flag.value || false
  });
  label.append(checkbox, document.createTextNode(uiConfig.text.trueFalseLabel));
  row.append(flagName, label);
  return row;
};

addItemButton.addEventListener("click", () => {
  if (!selectedNode) return;
  editor.style.transform = "";
  conditionsList.innerHTML = "";
  flagsList.innerHTML = "";
  selectedConnectionDiv.textContent = "";
  selectedConnectionTarget = null;
  itemTitleInput.value = "";
  editItemModal.classList.remove(uiConfig.classes.hidden);
  currentEditItem = {
      nodeId: selectedNode.dataset.id
  };
});

addConditionBtn.addEventListener("click", () => conditionsList.appendChild(buildConditionRow()));

addFlagBtn.addEventListener("click", () => flagsList.appendChild(buildFlagRow()));

selectConnectionBtn.addEventListener("click", () => {
  connectionSelectionMode = true;
  selectedConnectionDiv.textContent = uiConfig.text.selectConnectionTargetPrompt;
  commitSceneChangesToNodeData()
  sidebar.classList.add(uiConfig.classes.hidden);
  spriteDetailModal.classList.add(uiConfig.classes.hidden);;
  editItemModal.classList.add(uiConfig.classes.hidden);
});

document.addEventListener(uiConfig.events.editItem, e => {
  console.log("Editing It")
  const {
      row
  } = e.detail;
  conditionsList.innerHTML = "";
  flagsList.innerHTML = "";
  itemTitleInput.value = row.itemDetails?.title || "";
  (row.itemDetails?.conditions || []).forEach(cond => conditionsList.appendChild(buildConditionRow(cond)));
  (row.itemDetails?.flags || []).forEach(flag => flagsList.appendChild(buildFlagRow(flag)));
  currentEditItem = {
      nodeId: row.parentElement.parentElement.dataset.id,
      editingRow: row
  };
  editItemModal.classList.remove(uiConfig.classes.hidden);
  let svg = document.getElementById("connections") 
  const nodeData = nodes.find(n => n.id === currentEditItem.nodeId);
  removeRow(nodeData, connections, row, svg)
});

confirmItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = nodes.find(n => n.id === currentEditItem.nodeId);
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
  const details = {
      title,
      conditions,
      flags,
      connectionTarget: selectedConnectionTarget
  };
  createRow(nodeData, details, svg, nodes, connections);
  editItemModal.classList.add(uiConfig.classes.hidden);
  currentEditItem = null;
  selectNode(nodeData.element, sidebar, editor, nodes);
});

deleteItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  commitSceneChangesToNodeData();
  editItemModal.classList.add(uiConfig.classes.hidden);
  currentEditItem = null;
  selectNode(nodeData.element, sidebar, editor, nodes);
});

function loadStateFromDBToUI() {
  nodes = [];
  connections = [];
  editor.querySelectorAll(uiConfig.selectors.nodeElementSelector).forEach(n => n.remove());
  sceneEditor.style.backgroundImage = 'none';
  spriteList.innerHTML = '';
  sceneEditor.querySelectorAll('.sprite').forEach(el => el.remove());
  const nodeRows = dbInstance.exec("SELECT * FROM nodes")[0]?.values || [];
  nodeRows.forEach(([id, x, y, title]) => {
      const nodeData = createNode(x, y, editor, nodes, makeDraggable, {
          id,
          title: title || uiConfig.defaultNodeTitle 
      });
      const sceneData = dbInstance.exec(`SELECT background_image, dialogue, speaker FROM scenes WHERE node_id = ?`, [id])[0]?.values?.[0];
      if (sceneData) {
          const [background_image, dialogue, speaker] = sceneData;
          nodeData.scene.background = background_image || null;
          nodeData.dialogue = dialogue || "";
          nodeData.speaker = speaker || "";
      }
      const spriteRows = dbInstance.exec(`SELECT id, src, x, y, width, height, focus, animation_class, continuity_id FROM sprites WHERE scene_node_id = ?`, [id])[0]?.values || [];
      spriteRows.forEach(([spriteId, src, spriteX, spriteY, width, height, focus, animation_class, continuity_id]) => {
          const spriteDataObject = {
              src,
              x: spriteX,
              y: spriteY,
              width,
              height,
              focus: focus === 1,
              animationClass: animation_class || '',
              continuityIdentifier: continuity_id || '',
              sfx: []
          };
          const sfxRows = dbInstance.exec(`SELECT file_name, file_data, loop, auto, volume FROM sprite_sfx WHERE sprite_id = ?`, [spriteId])[0]?.values || [];
          sfxRows.forEach(([file_name, file_data, loop, auto, volume]) => {
              spriteDataObject.sfx.push({
                  fileName: file_name,
                  fileData: file_data,
                  loop: loop === 1,
                  auto: auto === 1,
                  volume: volume
              });
          });
          nodeData.scene.sprites.push(spriteDataObject);
      });
  });
  const itemRows = dbInstance.exec("SELECT id, node_id, title, connection_target_node_id FROM items")[0]?.values || [];
  itemRows.forEach(([itemId, nodeId, title, connection_target_node_id]) => {
      const nodeData = nodes.find(n => n.id === nodeId);
      if (nodeData) {
          const itemDetails = {
              title: title || `${uiConfig.text.defaultItemTitlePrefix}${itemId}`, 
              connectionTarget: connection_target_node_id || null,
              conditions: [],
              flags: []
          };
          const conditionRows = dbInstance.exec(`SELECT variable, operator, value FROM conditions WHERE item_id = ?`, [itemId])[0]?.values || [];
          conditionRows.forEach(([variable, operator, value]) => {
              itemDetails.conditions.push({
                  variable,
                  operator,
                  value
              });
          });
          const flagRows = dbInstance.exec(`SELECT flag_name, value FROM flags WHERE item_id = ?`, [itemId])[0]?.values || [];
          flagRows.forEach(([flag_name, value]) => {
              itemDetails.flags.push({
                  flagName: flag_name,
                  value: value === 1
              });
          });
          createRow(nodeData, itemDetails, svg, nodes, connections);
          const lastRow = nodeData.rows[nodeData.rows.length - 1];
          lastRow.row.dataset.itemId = itemId;
      }
  });
  const connectionRows = dbInstance.exec("SELECT from_node_id, from_item_id, to_node_id FROM connections")[0]?.values || [];
  connectionRows.forEach(([fromNodeId, fromItemId, toNodeId]) => {
      const fromNode = nodes.find(n => n.id === fromNodeId);
      if (!fromNode) return;
      const fromRow = fromNode.rows.find(r => r.itemId === fromItemId);
      if (!fromRow) return;
      const targetNode = nodes.find(n => n.id === toNodeId);
      if (!targetNode) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", "white");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);
      connections.push({
          from: {
              nodeId: fromNodeId,
              itemId: fromItemId
          },
          to: {
              nodeId: toNodeId
          },
          line
      });
  });
  updateConnections(nodes, connections);
  console.log("State loaded from database with new schema.");
}

function animate() {
  updateConnections(nodes, connections);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

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
});