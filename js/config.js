export const uiConfig = {
  selectors: {
      editor: "editor",
      connectionsSVG: "connections",
      sidebar: "sidebar",
      addItemButton: "addItem",
      addNodeButton: "addNode",
      editItemModal: "editItemModal",
      addConditionButton: "addCondition",
      conditionsList: "conditionsList",
      addFlagButton: "addFlag",
      flagsList: "flagsList",
      duplicateNodeButton: "duplicateNode",
      confirmItemButton: "confirmItem",
      deleteItemButton: "deleteItem",
      saveDBButton: "saveDB",
      returnToMenuButton: "returnToMenu",
      dbFileInput: "dbFileInput",
      itemTitleInput: "itemTitleInput",
      nodeElementSelector: "div.node",
      nodeTitleSelectorInNode: "div.font-semibold",
      conditionRowInputsSelector: "input, select",
      flagRowInputsSelector: "input",
      dialogueInput: "dialogueInput",
      speakerInput: "speakerInput",
      deleteNodeButtonSidebar: 'deleteNodeButtonSidebar', 
      deleteNodeModal: 'deleteNodeModal', 
      confirmDeleteNodeButton: 'confirmDeleteNode', 
      cancelDeleteNodeButton: 'cancelDeleteNode', 
  },
  classes: {
      hidden: "hidden",
      nodeSelectedBorder: "border-2",
      nodeSelectedBorderColor: "border-blue-500",
      conditionFlagRow: "flex space-x-2 items-center",
      inputField: "border p-1"
  },
  text: {
      selectedConnectionPrefix: "Selected: ",
      selectConnectionTargetPrompt: "Click on a node to select as connection target...",
      variablePlaceholder: "Variable",
      operatorOptions: ["=", ">", "<", "!="],
      valuePlaceholder: "Value",
      flagNamePlaceholder: "Flag Name",
      trueFalseLabel: "True/False",
      defaultItemTitlePrefix: "Choice "
  },
  events: {
      nodeSelected: "nodeSelected",
      nodeToConnect: "nodeToConnect",
      updateConnection: "updateConnection",
      editItem: "editItem"
  },
  styles: {
      panningCursor: "grabbing",
      defaultCursor: "default"
  },
  defaultNodeTitle: "Untitled" 
}; 