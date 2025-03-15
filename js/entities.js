import { $ } from './ui.js';

let currentEditingEntityId = null;

export function initEntityEditor() {
    const entitySelect = $('entitySelect');
    const addEntityBtn = $('addEntityBtn');
    const entityModal = $('entityModal');
    const closeEntityEditor = $('closeEntityEditor');
    const saveEntityBtn = $('saveEntity');
    const uploadThumbnailBtn = $('uploadEntityThumbnail');
    const thumbnailInput = $('entityThumbnail');
    const thumbnailPreview = $('entityThumbnailPreview');

    addEntityBtn.addEventListener('click', () => {
        currentEditingEntityId = null;
        $('entityTitleInput').value = '';
        thumbnailPreview.src = '';
        thumbnailPreview.classList.add('hidden');
        entityModal.classList.remove('hidden');
    });

    closeEntityEditor.addEventListener('click', () => {
        entityModal.classList.add('hidden');
    });

    uploadThumbnailBtn.addEventListener('click', () => {
        thumbnailInput.click();
    });

    thumbnailInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                thumbnailPreview.src = e.target.result;
                thumbnailPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    saveEntityBtn.addEventListener('click', async () => {
        const title = $('entityTitleInput').value.trim();
        if (!title) {
            alert('Please enter a title for the entity');
            return;
        }

        const thumbnail = thumbnailPreview.classList.contains('hidden') ? null : thumbnailPreview.src;
        const id = currentEditingEntityId || crypto.randomUUID();

        try {
            await saveEntity(id, title, thumbnail);
            await loadEntities();
            entityModal.classList.add('hidden');
        } catch (error) {
            console.error('Error saving entity:', error);
            alert('Failed to save entity');
        }
    });

    entitySelect.addEventListener('change', (e) => {
        if (window.selectedNodeData) {
            window.selectedNodeData.trigger_id = e.target.value;
        }
    });
}

export async function loadEntities() {
    const entitySelect = $('entitySelect');
    const entities = window.dbInstance.exec('SELECT id, title FROM entities');
    
    while (entitySelect.options.length > 1) {
        entitySelect.remove(1);
    }

    if (entities.length > 0 && entities[0].values) {
        entities[0].values.forEach(([id, title]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = title;
            entitySelect.appendChild(option);
        });
    }
}

export async function saveEntity(id, title, thumbnail) {
    const stmt = window.dbInstance.prepare(`
        INSERT OR REPLACE INTO entities (id, title, thumbnail)
        VALUES (?, ?, ?)
    `);
    stmt.run([id, title, thumbnail]);
    stmt.free();
}

export function setSelectedNodeEntity(nodeData) {
    const entitySelect = $('entitySelect');
    if (nodeData && nodeData.trigger_id) {
        entitySelect.value = nodeData.trigger_id;
    } else {
        entitySelect.value = '';
    }
} 