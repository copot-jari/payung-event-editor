import { createNode, makeDraggable } from "./nodes.js";
import { createRow } from "./items.js";
import { updateConnections } from "./connections.js";
import { $ } from "./ui.js";
import { uiConfig } from "./config.js";
import { loadVariables, getVariableType } from './variables.js';

export async function initDatabase() {
  const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE entities (
      id TEXT PRIMARY KEY,
      title TEXT,
      thumbnail TEXT
    );
    CREATE TABLE sounds (
      id TEXT PRIMARY KEY,
      file_id TEXT,
      start_at TEXT,
      start_stop BOOLEAN, -- IF TRUE THEN THE NODE WILL PLAY THIS SOUND WITH CONTINUITY, IF FALSE THEN WILL STOP THE CONTINUITY
      coninuity_id TEXT,
      volume INTEGER, -- 0 to 100
      FOREIGN KEY (file_id) REFERENCES files(id)
    );
    CREATE TABLE changes (  -- WILL TAKE EFFECT IF NODE IS PLAYED
      id TEXT PRIMARY KEY,
      key TEXT,             -- VARIABLE NAME
      value TEXT,           -- VALUE 
      operator TEXT,        -- + - / * = // if array plus will be push, minus will be pop by the compiler
      type TEXT             -- DATATYPE
    );
    CREATE TABLE variables (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      default_value TEXT
    );
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      trigger_id TEXT,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      title TEXT,
      FOREIGN KEY (trigger_id) REFERENCES entities(id)
    );
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      title TEXT,
      connection_target_node_id TEXT,
      FOREIGN KEY (node_id) REFERENCES nodes(id),
      FOREIGN KEY (connection_target_node_id) REFERENCES nodes(id)
    );
    CREATE TABLE conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      variable TEXT NOT NULL,
      operator TEXT NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
    CREATE TABLE flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      flag_name TEXT NOT NULL,
      value BOOLEAN NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
    CREATE TABLE connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_node_id TEXT NOT NULL,
      from_item_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      FOREIGN KEY (from_node_id) REFERENCES nodes(id),
      FOREIGN KEY (from_item_id) REFERENCES items(id),
      FOREIGN KEY (to_node_id) REFERENCES nodes(id)
    );
    CREATE TABLE files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base64_data TEXT UNIQUE
    );
    CREATE TABLE scenes (
      node_id TEXT PRIMARY KEY,
      background_file_id INTEGER,
      dialogue TEXT,
      speaker_color TEXT,
      speaker TEXT,
      FOREIGN KEY (node_id) REFERENCES nodes(id),
      FOREIGN KEY (background_file_id) REFERENCES files(id)
    );
    CREATE TABLE sprites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_node_id TEXT NOT NULL,
      file_id INTEGER,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      zIndex INTEGER NOT NULL,
      flip BOOLEAN NOT NULL,
      focus BOOLEAN NOT NULL,
      animation_class TEXT,
      continuity_id TEXT,
      FOREIGN KEY (scene_node_id) REFERENCES nodes(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
    );
  `);
  console.log("SQLite database initialized with optimized schema (base64 for sprites and backgrounds).");
  return db;
}
export function saveStateToDB(db, connections) {
  const nodes = window.nodes;
  
  if (!db) return console.error("Database is not initialized yet.");
  db.run("DELETE FROM sprites");
  db.run("DELETE FROM scenes");
  db.run("DELETE FROM files"); 
  db.run("DELETE FROM connections");
  db.run("DELETE FROM flags");
  db.run("DELETE FROM conditions");
  db.run("DELETE FROM items");
  db.run("DELETE FROM nodes");
  db.run("DELETE FROM entities");
  db.run("DELETE FROM sounds");
  db.run("DELETE FROM changes");
  db.run("DELETE FROM variables");

  const base64FileCache = new Map(); 

  nodes.forEach(({
      id,
      element,
      rows,
      scene,
      dialogue,
      speaker,
      speakerColor,
      trigger_id,
      variableChanges,
      sounds
  }) => {
      const x = parseInt(element.style.left) || 0;
      const y = parseInt(element.style.top) || 0;
      const title = element.querySelector("div.font-bold")?.textContent || "";
      
      db.run("INSERT INTO nodes (id, trigger_id, x, y, title) VALUES (?, ?, ?, ?, ?)", 
        [id, trigger_id || null, x, y, title]);

      let backgroundFileId;
      if (scene.background) { 
          if (base64FileCache.has(scene.background)) {
              backgroundFileId = base64FileCache.get(scene.background);
          } else {
              let existingFileIdResult = db.exec("SELECT id FROM files WHERE base64_data = ?", [scene.background]);
              if (existingFileIdResult.length > 0) {
                  backgroundFileId = existingFileIdResult[0].values[0][0];
              } else {
                      db.run("INSERT INTO files (base64_data) VALUES (?)", [scene.background]);
                      backgroundFileId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
                  }
                  base64FileCache.set(scene.background, backgroundFileId);
              }
          }
      
      if (backgroundFileId) {
        db.run("INSERT INTO scenes (node_id, background_file_id, dialogue, speaker, speaker_color) VALUES (?, ?, ?, ?, ?)", 
          [id, backgroundFileId, dialogue || "", speaker || "", speakerColor || "#ffffff"]);
      } else {
        db.run("INSERT INTO scenes (node_id, dialogue, speaker, speaker_color) VALUES (?, ?, ?, ?)", 
          [id, dialogue || "", speaker || "", speakerColor || "#ffffff"]);
      }

      if (Array.isArray(variableChanges)) {
        variableChanges.forEach((change, index) => {
          if (change.variable) {
            const changeId = `${id}_change_${index}`;
            db.run("INSERT INTO changes (id, key, value, operator, type) VALUES (?, ?, ?, ?, ?)",
              [changeId, change.variable, change.value || "", change.operation || "set", getVariableType(change.variable) || "string"]);
          }
        });
      }

      if (Array.isArray(sounds)) {
        sounds.forEach((sound, index) => {
          if (sound.src) {
            let soundFileId;
            if (base64FileCache.has(sound.src)) {
              soundFileId = base64FileCache.get(sound.src);
            } else {
              let existingFileIdResult = db.exec("SELECT id FROM files WHERE base64_data = ?", [sound.src]);
              if (existingFileIdResult.length > 0) {
                soundFileId = existingFileIdResult[0].values[0][0];
              } else {
                db.run("INSERT INTO files (base64_data) VALUES (?)", [sound.src]);
                soundFileId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
              }
              base64FileCache.set(sound.src, soundFileId);
            }

            const soundId = `${id}_sound_${index}`;
            db.run("INSERT INTO sounds (id, file_id, start_at, start_stop, coninuity_id, volume) VALUES (?, ?, ?, ?, ?, ?)",
              [soundId, soundFileId, sound.startAt || "0", sound.startStop ? 1 : 0, sound.continuityId || "", sound.volume || 100]);
          }
        });
      }

      scene.sprites.forEach(spriteData => {
          let spriteFileId;
          if (spriteData.src) { 
              if (base64FileCache.has(spriteData.src)) {
                  spriteFileId = base64FileCache.get(spriteData.src);
              } else {
                  let existingFileIdResult = db.exec("SELECT id FROM files WHERE base64_data = ?", [spriteData.src]);
                  if (existingFileIdResult.length > 0) {
                      spriteFileId = existingFileIdResult[0].values[0][0];
                  } else {
                      db.run("INSERT INTO files (base64_data) VALUES (?)", [spriteData.src]);
                      spriteFileId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
                  }
                  base64FileCache.set(spriteData.src, spriteFileId);
              }
          }

          const spriteValues = [
            id,
            spriteFileId || null,
            spriteData.x || 0,
            spriteData.y || 0,
            spriteData.width || 0,
            spriteData.height || 0,
            spriteData.focus ? 1 : 0,
            spriteData.animationClass || "",
            spriteData.continuityIdentifier || "",
            spriteData.flip ? 1 : 0,
            spriteData.zIndex || 0
          ];

          if (spriteFileId) {
            db.run(`INSERT INTO sprites (
              scene_node_id, file_id, x, y, width, height, focus, 
              animation_class, continuity_id, flip, zIndex
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, spriteValues);
          } else {
            db.run(`INSERT INTO sprites (
              scene_node_id, x, y, width, height, focus,
              animation_class, continuity_id, flip, zIndex
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, spriteValues.slice(1));
          }
      });

      rows.forEach(({ itemId, row }) => {
          const itemTitle = row.itemDetails?.title || `Choice ${itemId}`;
          const connectionTargetNodeId = row.itemDetails?.connectionTarget || null;
          
          db.run("INSERT INTO items (id, node_id, title, connection_target_node_id) VALUES (?, ?, ?, ?)", 
            [itemId, id, itemTitle, connectionTargetNodeId]);

          (row.itemDetails?.conditions || []).forEach(condition => {
              db.run("INSERT INTO conditions (item_id, variable, operator, value) VALUES (?, ?, ?, ?)", 
                [itemId, condition.variable, condition.operator, condition.value]);
          });

          (row.itemDetails?.flags || []).forEach(flag => {
              db.run("INSERT INTO flags (item_id, flag_name, value) VALUES (?, ?, ?)", 
                [itemId, flag.flagName, flag.value ? 1 : 0]);
          });
      });
  });

  connections.forEach(({ from, to }) => {
      db.run("INSERT INTO connections (from_node_id, from_item_id, to_node_id) VALUES (?, ?, ?)", 
        [from.nodeId, from.itemId, to.nodeId]);
  });

  console.log("State saved to database with optimized schema.");
}

export function saveProjectToFile(db) {
  if (!db) return console.error("Database is not initialized yet.");
  
  if (window.electron && window.currentProjectPath) {
    try {
      const dbData = db.export();
      const uint8Array = new Uint8Array(dbData);
      window.electron.writeFile(window.currentProjectPath, uint8Array);
      
      const metaPath = window.currentProjectPath.replace('.db', '.json');
      const metadata = {
        lastModified: new Date().toISOString()
      };
      
      window.electron.updateProjectMetadata(metaPath, metadata);
      
      window.electron.updateProjectRegistry(window.currentProjectPath, metadata);
      
      console.log("Project saved to:", window.currentProjectPath);
      return true;
    } catch (error) {
      console.error("Error saving project:", error);
      return false;
    }
  } else {
    console.error("Cannot save project: No project path or not running in Electron");
    return false;
  }
}

export function downloadDatabase(db) {
  if (!db) return console.error("Database is not initialized yet.");
  const blob = new Blob([db.export()], {
      type: "application/octet-stream"
  });
  const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "nodeEditor.sqlite"
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  console.log("Database downloaded.");
}

export async function loadDatabaseFile(file, setDbCallback) {
  const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
  const reader = new FileReader();
  reader.onload = e => {
      const db = new SQL.Database(new Uint8Array(e.target.result));
      console.log("Database loaded from file with optimized schema (base64 for sprites and backgrounds).");
      typeof setDbCallback === "function" && setDbCallback(db);
  };
  reader.readAsArrayBuffer(file);
}

export async function loadProjectFromPath(filePath, setDbCallback) {
  if (!window.electron) {
    console.error("Cannot load project: Not running in Electron");
    return false;
  }
  
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    const fileData = await window.electron.readFile(filePath);
    const db = new SQL.Database(new Uint8Array(fileData));
    
    window.currentProjectPath = filePath;
    
    const metaPath = filePath.replace('.db', '.json');
    const metadata = {
      lastAccessed: new Date().toISOString()
    };
    
    try {
      window.electron.updateProjectMetadata(metaPath, metadata);
      
      window.electron.updateProjectRegistry(filePath, metadata);
    } catch (err) {
      console.warn("Could not update project metadata:", err);
    }
    
    console.log("Project loaded from:", filePath);
    typeof setDbCallback === "function" && setDbCallback(db);
    return true;
  } catch (error) {
    console.error("Error loading project:", error);
    return false;
  }
}

export async function loadStateFromDBToUI(dbInstance, editor, connections, spriteList) {
  if (!dbInstance) return console.error("Database instance is not initialized");

  window.globalVariables = await loadVariables(dbInstance);

  connections.length = 0;
  const connection = $('connections');
  while (connection.firstChild) {
    connection.removeChild(connection.lastChild);
  }
  window.nodes = [];
  editor.querySelectorAll(uiConfig.selectors.nodeElementSelector).forEach(n => n.remove());
  spriteList.innerHTML = '';

  const nodeRows = dbInstance.exec("SELECT id, trigger_id, x, y, title FROM nodes")[0]?.values || [];
  nodeRows.forEach(([id, trigger_id, x, y, title]) => {
      const nodeData = createNode(x, y, editor, makeDraggable, {
          id,
          title: title || uiConfig.defaultNodeTitle,
          trigger_id
      });

      const sceneData = dbInstance.exec(
        `SELECT background_file_id, dialogue, speaker, speaker_color 
         FROM scenes WHERE node_id = ?`, 
        [id]
      )[0]?.values?.[0];

      if (sceneData) {
          const [background_file_id, dialogue, speaker, speaker_color] = sceneData;
          let background_image = null;
          if (background_file_id) {
              const fileData = dbInstance.exec(
                `SELECT base64_data FROM files WHERE id = ?`, 
                [background_file_id]
              )[0]?.values?.[0]?.[0];
              background_image = fileData || null;
          }
          nodeData.scene.background = background_image;
          nodeData.dialogue = dialogue || "";
          nodeData.speaker = speaker || "";
          nodeData.speakerColor = speaker_color || "#ffffff";
      }

      const variableChanges = [];
      const changeRows = dbInstance.exec(
        `SELECT id, key, value, operator, type FROM changes WHERE id LIKE '${id}_change_%'`
      )[0]?.values || [];

      changeRows.forEach(([changeId, key, value, operator, type]) => {
        variableChanges.push({
          variable: key,
          value: value,
          operation: operator
        });
      });
      nodeData.variableChanges = variableChanges;

      const sounds = [];
      const soundRows = dbInstance.exec(
        `SELECT id, file_id, start_at, start_stop, coninuity_id, volume FROM sounds WHERE id LIKE '${id}_sound_%'`
      )[0]?.values || [];

      soundRows.forEach(([soundId, file_id, start_at, start_stop, continuity_id, volume]) => {
        let src = null;
        if (file_id) {
          const fileData = dbInstance.exec(
            `SELECT base64_data FROM files WHERE id = ?`, 
            [file_id]
          )[0]?.values?.[0]?.[0];
          src = fileData || null;
        }
        sounds.push({
          src,
          startAt: start_at,
          startStop: start_stop === 1,
          continuityId: continuity_id,
          volume: volume
        });
      });
      nodeData.sounds = sounds;

      const spriteRows = dbInstance.exec(
        `SELECT id, file_id, x, y, width, height, focus, animation_class, 
         continuity_id, flip, zIndex 
         FROM sprites WHERE scene_node_id = ?`, 
        [id]
      )[0]?.values || [];

      spriteRows.forEach(([spriteId, file_id, spriteX, spriteY, width, height, focus, animation_class, continuity_id, flip, zIndex]) => {
          let src = null;
          if (file_id) {
              const fileData = dbInstance.exec(
                `SELECT base64_data FROM files WHERE id = ?`, 
                [file_id]
              )[0]?.values?.[0]?.[0];
              src = fileData || null;
          }
          const spriteDataObject = {
              src,
              x: spriteX,
              y: spriteY,
              width,
              height,
              focus: focus === 1,
              animationClass: animation_class || '',
              continuityIdentifier: continuity_id || '',
              flip: flip === 1,
              zIndex: zIndex || 0
          };
          nodeData.scene.sprites.push(spriteDataObject);
      });
  });

  const itemRows = dbInstance.exec(
    "SELECT id, node_id, title, connection_target_node_id FROM items"
  )[0]?.values || [];

  itemRows.forEach(([itemId, nodeId, title, connection_target_node_id]) => {
      const nodeData = window.nodes.find(n => n.id === nodeId);
      if (nodeData) {
          const itemDetails = {
              title: title || `${uiConfig.text.defaultItemTitlePrefix}${itemId}`,
              connectionTarget: connection_target_node_id || null,
              conditions: [],
              flags: []
          };

          const conditionRows = dbInstance.exec(
            `SELECT variable, operator, value FROM conditions WHERE item_id = ?`, 
            [itemId]
          )[0]?.values || [];

          conditionRows.forEach(([variable, operator, value]) => {
              itemDetails.conditions.push({ variable, operator, value });
          });

          const flagRows = dbInstance.exec(
            `SELECT flag_name, value FROM flags WHERE item_id = ?`, 
            [itemId]
          )[0]?.values || [];

          flagRows.forEach(([flag_name, value]) => {
              itemDetails.flags.push({
                  flagName: flag_name,
                  value: value === 1
              });
          });

          createRow(nodeData, itemDetails, document.getElementById('connections'), connections, itemId);
          const lastRow = nodeData.rows[nodeData.rows.length - 1];
          lastRow.row.dataset.itemId = itemId;
      }
  });

  const connectionRows = dbInstance.exec(
    "SELECT from_node_id, from_item_id, to_node_id FROM connections"
  )[0]?.values || [];

  connectionRows.forEach(([from_node_id, from_item_id, to_node_id]) => {
    connections.push({
      from: {
        nodeId: from_node_id,
        itemId: from_item_id
      },
      to: {
        nodeId: to_node_id
      }
    });
  });

  updateConnections(connections);
  console.log("State loaded from database with optimized schema.");
}