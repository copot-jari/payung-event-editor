const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'electron', {
    openProject: (callback) => {
      if (typeof callback === 'string') {
        ipcRenderer.send('open-project-path', callback);
      } else {
        ipcRenderer.on('open-project', (event, filePath) => callback(filePath));
      }
    },
    saveProject: (callback) => {
      ipcRenderer.on('save-project', () => callback());
    },
    showSaveDialog: () => {
      ipcRenderer.send('show-save-dialog');
    },
    onSaveDialogSelection: (callback) => {
      ipcRenderer.on('save-dialog-selection', (event, filePath) => callback(filePath));
    },
    readFile: async (filePath) => {
      return ipcRenderer.invoke('read-file', filePath);
    },
    writeFile: async (filePath, data) => {
      return ipcRenderer.invoke('write-file', filePath, data);
    },
    getProjectsDirectory: () => {
      return ipcRenderer.invoke('get-projects-directory');
    },
    ensureDirectoryExists: (dirPath) => {
      return ipcRenderer.invoke('ensure-directory-exists', dirPath);
    },
    getProjects: () => {
      return ipcRenderer.invoke('get-projects');
    },
    createProject: (name, description) => {
      return ipcRenderer.invoke('create-project', name, description);
    },
    updateProjectMetadata: async (metaPath, metadata) => {
      try {
        const existingData = Buffer.from(await ipcRenderer.invoke('read-file', metaPath));
        console.log(metaPath)
        const stringData = existingData.toString();
        console.log(stringData)
        const existingMetadata = JSON.parse(stringData);
        
        const updatedMetadata = { ...existingMetadata, ...metadata };
        
        return ipcRenderer.invoke('write-file', metaPath, JSON.stringify(updatedMetadata, null, 2));
      } catch (error) {
        console.error('Error updating project metadata:', error);
        return false;
      }
    },
    updateProjectRegistry: async (projectPath, metadata) => {
      try {
        return ipcRenderer.invoke('update-project-registry', projectPath, metadata);
      } catch (error) {
        console.error('Error updating project registry:', error);
        return false;
      }
    },
    returnToMenu: () => {
      ipcRenderer.send('return-to-menu');
    }
  }
); 