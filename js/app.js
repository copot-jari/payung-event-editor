import {
  initDatabase,
  saveStateToDB,
  downloadDatabase,
  loadDatabaseFile
} from "./database.js";
import {
  createNode,
  makeDraggable,
  selectNode
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
import { duplicateNode as duplicateNodeFn } from "./nodes.js";
const $ = id => document.getElementById(id);
let nodes = [],
  connections = [];
let selectedNode = null,
  currentEditItem = null,
  connectionSelectionMode = false,
  selectedConnectionTarget = null;
let dbInstance = null;
const editor = $("editor"),
  svg = $("connections"),
  sidebar = $("sidebar"),
  addItemButton = $("addItem"),
  addNodeButton = $("addNode"),
  editItemModal = $("editItemModal"),
  addConditionBtn = $("addCondition"),
  conditionsList = $("conditionsList"),
  addFlagBtn = $("addFlag"),
  flagsList = $("flagsList"),
  duplicateNodeButton = $("duplicateNode"),
  selectConnectionBtn = $("selectConnection"),
  selectedConnectionDiv = $("selectedConnection"),
  confirmItemBtn = $("confirmItem"),
  deleteItemBtn = $("deleteItem"),
  saveDBButton = $("saveDB"),
  loadDBButton = $("loadDB"),
  dbFileInput = $("dbFileInput"),
  itemTitleInput = $("itemTitleInput");
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
  editor.style.cursor = "grabbing";
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
      editor.style.cursor = "default";
  }
});
duplicateNodeButton.addEventListener("click", () => {
    if (selectedNode) {
        const selectedNodeData = nodes.find(n => n.element === selectedNode);
        if (selectedNodeData) {
            const newNodeData = duplicateNodeFn(selectedNodeData, editor, nodes, makeDraggable);
            selectNode(newNodeData.element, sidebar, editor, nodes);
        }
}});
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
editor.addEventListener("nodeSelected", e => {
  selectedNode = e.detail.node;
  if (connectionSelectionMode || !sidebar.classList.contains('hidden')) return
  selectNode(selectedNode, sidebar, editor, nodes);
});
editor.addEventListener("nodeToConnect", e => {
  selectedNode = e.detail.node;
  if (connectionSelectionMode) {
      selectedConnectionTarget = selectedNode.dataset.id;
      selectedConnectionDiv.textContent = "Selected: " + selectedNode.querySelector("div.font-semibold").textContent;
      sidebar.classList.remove("hidden");
      editItemModal.classList.remove("hidden");
      connectionSelectionMode = false;
  }
});
window.addEventListener("keyup", e => {
  if (e.key === "Escape") {
      if (connectionSelectionMode) {
          sidebar.classList.remove("hidden");
          editItemModal.classList.remove("hidden");
          connectionSelectionMode = false;
      } else if (selectedNode != null) {
          nodes.forEach(n => n.element.classList.remove("border-2", "border-blue-500"));
          selectedNode = null;
          sidebar.classList.add("hidden");
          commitSceneChangesToNodeData()
          spriteDetailModal.classList.add('hidden');;
          editor.style.transform = "";
      }
  }
});
editor.addEventListener("updateConnection", () => updateConnections(nodes, connections));
editor.addEventListener("click", e => {
  if (e.target === editor) {
      nodes.forEach(n => n.element.classList.remove("border-2", "border-blue-500"));
      selectedNode = null;
      sidebar.classList.add("hidden");
      commitSceneChangesToNodeData()
      spriteDetailModal.classList.add('hidden');;
      editor.style.transform = "";
  }
});
const buildConditionRow = (cond = {}) => {
  const row = document.createElement("div");
  row.className = "flex space-x-2 items-center";
  const variable = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: "Variable",
      className: "border p-1",
      value: cond.variable || ""
  });
  const operator = document.createElement("select");
  operator.className = "border p-1";
  ["=", ">", "<", "!="].forEach(op => {
      const option = document.createElement("option");
      option.value = op;
      option.textContent = op;
      if (op === cond.operator) option.selected = true;
      operator.appendChild(option);
  });
  const value = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: "Value",
      className: "border p-1",
      value: cond.value || ""
  });
  row.append(variable, operator, value);
  return row;
};
const buildFlagRow = (flag = {}) => {
  const row = document.createElement("div");
  row.className = "flex space-x-2 items-center";
  const flagName = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: "Flag Name",
      className: "border p-1",
      value: flag.flagName || ""
  });
  const label = document.createElement("label");
  label.className = "flex items-center space-x-1";
  const checkbox = Object.assign(document.createElement("input"), {
      type: "checkbox",
      checked: flag.value || false
  });
  label.append(checkbox, document.createTextNode("True/False"));
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
  editItemModal.classList.remove("hidden");
  currentEditItem = {
      nodeId: selectedNode.dataset.id
  };
});
addConditionBtn.addEventListener("click", () => conditionsList.appendChild(buildConditionRow()));
addFlagBtn.addEventListener("click", () => flagsList.appendChild(buildFlagRow()));
selectConnectionBtn.addEventListener("click", () => {
  connectionSelectionMode = true;
  selectedConnectionDiv.textContent = "Click on a node to select as connection target...";
  sidebar.classList.add("hidden");
  commitSceneChangesToNodeData()
  spriteDetailModal.classList.add('hidden');;
  editItemModal.classList.add("hidden");
});
document.addEventListener("editItem", e => {
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
  editItemModal.classList.remove("hidden");
  let svg = document.getElementById("connections")
  const nodeData = nodes.find(n => n.id === currentEditItem.nodeId);
  removeRow(nodeData, connections, row, svg)
});
confirmItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  const conditions = [...conditionsList.children].map(div => {
      const [variable, operator, value] = div.querySelectorAll("input, select");
      return {
          variable: variable.value,
          operator: operator.value,
          value: value.value
      };
  });
  const flags = [...flagsList.children].map(div => {
      const [flagName, checkbox] = div.querySelectorAll("input");
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
  editItemModal.classList.add("hidden");
  currentEditItem = null;
  selectNode(nodeData.element, sidebar, editor, nodes);
});
deleteItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  editItemModal.classList.add("hidden");
  currentEditItem = null;
  selectNode(nodeData.element, sidebar, editor, nodes);
});
function loadStateFromDBToUI() {
  nodes = [];
  connections = [];
  editor.querySelectorAll("div.node").forEach(n => n.remove());
  sceneEditor.style.backgroundImage = 'none'; 
  spriteList.innerHTML = ''; 
  sceneEditor.querySelectorAll('.sprite').forEach(el => el.remove()); 
  const nodeRows = dbInstance.exec("SELECT * FROM nodes")[0]?.values || [];
  nodeRows.forEach(([id, x, y, title]) => {
      const nodeData = createNode(x, y, editor, nodes, makeDraggable, {
          id,
          title
      });
      const sceneData = dbInstance.exec(`SELECT background_image, dialogue, speaker FROM scenes WHERE node_id = ?`, [id])[0]?.values?.[0];
      if (sceneData) {
          const [background_image, dialogue, speaker] = sceneData;
          nodeData.scene.background = background_image || null;
          nodeData.dialogue = dialogue || "";
          nodeData.speaker = speaker || "";
      }
      const spriteRows = dbInstance.exec(`SELECT id, src, x, y, width, height, focus, animation_class, continuity_id FROM sprites WHERE scene_node_id = ?`, [id])[0]?.values || [];
      spriteRows.forEach(([spriteId, src, spriteX, spriteY, width, height, focus, animation_class]) => {
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
              title: title || `Choice ${itemId}`,
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
      element: document.getElementById("dialogueInput"),
      toolbar: false,
      autoDownloadFontAwesome: false,
      spellChecker: false,
  });
  document.getElementById("speakerInput").addEventListener("input", (e) => {
      if (window.selectedNodeData) {
          window.selectedNodeData.speaker = e.target.value;
      }
  });
});