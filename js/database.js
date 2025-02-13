export async function initDatabase() {
  const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
  const db = new SQL.Database();
  db.run(`
  CREATE TABLE nodes (id TEXT PRIMARY KEY, x INTEGER, y INTEGER, title TEXT);
  CREATE TABLE items (id TEXT PRIMARY KEY, nodeId TEXT, name TEXT, details TEXT, FOREIGN KEY(nodeId) REFERENCES nodes(id));
  CREATE TABLE connections (id INTEGER PRIMARY KEY AUTOINCREMENT, fromNodeId TEXT, fromItemId TEXT, toNodeId TEXT);
`);
  console.log("SQLite database initialized.");
  return db;
}
export function saveStateToDB(db, nodes, connections) {
  if (!db) return console.error("Database is not initialized yet.");
  db.run("DELETE FROM nodes; DELETE FROM items; DELETE FROM connections;");
  nodes.forEach(({
      id,
      element,
      rows
  }) => {
      const x = parseInt(element.style.left) || 0;
      const y = parseInt(element.style.top) || 0;
      const title = element.querySelector("div.font-bold")?.textContent || "";
      db.run("INSERT INTO nodes VALUES (?, ?, ?, ?)", [id, x, y, title]);
      rows.forEach(({
          itemId,
          row
      }) => {
          const name = row.textContent;
          const details = JSON.stringify(row.itemDetails || {});
          db.run("INSERT INTO items VALUES (?, ?, ?, ?)", [itemId, id, name, details]);
      });
  });
  connections.forEach(({
      from,
      to
  }) => {
      db.run("INSERT INTO connections (fromNodeId, fromItemId, toNodeId) VALUES (?, ?, ?)", [
          from.nodeId,
          from.itemId,
          to.nodeId
      ]);
  });
  console.log("State saved to database.");
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
      console.log("Database loaded from file.");
      typeof setDbCallback === "function" && setDbCallback(db);
  };
  reader.readAsArrayBuffer(file);
}