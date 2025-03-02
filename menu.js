document.addEventListener('DOMContentLoaded', () => {
  const createProjectBtn = document.getElementById('createProjectBtn');
  const createProjectModal = document.getElementById('createProjectModal');
  const cancelCreateProject = document.getElementById('cancelCreateProject');
  const createProjectForm = document.getElementById('createProjectForm');
  const projectsList = document.getElementById('projectsList');
  const projectsTableBody = document.getElementById('projectsTableBody');
  const projectSearchInput = document.getElementById('projectSearchInput');
  const sortBySelect = document.getElementById('sortBySelect');
  const sortDirectionBtn = document.getElementById('sortDirectionBtn');

  let sortDirection = 'desc'; 
  let allProjects = [];

  initProjectsDirectory();

  loadProjects();

  createProjectBtn.addEventListener('click', () => {
    createProjectModal.classList.remove('hidden');
  });

  cancelCreateProject.addEventListener('click', () => {
    createProjectModal.classList.add('hidden');
    createProjectForm.reset();
  });

  createProjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createNewProject();
  });

  if (projectSearchInput) {
    projectSearchInput.addEventListener('input', filterAndSortProjects);
  }
  
  if (sortBySelect) {
    sortBySelect.addEventListener('change', filterAndSortProjects);
  }
  
  if (sortDirectionBtn) {
    sortDirectionBtn.addEventListener('click', () => {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      sortDirectionBtn.innerHTML = sortDirection === 'asc' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>';
      filterAndSortProjects();
    });
  }

  const headerContainer = document.querySelector('header .container');
  if (headerContainer) {
    const refreshButton = document.createElement('button');
    refreshButton.className = 'bg-gray-700 hover:bg-gray-600 transition border-gray-600 border text-white px-4 py-2 rounded text-sm flex items-center gap-2 mr-2';
    refreshButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    `;
    refreshButton.addEventListener('click', loadProjects);
    
    headerContainer.insertBefore(refreshButton, createProjectBtn.parentElement);
  }

  async function initProjectsDirectory() {
    try {
      const projectsDir = await window.electron.getProjectsDirectory();
      await window.electron.ensureDirectoryExists(projectsDir);
    } catch (error) {
      console.error('Error initializing projects directory:', error);
    }
  }

  async function loadProjects() {
    try {
      const projects = await window.electron.getProjects();
      
      allProjects = projects || [];
      
      if (projects && projects.length > 0) {
        projectsList.innerHTML = '';
        
        projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        const recentProjects = [...projects].slice(0, 6);
        recentProjects.forEach(project => {
          const projectCard = createProjectCard(project);
          projectsList.appendChild(projectCard);
        });
        
        filterAndSortProjects();
      } else {
        projectsList.innerHTML = `
          <div class="flex items-center justify-center p-8 border border-dashed border-gray-600 rounded-lg text-gray-400">
            <p>No recent projects found</p>
          </div>
        `;
        
        updateProjectsTable([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      projectsList.innerHTML = `
        <div class="flex items-center justify-center p-8 border border-dashed border-red-600 rounded-lg text-red-400">
          <p>Error loading projects: ${error.message}</p>
        </div>
      `;
      
      if (projectsTableBody) {
        projectsTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-4 text-center text-red-400">
              <p>Error loading projects: ${error.message}</p>
            </td>
          </tr>
        `;
      }
    }
  }

  function filterAndSortProjects() {
    if (!projectsTableBody) return;
    
    const searchTerm = projectSearchInput ? projectSearchInput.value.toLowerCase() : '';
    const sortBy = sortBySelect ? sortBySelect.value : 'lastModified';
    
    let filteredProjects = [...allProjects];
    if (searchTerm) {
      filteredProjects = filteredProjects.filter(project => 
        project.name.toLowerCase().includes(searchTerm) || 
        (project.description && project.description.toLowerCase().includes(searchTerm))
      );
    }
    
    filteredProjects.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          return sortDirection === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        
        case 'created':
          valueA = new Date(a.created || a.lastModified);
          valueB = new Date(b.created || b.lastModified);
          break;
          
        case 'lastModified':
        default:
          valueA = new Date(a.lastModified);
          valueB = new Date(b.lastModified);
          break;
      }
      
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    updateProjectsTable(filteredProjects);
  }
  
  function updateProjectsTable(projects) {
    if (!projectsTableBody) return;
    
    if (projects.length === 0) {
      projectsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-400">
            <p>No projects found</p>
          </td>
        </tr>
      `;
      return;
    }
    
    projectsTableBody.innerHTML = '';
    
    projects.forEach(project => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-800 transition-colors cursor-pointer';
      
      const created = project.created 
        ? new Date(project.created) 
        : new Date(project.lastModified);
      const lastModified = new Date(project.lastModified);
      
      const formattedCreated = created.toLocaleDateString() + ' ' + 
                              created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedLastModified = lastModified.toLocaleDateString() + ' ' + 
                                  lastModified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium">${project.name}</div>
        </td>
        <td class="px-6 py-4">
          <div class="text-sm text-gray-300">${project.description || 'No description'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-300">${formattedCreated}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-300">${formattedLastModified}</div>
        </td>
      `;
      
      row.addEventListener('click', () => {
        openProject(project.path);
      });
      
      projectsTableBody.appendChild(row);
    });
  }

  function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card rounded-lg p-4 flex flex-col';
    
    const lastModified = new Date(project.lastModified);
    const formattedDate = lastModified.toLocaleDateString() + ' ' + 
                          lastModified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    card.innerHTML = `
      <h3 class="text-lg font-medium mb-2">${project.name}</h3>
      <p class="text-gray-400 text-sm mb-2 flex-grow">${project.description || 'No description'}</p>
      <div class="flex justify-between items-center text-xs text-gray-500">
        <span>Last modified: ${formattedDate}</span>
        <span>${project.path.split('/').pop()}</span>
      </div>
    `;
    
    card.addEventListener('click', () => {
      openProject(project.path);
    });
    
    return card;
  }

  async function createNewProject() {
    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    
    if (!projectName) return;
    
    try {
      const projectPath = await window.electron.createProject(projectName, projectDescription);
      
      createProjectModal.classList.add('hidden');
      createProjectForm.reset();
      
      loadProjects();
      
      openProject(projectPath);
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error.message}`);
    }
  }

  function openProject(projectPath) {
    window.electron.openProject(projectPath);
  }
}); 