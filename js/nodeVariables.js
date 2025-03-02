import { $ } from './ui.js';
import { getVariableType, convertToType } from './variables.js';

const VARIABLE_OPERATIONS = {
    string: ['set', 'append', 'prepend'],
    number: ['set', 'add', 'subtract', 'multiply', 'divide'],
    boolean: ['set', 'toggle'],
    array: ['set', 'push', 'pop', 'remove', 'clear']
};

export function buildVariableChangeRow(variableChange = { variable: '', operation: 'set', value: '' }, index) {
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2 p-2 bg-gray-800 rounded flex-wrap';
    row.dataset.index = index;

    const selectsContainer = document.createElement('div');
    selectsContainer.className = 'flex items-center space-x-2 w-full mb-2';

    const variableSelect = document.createElement('select');
    variableSelect.className = 'flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600';
    variableSelect.placeholder = 'Select Variable';
    
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select Variable';
    if (variableChange.variable === '') {
        emptyOption.selected = true;
    }
    variableSelect.appendChild(emptyOption);
    
    if (window.globalVariables) {
        if (window.globalVariables instanceof Map) {
            window.globalVariables.forEach((variable, key) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                option.dataset.type = variable.type;
                if (key === variableChange.variable) {
                    option.selected = true;
                }
                variableSelect.appendChild(option);
            });
        }
    }

    const operationSelect = document.createElement('select');
    operationSelect.className = 'w-1/3 bg-gray-700 text-white p-2 rounded border border-gray-600';
    
    function updateOperations(type) {
        operationSelect.innerHTML = '';
        if (type && VARIABLE_OPERATIONS[type]) {
            VARIABLE_OPERATIONS[type].forEach(op => {
                const option = document.createElement('option');
                option.value = op;
                option.textContent = op;
                if (op === variableChange.operation) {
                    option.selected = true;
                }
                operationSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = 'set';
            option.textContent = 'set';
            option.selected = true;
            operationSelect.appendChild(option);
        }
    }
    
    const selectedType = variableChange.variable ? 
        getVariableType(variableChange.variable) : 
        (variableSelect.selectedOptions[0]?.dataset.type || 'string');
    
    updateOperations(selectedType);
    
    selectsContainer.appendChild(variableSelect);
    selectsContainer.appendChild(operationSelect);
    
    const valueContainer = document.createElement('div');
    valueContainer.className = 'flex items-center space-x-2 w-full';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600';
    valueInput.placeholder = 'Value';
    valueInput.value = variableChange.value !== undefined ? variableChange.value : '';
    
    variableSelect.addEventListener('change', () => {
        const selectedOption = variableSelect.selectedOptions[0];
        const type = selectedOption?.dataset.type || 'string';
        updateOperations(type);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-red-500 hover:text-red-400 flex-shrink-0';
    deleteBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    `;
    deleteBtn.addEventListener('click', () => {
        row.remove();
        if (window.selectedNodeData) {
            const index = parseInt(row.dataset.index);
            if (!isNaN(index) && index >= 0 && index < window.selectedNodeData.variableChanges.length) {
                window.selectedNodeData.variableChanges.splice(index, 1);
            }
        }
    });

    valueContainer.appendChild(valueInput);
    valueContainer.appendChild(deleteBtn);
    
    row.appendChild(selectsContainer);
    row.appendChild(valueContainer);

    return { row, variableSelect, operationSelect, valueInput };
}

export function initNodeVariableChanges() {
    const addVariableChangeBtn = $('addVariableChange');
    const nodeVariableChangesContainer = $('nodeVariableChanges');
    
    if (!addVariableChangeBtn || !nodeVariableChangesContainer) return;
    
    addVariableChangeBtn.addEventListener('click', () => {
        if (!window.selectedNodeData) return;
        
        if (!window.selectedNodeData.variableChanges) {
            window.selectedNodeData.variableChanges = [];
        }
        
        const newVariableChange = { variable: '', operation: 'set', value: '' };
        window.selectedNodeData.variableChanges.push(newVariableChange);
        
        const index = window.selectedNodeData.variableChanges.length - 1;
        const { row, variableSelect, operationSelect, valueInput } = buildVariableChangeRow(newVariableChange, index);
        
        variableSelect.addEventListener('change', () => {
            window.selectedNodeData.variableChanges[index].variable = variableSelect.value;
        });
        
        operationSelect.addEventListener('change', () => {
            window.selectedNodeData.variableChanges[index].operation = operationSelect.value;
        });
        
        valueInput.addEventListener('input', () => {
            window.selectedNodeData.variableChanges[index].value = valueInput.value;
        });
        
        nodeVariableChangesContainer.appendChild(row);
    });
}

export function populateNodeVariableChanges() {
    const nodeVariableChangesContainer = $('nodeVariableChanges');
    if (!nodeVariableChangesContainer || !window.selectedNodeData) return;
    
    nodeVariableChangesContainer.innerHTML = '';
    
    if (!window.selectedNodeData.variableChanges) {
        window.selectedNodeData.variableChanges = [];
    }
    
    if (Array.isArray(window.selectedNodeData.variableChanges)) {
        window.selectedNodeData.variableChanges.forEach((variableChange, index) => {
            const { row, variableSelect, operationSelect, valueInput } = buildVariableChangeRow(variableChange, index);
            
            variableSelect.addEventListener('change', () => {
                window.selectedNodeData.variableChanges[index].variable = variableSelect.value;
            });
            
            operationSelect.addEventListener('change', () => {
                window.selectedNodeData.variableChanges[index].operation = operationSelect.value;
            });
            
            valueInput.addEventListener('input', () => {
                window.selectedNodeData.variableChanges[index].value = valueInput.value;
            });
            
            nodeVariableChangesContainer.appendChild(row);
        });
    }
}

export function applyNodeVariableChanges(nodeData) {
    if (!nodeData || !nodeData.variableChanges || !Array.isArray(nodeData.variableChanges)) return;
    
    nodeData.variableChanges.forEach(change => {
        if (!change.variable) return;
        
        const variableType = getVariableType(change.variable);
        if (!variableType) return;
        
        const currentValue = window.globalVariables.get(change.variable)?.defaultValue;
        let newValue;
        
        switch (variableType) {
            case 'string':
                switch (change.operation) {
                    case 'set':
                        newValue = String(change.value);
                        break;
                    case 'append':
                        newValue = currentValue + String(change.value);
                        break;
                    case 'prepend':
                        newValue = String(change.value) + currentValue;
                        break;
                    default:
                        newValue = currentValue;
                }
                break;
                
            case 'number':
                const numValue = parseFloat(change.value);
                const currentNum = parseFloat(currentValue);
                
                if (isNaN(numValue) && change.operation !== 'set') return;
                
                switch (change.operation) {
                    case 'set':
                        newValue = isNaN(numValue) ? 0 : numValue;
                        break;
                    case 'add':
                        newValue = currentNum + numValue;
                        break;
                    case 'subtract':
                        newValue = currentNum - numValue;
                        break;
                    case 'multiply':
                        newValue = currentNum * numValue;
                        break;
                    case 'divide':
                        if (numValue === 0) return; 
                        newValue = currentNum / numValue;
                        break;
                    default:
                        newValue = currentNum;
                }
                break;
                
            case 'boolean':
                switch (change.operation) {
                    case 'set':
                        newValue = change.value === 'true';
                        break;
                    case 'toggle':
                        newValue = !currentValue;
                        break;
                    default:
                        newValue = currentValue;
                }
                break;
                
            case 'array':
                let array = Array.isArray(currentValue) ? [...currentValue] : [];
                
                switch (change.operation) {
                    case 'set':
                        newValue = change.value.split(',').map(item => item.trim());
                        break;
                    case 'push':
                        array.push(change.value);
                        newValue = array;
                        break;
                    case 'pop':
                        array.pop();
                        newValue = array;
                        break;
                    case 'remove':
                        newValue = array.filter(item => item !== change.value);
                        break;
                    case 'clear':
                        newValue = [];
                        break;
                    default:
                        newValue = array;
                }
                break;
                
            default:
                newValue = currentValue;
        }
        
        const variable = window.globalVariables.get(change.variable);
        if (variable) {
            variable.defaultValue = newValue;
            window.globalVariables.set(change.variable, variable);
        }
    });
} 