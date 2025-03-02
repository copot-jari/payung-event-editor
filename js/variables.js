import { $ } from './ui.js';

const VARIABLE_TYPES = ['string', 'number', 'boolean', 'array'];

let globalVariables = new Map();

function buildVariableRow(variable = { key: '', type: 'string', defaultValue: '' }) {
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2 p-2 bg-gray-800 rounded';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600';
    nameInput.placeholder = 'Variable Name';
    nameInput.value = variable.key;

    const typeSelect = document.createElement('select');
    typeSelect.className = 'bg-gray-700 text-white p-2 rounded border border-gray-600';
    VARIABLE_TYPES.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (type === variable.type) {
            option.selected = true;
        }
        typeSelect.appendChild(option);
    });

    const defaultValueContainer = document.createElement('div');
    defaultValueContainer.className = 'flex-1';
    
    function createDefaultValueInput(type, currentValue) {
        let input;
        
        if (type === 'boolean') {
            input = document.createElement('select');
            ['true', 'false'].forEach(val => {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = val;
                if (val === currentValue) option.selected = true;
                input.appendChild(option);
            });
        } else if (type === 'array') {
            input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Comma-separated values';
            input.value = Array.isArray(currentValue) ? currentValue.join(',') : currentValue;
        } else {
            input = document.createElement('input');
            input.type = type === 'number' ? 'number' : 'text';
            input.value = currentValue;
        }
        
        input.className = 'w-full bg-gray-700 text-white p-2 rounded border border-gray-600';
        input.placeholder = `Default ${type} value`;
        return input;
    }

    let defaultValueInput = createDefaultValueInput(variable.type, variable.defaultValue);
    defaultValueContainer.appendChild(defaultValueInput);

    typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        const oldInput = defaultValueContainer.firstChild;
        const newInput = createDefaultValueInput(newType, '');
        defaultValueContainer.replaceChild(newInput, oldInput);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-red-500 hover:text-red-400';
    deleteBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    `;
    deleteBtn.addEventListener('click', () => row.remove());

    row.appendChild(nameInput);
    row.appendChild(typeSelect);
    row.appendChild(defaultValueContainer);
    row.appendChild(deleteBtn);

    return row;
}

function generateId() {
    return 'var_' + Math.random().toString(36).substr(2, 9);
}

export async function loadVariables(dbInstance) {
    if (!dbInstance) return new Map();
    
    try {
        const result = dbInstance.exec("SELECT id, key, type, default_value FROM variables");
        const variableRows = result[0]?.values || [];

        globalVariables.clear();
        variableRows.forEach(([id, key, type, defaultValue]) => {
            globalVariables.set(key, {
                id,
                type,
                defaultValue: defaultValue ? JSON.parse(defaultValue) : null
            });
        });

        return globalVariables;
    } catch (error) {
        console.error('Error loading variables:', error);
        return new Map();
    }
}

export async function saveVariables(dbInstance) {
    if (!dbInstance) return;

    const variablesList = $('variablesList');
    const rows = variablesList.children;
    const variables = new Map();

    Array.from(rows).forEach(row => {
        const nameInput = row.querySelector('input');
        const typeSelect = row.querySelector('select');
        const defaultValueInput = row.querySelector('div.flex-1').firstChild;
        const key = nameInput.value.trim();
        
        if (key) {
            const type = typeSelect.value;
            let defaultValue = defaultValueInput.value;

            if (type === 'number') {
                defaultValue = defaultValue ? Number(defaultValue) : 0;
            } else if (type === 'boolean') {
                defaultValue = defaultValue === 'true';
            } else if (type === 'array') {
                defaultValue = defaultValue ? defaultValue.split(',').map(v => v.trim()) : [];
            }

            const existingVar = globalVariables.get(key);
            variables.set(key, {
                id: existingVar?.id || generateId(),
                type,
                defaultValue
            });
        }
    });

    dbInstance.run('BEGIN TRANSACTION');

    try {
        dbInstance.run('DELETE FROM variables');

        variables.forEach((value, key) => {
            const stmt = dbInstance.prepare(
                'INSERT INTO variables (id, key, type, default_value) VALUES (?, ?, ?, ?)'
            );
            stmt.run([value.id, key, value.type, JSON.stringify(value.defaultValue)]);
            stmt.free();
        });

        dbInstance.run('COMMIT');
        globalVariables = variables;
    } catch (error) {
        dbInstance.run('ROLLBACK');
        console.error('Error saving variables:', error);
        throw error;
    }
}

export function initVariableEditor() {
    const modal = $('variableEditorModal');
    const closeBtn = $('closeVariableEditor');
    const addBtn = $('addVariable');
    const saveBtn = $('saveVariables');
    const variablesList = $('variablesList');

    addBtn.addEventListener('click', () => {
        const row = buildVariableRow();
        variablesList.appendChild(row);
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    saveBtn.addEventListener('click', async () => {
        try {
            await saveVariables(window.db);
            modal.classList.add('hidden');
            window.globalVariables = await loadVariables(window.db);
            alert('Variables saved successfully!');
        } catch (error) {
            console.error('Failed to save variables:', error);
            alert('Failed to save variables. Please try again.');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

export function populateVariableEditor() {
    const variablesList = $('variablesList');
    variablesList.innerHTML = '';

    globalVariables.forEach((value, key) => {
        const row = buildVariableRow({ key, type: value.type, defaultValue: value.defaultValue });
        variablesList.appendChild(row);
    });
}

export function getVariableType(key) {
    return globalVariables.get(key)?.type;
}

export function validateVariableValue(key, value) {
    const type = getVariableType(key);
    if (!type) return false;

    switch (type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return !isNaN(Number(value));
        case 'boolean':
            return typeof value === 'boolean' || value === 'true' || value === 'false';
        case 'array':
            return Array.isArray(value);
        default:
            return false;
    }
}

export function convertToType(value, type) {
    switch (type) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'boolean':
            return value === 'true' || value === true;
        case 'array':
            return Array.isArray(value) ? value : [value];
        default:
            return value;
    }
} 