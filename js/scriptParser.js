import { $ } from './ui.js';

CodeMirror.defineMode("dialogueScript", function() {
  return {
    token: function(stream) {
      if (stream.sol()) {
        if (stream.match(/^-\s+/)) {
          return "comment";
        }
        if (stream.match(/[^:]+:/)) {
          return "keyword"; 
        }
      }
      stream.skipToEnd();
      return "string";
    }
  };
});

CodeMirror.registerHelper("lint", "dialogueScript", function(text) {
  const lines = text.split('\n');
  const errors = [];
  let lineNumber = 0;

  lines.forEach((line, index) => {
    lineNumber = index;
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') return;

    if (trimmedLine.startsWith('-')) {
      const description = trimmedLine.slice(1).trim();
      
      if (!description) {
        errors.push({
          from: CodeMirror.Pos(lineNumber, 0),
          to: CodeMirror.Pos(lineNumber, line.length),
          message: "Description cannot be empty",
          severity: "warning"
        });
      }
      return; 
    }
    
    if (!trimmedLine.includes(':')) {
      errors.push({
        from: CodeMirror.Pos(lineNumber, 0),
        to: CodeMirror.Pos(lineNumber, line.length),
        message: "Line must be in 'actor: dialogue' format or start with '-' for descriptions",
        severity: "error"
      });
    } else {
      const [actor, ...dialogueParts] = trimmedLine.split(':');
      const dialogue = dialogueParts.join(':').trim();
      
      if (!actor.trim()) {
        errors.push({
          from: CodeMirror.Pos(lineNumber, 0),
          to: CodeMirror.Pos(lineNumber, 1),
          message: "Actor name cannot be empty",
          severity: "error"
        });
      }
      
      if (!dialogue) {
        errors.push({
          from: CodeMirror.Pos(lineNumber, line.indexOf(':')),
          to: CodeMirror.Pos(lineNumber, line.length),
          message: "Dialogue cannot be empty",
          severity: "warning"
        });
      }
    }
  });

  return errors;
});

let scriptEditor;

export function initializeScriptEditor() {
  if (!scriptEditor) {
    const textarea = $('scriptInput');
    scriptEditor = CodeMirror.fromTextArea(textarea, {
      mode: "dialogueScript",
      theme: "dracula",
      lineNumbers: true,
      lineWrapping: true,
      gutters: ["CodeMirror-lint-markers"],
      lint: true,
      placeholder: "Format:\nactor: dialog\n- description/monologue\n\nEmpty line between blocks creates separate groups.\nExample:\nJohn: Hello there!\nMary: Hi John!\n- The wind blows gently.\n\nJohn: How are you?\nMary: I'm good!"
    });
  
    scriptEditor.setSize("100%", "100%");
    
    return scriptEditor;
  }
}

export function getScriptContent() {
  return scriptEditor ? scriptEditor.getValue() : '';
}

export function setScriptContent(content) {
  if (scriptEditor) {
    scriptEditor.setValue(content);
  }
}

export function clearScriptContent() {
  if (scriptEditor) {
    scriptEditor.setValue('');

  }
} 