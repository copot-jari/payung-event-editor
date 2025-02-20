# Payung Event Editor
![Image](./docs/ss.png)
<center><i>Current state</i></center>

---
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)](#)
[![HTML](https://img.shields.io/badge/HTML-%23E34F26.svg?logo=html5&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-%2307405e.svg?logo=sqlite&logoColor=white)](#)
[![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white)](#)

A simple node editor module for payung event datatype. To be integrated with Payung engine later on for Visual Novel and RPGM type game.

## Known Issues
Bugs and glitches:
- [x] Focus outline does not dissapear sometimes
- [x] Relational line is drawn incorrectly if zoom changes from default
- [x] Scene, dialogues et cetera is not saved when saving db
- [ ] SFX must be readded each time user edits detail sprite
- [X] Sometimes the line goes off
- [X] Drag connection doesn't work
- [ ] When a sprite is deleted it cannot be added back until two scenes is focued and unfocused
- [ ] After deleting a scene, all existing scenes are normal but adding a new scene causes it to no be able to be connected
- [ ] SFX is not yet implemented in the scene preview

## Features
Todo List:
- [x] Conditionals for choicces
- [x] Flag requirement choices
- [x] Load from SQLite
- [x] Save to SQLite
- [X] SFX For sprites
- [X] Music player for event
- [X] Integrate with scene editor (upcoming)
- [x] Zoom In/Out for more working space
- [x] Panning
- [X] Move event without choice
- [X] Color coded actor
- [X] Scene title
- [X] Script Parser
- [X] Scene Preview
- [ ] Change sprite src without changing the position

