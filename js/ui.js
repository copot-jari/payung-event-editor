import { uiConfig } from './config.js';
import { getVariableType, validateVariableValue, convertToType } from './variables.js';

export const $ = id => document.getElementById(id);

export const buildConditionRow = (cond = {}) => {
    const row = document.createElement("div");
    row.className = uiConfig.classes.conditionFlagRow;

    const inputsWrapper = document.createElement("div");
    inputsWrapper.className = "flex-1 flex space-x-2";

    const variableSelect = document.createElement("select");
    variableSelect.className = uiConfig.classes.inputField + " flex-1";
    variableSelect.title = "Select the variable to check";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Select Variable";
    variableSelect.appendChild(emptyOption);

    window.globalVariables?.forEach((value, key) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;
        option.dataset.type = value.type; 
        if (key === cond.variable) {
            option.selected = true;
        }
        variableSelect.appendChild(option);
    });

    const operator = document.createElement("select");
    operator.className = uiConfig.classes.inputField;
    operator.title = "Select the comparison operator";
    uiConfig.text.operatorOptions.forEach(op => {
        const option = document.createElement("option");
        option.value = op;
        option.textContent = op;
        if (op === cond.operator) option.selected = true;
        operator.appendChild(option);
    });

    const createValueInput = (type, currentValue) => {
        let valueInput;
        
        switch (type) {
            case 'boolean':
                valueInput = document.createElement('select');
                valueInput.className = uiConfig.classes.inputField + " flex-1";
                valueInput.title = "Select the boolean value";
                
                ['true', 'false'].forEach(val => {
                    const option = document.createElement('option');
                    option.value = val;
                    option.textContent = val;
                    if (val === String(currentValue)) option.selected = true;
                    valueInput.appendChild(option);
                });
                break;
                
            case 'number':
                valueInput = document.createElement('input');
                valueInput.type = 'number';
                valueInput.className = uiConfig.classes.inputField + " flex-1";
                valueInput.placeholder = "Number value";
                valueInput.title = "Enter a number value";
                valueInput.value = currentValue !== undefined ? currentValue : '';
                break;
                
            case 'array':
                valueInput = document.createElement('input');
                valueInput.type = 'text';
                valueInput.className = uiConfig.classes.inputField + " flex-1";
                valueInput.placeholder = "Array item";
                valueInput.title = "Enter an array item to check for";
                valueInput.value = currentValue !== undefined ? currentValue : '';
                break;
                
            default: 
                valueInput = document.createElement('input');
                valueInput.type = 'text';
                valueInput.className = uiConfig.classes.inputField + " flex-1";
                valueInput.placeholder = uiConfig.text.valuePlaceholder;
                valueInput.title = "Enter the value to compare against";
                valueInput.value = currentValue !== undefined ? currentValue : '';
        }
        
        return valueInput;
    };

    const initialType = cond.variable ? getVariableType(cond.variable) : 'string';
    
    let valueInput = createValueInput(initialType, cond.value);

    variableSelect.addEventListener('change', () => {
        const selectedVar = variableSelect.value;
        const selectedOption = variableSelect.selectedOptions[0];
        const type = selectedOption ? selectedOption.dataset.type : 'string';
        
        const currentValue = valueInput.value;
        
        const newValueInput = createValueInput(type, currentValue);
        
        valueInput.replaceWith(newValueInput);
        valueInput = newValueInput;
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "text-red-500 hover:text-red-400 ml-2";
    deleteBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    `;
    deleteBtn.addEventListener("click", () => row.remove());

    inputsWrapper.appendChild(variableSelect);
    inputsWrapper.appendChild(operator);
    inputsWrapper.appendChild(valueInput);
    row.appendChild(inputsWrapper);
    row.appendChild(deleteBtn);

    return row;
};

export const buildFlagRow = (flag = {}) => {
    const row = document.createElement("div");
    row.className = uiConfig.classes.conditionFlagRow;

    const inputsWrapper = document.createElement("div");
    inputsWrapper.className = "flex-1 flex space-x-2";

    const flagName = Object.assign(document.createElement("input"), {
        type: "text",
        placeholder: uiConfig.text.flagNamePlaceholder,
        className: uiConfig.classes.inputField + " flex-1",
        value: flag.flagName || "",
        title: "Enter the flag name to set"
    });

    flagName.addEventListener('input', () => {
        flagName.classList.toggle('border-red-500', !flagName.value.trim());
    });

    const flagValue = document.createElement("select");
    flagValue.className = uiConfig.classes.inputField;
    flagValue.title = "Select the flag value";
    ["true", "false"].forEach(val => {
        const option = document.createElement("option");
        option.value = val;
        option.textContent = val;
        if (val === flag.value) option.selected = true;
        flagValue.appendChild(option);
    });

    inputsWrapper.append(flagName, flagValue);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "bg-red-700 bg-opacity-50 hover:bg-opacity-100 transition border-red-700 border text-white px-2 py-1 rounded ml-2";
    deleteBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>`;
    deleteBtn.title = "Delete flag";
    deleteBtn.onclick = () => row.remove();

    row.append(inputsWrapper, deleteBtn);
    return row;
};

export const buildClearAllButton = (containerId, itemType) => {
    const container = $(containerId);
    const clearAllBtn = document.createElement("button");
    clearAllBtn.className = "bg-gray-700 bg-opacity-50 hover:bg-opacity-100 transition border-gray-700 border text-white px-2 py-1 rounded text-sm mt-2";
    clearAllBtn.textContent = `Clear All ${itemType}`;
    clearAllBtn.onclick = () => {
        while (container.firstChild) {
            container.firstChild.remove();
        }
    };
    return clearAllBtn;
}; 