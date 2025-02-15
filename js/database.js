export async function initDatabase() {
  const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      title TEXT
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
      speaker TEXT,
      FOREIGN KEY (node_id) REFERENCES nodes(id),
      FOREIGN KEY (background_file_id) REFERENCES files(id)
    );
    CREATE TABLE sprites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_node_id TEXT NOT NULL,
      file_id INTEGER NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      focus BOOLEAN NOT NULL,
      animation_class TEXT,
      continuity_id TEXT,
      FOREIGN KEY (scene_node_id) REFERENCES nodes(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
    );
    CREATE TABLE sprite_sfx (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sprite_id INTEGER NOT NULL,
      file_name TEXT,
      file_id INTEGER NOT NULL,
      loop BOOLEAN NOT NULL,
      auto BOOLEAN NOT NULL,
      volume REAL NOT NULL,
      FOREIGN KEY (sprite_id) REFERENCES sprites(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
    );
  `);
  console.log("SQLite database initialized with optimized schema (base64 for sprites and backgrounds).");
  return db;
}
export function saveStateToDB(db, nodes, connections) {
  if (!db) return console.error("Database is not initialized yet.");
  db.run("DELETE FROM sprite_sfx");
  db.run("DELETE FROM sprites");
  db.run("DELETE FROM scenes");
  db.run("DELETE FROM files"); 
  db.run("DELETE FROM connections");
  db.run("DELETE FROM flags");
  db.run("DELETE FROM conditions");
  db.run("DELETE FROM items");
  db.run("DELETE FROM nodes");

  const base64FileCache = new Map(); 

  nodes.forEach(({
      id,
      element,
      rows,
      scene,
      dialogue,
      speaker
  }) => {
      const x = parseInt(element.style.left) || 0;
      const y = parseInt(element.style.top) || 0;
      const title = element.querySelector("div.font-bold")?.textContent || "";
      db.run("INSERT INTO nodes VALUES (?, ?, ?, ?)", [id, x, y, title]);

      
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
      if (!!backgroundFileId) {
        db.run("INSERT INTO scenes (node_id, background_file_id, dialogue, speaker) VALUES (?, ?, ?, ?)", [id, backgroundFileId, dialogue, speaker]);
      } else {
        db.run("INSERT INTO scenes (node_id, dialogue, speaker) VALUES (?, ?, ?)", [id, dialogue, speaker]);
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

          if (!!spriteFileId) {
            db.run("INSERT INTO sprites (scene_node_id, file_id, x, y, width, height, focus, animation_class, continuity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [id, spriteFileId, spriteData.x, spriteData.y, spriteData.width, spriteData.height, spriteData.focus, spriteData.animationClass, spriteData.continuityIdentifier]
            );
          } else {
            db.run("INSERT INTO sprites (scene_node_id, x, y, width, height, focus, animation_class, continuity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [id, spriteData.x, spriteData.y, spriteData.width, spriteData.height, spriteData.focus, spriteData.animationClass, spriteData.continuityIdentifier]
            );
          }
          const spriteId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
          spriteData.sfx.forEach(sfxItem => {
              let sfxFileId;
              const base64Data = sfxItem.fileData;
              if (base64FileCache.has(base64Data)) {
                  sfxFileId = base64FileCache.get(base64Data);
              } else {
                  let existingFileIdResult = db.exec("SELECT id FROM files WHERE base64_data = ?", [base64Data]);
                  if (existingFileIdResult.length > 0) {
                      sfxFileId = existingFileIdResult[0].values[0][0];
                  } else {
                      db.run("INSERT INTO files (base64_data) VALUES (?)", [base64Data]);
                      sfxFileId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
                  }
                  base64FileCache.set(base64Data, sfxFileId);
              }
              if (!!sfxFileId) {
                db.run("INSERT INTO sprite_sfx (sprite_id, file_name, file_id, loop, auto, volume) VALUES (?, ?, ?, ?, ?, ?)",
                  [spriteId, sfxItem.fileName, sfxFileId, sfxItem.loop, sfxItem.auto, sfxItem.volume]
                );
              } else {
                db.run("INSERT INTO sprite_sfx (sprite_id, loop, auto, volume) VALUES (?, ?, ?, ?, ?, ?)",
                  [spriteId, sfxItem.loop, sfxItem.auto, sfxItem.volume]
                );
              }
          });
      });
      rows.forEach(({
          itemId,
          row
          }) => {
          const itemTitle = row.itemDetails?.title || `Choice ${itemId}`;
          const connectionTargetNodeId = row.itemDetails?.connectionTarget || null;
          db.run("INSERT INTO items (id, node_id, title, connection_target_node_id) VALUES (?, ?, ?, ?)", [itemId, id, itemTitle, connectionTargetNodeId]);
          (row.itemDetails?.conditions || []).forEach(condition => {
              db.run("INSERT INTO conditions (item_id, variable, operator, value) VALUES (?, ?, ?, ?)", [itemId, condition.variable, condition.operator, condition.value]);
          });
          (row.itemDetails?.flags || []).forEach(flag => {
              db.run("INSERT INTO flags (item_id, flag_name, value) VALUES (?, ?, ?)", [itemId, flag.flagName, flag.value]);
          });
      });
  });
  connections.forEach(({
      from,
      to
  }) => {
      db.run("INSERT INTO connections (from_node_id, from_item_id, to_node_id) VALUES (?, ?, ?)", [
          from.nodeId,
          from.itemId,
          to.nodeId
      ]);
  });
  console.log("State saved to database with optimized schema (base64 for sprites and backgrounds).");
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