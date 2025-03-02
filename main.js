const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const expressApp = express();
const http = require('http');

const server = http.createServer(expressApp);
const port = 5489;

let mainWindow;

expressApp.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});


expressApp.use(express.static(path.join(__dirname, "/")));

server.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false 
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('about')) {
      return {action: "allow"};
    }
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://localhost:${port}/menu.html`);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  const template = [
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click() {
            dialog.showMessageBox({
              title: 'About Event Editor',
              message: 'Please submit bug at the repository i will try my best to fix it.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('show-save-dialog', (event) => {
  dialog.showSaveDialog({
    title: 'Save Project',
    defaultPath: path.join(app.getPath('documents'), 'project.json'),
    filters: [
      { name: 'Project Files', extensions: ['json'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      event.reply('save-dialog-selection', result.filePath);
    }
  }).catch(err => {
    console.error(err);
  });
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, data);
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('update-project-registry', async (event, projectPath, metadata) => {
  try {
    const registryPath = path.join(app.getPath('userData'), 'project_registry.json');
    let projectRegistry = [];
    
    if (fs.existsSync(registryPath)) {
      try {
        projectRegistry = JSON.parse(await fs.promises.readFile(registryPath, 'utf8'));
      } catch (err) {
        console.error('Error reading project registry:', err);
      }
    }
    
    const projectIndex = projectRegistry.findIndex(p => p.path === projectPath);
    
    if (projectIndex !== -1) {
      projectRegistry[projectIndex] = {
        ...projectRegistry[projectIndex],
        ...metadata,
        lastModified: new Date().toISOString()
      };
    } else {
      projectRegistry.push({
        name: metadata.name || path.basename(projectPath, path.extname(projectPath)),
        description: metadata.description || '',
        path: projectPath,
        lastModified: new Date().toISOString()
      });
    }
    
    await fs.promises.writeFile(registryPath, JSON.stringify(projectRegistry, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error updating project registry:', error);
    throw error;
  }
});

ipcMain.handle('get-projects-directory', async () => {
  return path.join(app.getPath('userData'), 'projects');
});

ipcMain.handle('ensure-directory-exists', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
});

ipcMain.handle('get-projects', async () => {
  try {
    const projectsDir = path.join(app.getPath('userData'), 'projects');
    
    if (!fs.existsSync(projectsDir)) {
      await fs.promises.mkdir(projectsDir, { recursive: true });
      return [];
    }
    
    const registryPath = path.join(app.getPath('userData'), 'project_registry.json');
    
    let projectRegistry = [];
    if (fs.existsSync(registryPath)) {
      try {
        projectRegistry = JSON.parse(await fs.promises.readFile(registryPath, 'utf8'));
      } catch (err) {
        console.error('Error reading project registry:', err);
      }
    }
    
    const validProjects = [];
    for (const project of projectRegistry) {
      if (fs.existsSync(project.path)) {
        const metaPath = project.path.replace('.db', '.json');
        if (fs.existsSync(metaPath)) {
          try {
            const metaData = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
            project.name = metaData.name || project.name;
            project.description = metaData.description || project.description;
            project.lastModified = metaData.lastModified || project.lastModified;
            project.created = metaData.created || project.lastModified;
          } catch (err) {
            console.error('Error reading project metadata:', err);
          }
        }
        validProjects.push(project);
      }
    }
    
    const files = await fs.promises.readdir(projectsDir);
    
    for (const file of files.filter(file => file.endsWith('.db'))) {
      const filePath = path.join(projectsDir, file);
      
      if (validProjects.some(p => p.path === filePath)) {
        continue;
      }
      
      const stats = await fs.promises.stat(filePath);
      
      let name = file.replace('.db', '');
      let description = '';
      let created = stats.birthtime || stats.mtime;
      
      const metaPath = filePath.replace('.db', '.json');
      if (fs.existsSync(metaPath)) {
        try {
          const metaData = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
          name = metaData.name || name;
          description = metaData.description || '';
          created = metaData.created || created;
        } catch (err) {
          console.error('Error reading project metadata:', err);
        }
      }
      
      validProjects.push({
        name,
        description,
        path: filePath,
        created: created instanceof Date ? created.toISOString() : created,
        lastModified: stats.mtime instanceof Date ? stats.mtime.toISOString() : stats.mtime
      });
    }
    
    await fs.promises.writeFile(registryPath, JSON.stringify(validProjects, null, 2));
    
    return validProjects;
  } catch (error) {
    console.error('Error getting projects:', error);
    throw error;
  }
});

ipcMain.handle('create-project', async (event, name, description) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select or Create a Project Folder'
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      throw new Error('No folder selected');
    }
    
    const projectDir = result.filePaths[0];
    
    const safeFileName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const dbPath = path.join(projectDir, `${safeFileName}.db`);
    const metaPath = path.join(projectDir, `${safeFileName}.json`);
    
    if (fs.existsSync(dbPath)) {
      throw new Error('A project with this name already exists in the selected folder');
    }
    
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);
    
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        
        db.run(`
          CREATE TABLE entities (
            id TEXT PRIMARY KEY,
            title TEXT,
            thumbnail TEXT
          );
        `);
        
        db.run(`
          CREATE TABLE variables (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            default_value TEXT
          );
        `);
        
        db.run(`
          CREATE TABLE files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            base64_data TEXT UNIQUE
          );
        `);
        
        db.run(`
          CREATE TABLE nodes (
            id TEXT PRIMARY KEY,
            trigger_id TEXT,
            x INTEGER NOT NULL,
            y INTEGER NOT NULL,
            title TEXT,
            FOREIGN KEY (trigger_id) REFERENCES entities(id)
          );
        `);
        
        db.run(`
          CREATE TABLE sounds (
            id TEXT PRIMARY KEY,
            file_id TEXT,
            start_at TEXT,
            start_stop BOOLEAN,
            coninuity_id TEXT,
            volume INTEGER,
            FOREIGN KEY (file_id) REFERENCES files(id)
          );
        `);
        
        db.run(`
          CREATE TABLE changes (
            id TEXT PRIMARY KEY,
            key TEXT,
            value TEXT,
            operator TEXT,
            type TEXT
          );
        `);
        
        db.run(`
          CREATE TABLE items (
            id TEXT PRIMARY KEY,
            node_id TEXT NOT NULL,
            title TEXT,
            connection_target_node_id TEXT,
            FOREIGN KEY (node_id) REFERENCES nodes(id),
            FOREIGN KEY (connection_target_node_id) REFERENCES nodes(id)
          );
        `);
        
        db.run(`
          CREATE TABLE scenes (
            node_id TEXT PRIMARY KEY,
            background_file_id INTEGER,
            dialogue TEXT,
            speaker_color TEXT,
            speaker TEXT,
            FOREIGN KEY (node_id) REFERENCES nodes(id),
            FOREIGN KEY (background_file_id) REFERENCES files(id)
          );
        `);
        
        db.run(`
          CREATE TABLE conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT NOT NULL,
            variable TEXT NOT NULL,
            operator TEXT NOT NULL,
            value TEXT NOT NULL,
            FOREIGN KEY (item_id) REFERENCES items(id)
          );
        `);
        
        db.run(`
          CREATE TABLE flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT NOT NULL,
            flag_name TEXT NOT NULL,
            value BOOLEAN NOT NULL,
            FOREIGN KEY (item_id) REFERENCES items(id)
          );
        `);
        
        db.run(`
          CREATE TABLE connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_node_id TEXT NOT NULL,
            from_item_id TEXT NOT NULL,
            to_node_id TEXT NOT NULL,
            FOREIGN KEY (from_node_id) REFERENCES nodes(id),
            FOREIGN KEY (from_item_id) REFERENCES items(id),
            FOREIGN KEY (to_node_id) REFERENCES nodes(id)
          );
        `);
        
        db.run(`
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
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const metadata = {
      name,
      description,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      projectDir: projectDir
    };
    
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));
    
    const registryPath = path.join(app.getPath('userData'), 'project_registry.json');
    let projectRegistry = [];
    
    if (fs.existsSync(registryPath)) {
      try {
        projectRegistry = JSON.parse(await fs.promises.readFile(registryPath, 'utf8'));
      } catch (err) {
        console.error('Error reading project registry:', err);
      }
    }
    
    projectRegistry.push({
      name,
      description,
      path: dbPath,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });
    
    await fs.promises.writeFile(registryPath, JSON.stringify(projectRegistry, null, 2));
    
    return dbPath;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
});

ipcMain.on('open-project-path', (event, projectPath) => {
  mainWindow.loadURL(`http://localhost:${port}/editor.html?project=${encodeURIComponent(projectPath)}`);
});

ipcMain.on('return-to-menu', () => {
  mainWindow.loadURL(`http://localhost:${port}/menu.html`);
}); 

