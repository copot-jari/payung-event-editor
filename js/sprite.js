const $ = id => document.getElementById(id);

const sceneEditor = $('sceneEditor'),
      backgroundUpload = $('backgroundUpload'),
      uploadBackground = $('uploadBackground'),
      spriteUpload = $('spriteUpload'),
      uploadSprite = $('uploadSprite'),
      spriteList = $('spriteList'),
      spriteDetailModal = $('spriteDetailModal'),
      spriteFocusToggle = $('spriteFocusToggle'),
      spriteAnimClassInput = $('spriteAnimClassInput'),
      spriteContinuityIdentifierInput = $('spriteContinuityIdentifierInput'), 
      spriteSfxList = $('spriteSfxList'),
      addSpriteSfxBtn = $('addSpriteSfxBtn'),
      saveSpriteDetailsBtn = $('saveSpriteDetailsBtn'),
      closeSpriteDetailModal = $('closeSpriteDetailModal');
let currentSpriteElement = null;
sceneEditor.style.position = 'relative';
uploadBackground.addEventListener('click', () => backgroundUpload.click());
backgroundUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        sceneEditor.style.backgroundImage = `url(${event.target.result})`;
        sceneEditor.style.backgroundSize = 'cover';
    };
    reader.readAsDataURL(file);
});
uploadSprite.addEventListener('click', () => spriteUpload.click());
spriteUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const sprite = document.createElement('div');
        sprite.classList.add('sprite');
        sprite.style.position = 'absolute';
        const spriteWidth = 100;
        const spriteHeight = 100;
        sprite.style.width = spriteWidth + 'px';
        sprite.style.height = spriteHeight + 'px';
        sprite.style.backgroundImage = `url(${event.target.result})`;
        sprite.style.backgroundSize = 'contain';
        sprite.style.backgroundRepeat = 'no-repeat';
        sprite.style.cursor = 'move';
        sprite.style.left = (sceneEditor.clientWidth / 2 - spriteWidth / 2) + 'px';
        sprite.style.top = (sceneEditor.clientHeight / 2 - spriteHeight / 2) + 'px';
        sprite.dataset.focus = 'true';
        sprite.dataset.animationClass = '';
        sprite.dataset.continuityIdentifier = ''; 
        sprite.dataset.sfx = '[]';
        makeDraggableAndResizable(sprite);
        sceneEditor.appendChild(sprite);
        addSpriteThumbnail(event.target.result, sprite);
    };
    reader.readAsDataURL(file);
});

function addSpriteThumbnail(src, spriteElement) {
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'relative border p-2 flex flex-col gap-1';
    const thumbnail = document.createElement('img');
    thumbnail.src = src;
    thumbnail.className = 'w-16 h-16 object-contain';
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'absolute top-0 right-0 bg-red-700  bg-opacity-50 hover:bg-opacity-100 transition border-red-700 border text-xs px-1 py-1';
    deleteBtn.addEventListener('click', () => {
        sceneEditor.removeChild(spriteElement);
        spriteList.removeChild(thumbnailContainer);
    });
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'bg-blue-700  bg-opacity-50 hover:bg-opacity-100 transition border-blue-700 border text-xs px-2 py-1 rounded mt-1';
    editBtn.addEventListener('click', () => {
        openSpriteDetailModal(spriteElement);
    });
    thumbnailContainer.appendChild(thumbnail);
    thumbnailContainer.appendChild(deleteBtn);
    thumbnailContainer.appendChild(editBtn);
    spriteList.appendChild(thumbnailContainer);
}

function openSpriteDetailModal(spriteElement) {
    currentSpriteElement = spriteElement;
    spriteFocusToggle.checked = spriteElement.dataset.focus === 'true';
    spriteAnimClassInput.value = spriteElement.dataset.animationClass || '';
    spriteContinuityIdentifierInput.value = spriteElement.dataset.continuityIdentifier || ''; 
    spriteSfxList.innerHTML = '';
    let sfxArray = [];
    try {
        sfxArray = JSON.parse(spriteElement.dataset.sfx || '[]');
    } catch (e) {
        sfxArray = [];
    }
    sfxArray.forEach((sfxItem) => {
        addSpriteSfxRow(sfxItem);
    });
    spriteDetailModal.classList.remove('hidden');
}

function addSpriteSfxRow(preset = {}) {
    const row = document.createElement('div');
    row.className = 'sfx-row flex items-center gap-2';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.className = 'sprite-sfx-file text-xs';
    const fileLabel = document.createElement('span');
    fileLabel.className = 'text-xs text-gray-300';
    fileLabel.textContent = preset.fileName ? preset.fileName : 'No file';
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        fileLabel.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            row.dataset.fileData = event.target.result;
            row.dataset.fileName = file.name;
        };
        reader.readAsDataURL(file);
    });
    const loopLabel = document.createElement('label');
    loopLabel.textContent = 'Loop';
    const loopCheckbox = document.createElement('input');
    loopCheckbox.type = 'checkbox';
    loopCheckbox.className = 'sprite-sfx-loop';
    loopCheckbox.checked = preset.loop || false;
    loopLabel.prepend(loopCheckbox);
    const autoLabel = document.createElement('label');
    autoLabel.textContent = 'Auto';
    const autoCheckbox = document.createElement('input');
    autoCheckbox.type = 'checkbox';
    autoCheckbox.className = 'sprite-sfx-auto';
    autoCheckbox.checked = preset.auto || false;
    autoLabel.prepend(autoCheckbox);
    const volInput = document.createElement('input');
    volInput.type = 'number';
    volInput.min = '0';
    volInput.max = '1';
    volInput.step = '0.1';
    volInput.value = preset.volume !== undefined ? preset.volume : '1';
    volInput.className = 'sprite-sfx-volume text-xs w-16';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'X';
    delBtn.className = 'bg-red-700  bg-opacity-50 hover:bg-opacity-100 transition border-red-700 border text-xs px-1 py-1 rounded';
    delBtn.addEventListener('click', () => {
        row.remove();
    });
    row.appendChild(fileInput);
    row.appendChild(fileLabel);
    row.appendChild(loopLabel);
    row.appendChild(autoLabel);
    row.appendChild(volInput);
    row.appendChild(delBtn);
    spriteSfxList.appendChild(row);
}
addSpriteSfxBtn.addEventListener('click', () => {
    addSpriteSfxRow();
});
saveSpriteDetailsBtn.addEventListener('click', () => {
    if (!currentSpriteElement) return;
    currentSpriteElement.dataset.focus = spriteFocusToggle.checked ? 'true' : 'false';
    currentSpriteElement.dataset.animationClass = spriteAnimClassInput.value;
    currentSpriteElement.dataset.continuityIdentifier = spriteContinuityIdentifierInput.value; 
    currentSpriteElement.style.filter = spriteFocusToggle.checked ? 'brightness(100%)' : 'brightness(80%)';
    const sfxRows = spriteSfxList.querySelectorAll('.sfx-row');
    const sfxData = [];
    sfxRows.forEach(row => {
        const fileData = row.dataset.fileData || null;
        if (!fileData) return;
        const fileName = row.dataset.fileName || '';
        const loop = row.querySelector('.sprite-sfx-loop').checked;
        const auto = row.querySelector('.sprite-sfx-auto').checked;
        const volume = parseFloat(row.querySelector('.sprite-sfx-volume').value);
        sfxData.push({
            fileName,
            fileData,
            loop,
            auto,
            volume
        });
    });
    currentSpriteElement.dataset.sfx = JSON.stringify(sfxData);
    spriteDetailModal.classList.add('hidden');
});
closeSpriteDetailModal.addEventListener('click', () => {
    spriteDetailModal.classList.add('hidden');
});

function makeDraggableAndResizable(el) {
    let isDragging = false,
        offsetX = 0,
        offsetY = 0;
    el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle')) return;
        isDragging = true;
        const editorRect = sceneEditor.getBoundingClientRect();
        offsetX = e.clientX - editorRect.left - parseInt(el.style.left, 10);
        offsetY = e.clientY - editorRect.top - parseInt(el.style.top, 10);
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const editorRect = sceneEditor.getBoundingClientRect();
        let newLeft = e.clientX - editorRect.left - offsetX;
        let newTop = e.clientY - editorRect.top - offsetY;
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('resize-handle');
    resizeHandle.style.width = '10px';
    resizeHandle.style.height = '10px';
    resizeHandle.style.background = 'rgb(255, 255, 255)';
    resizeHandle.style.border = '2px solid black';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.cursor = 'nwse-resize';
    el.appendChild(resizeHandle);
    let isResizing = false,
        startX, startY, startWidth, startHeight;
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(window.getComputedStyle(el).width, 10);
        startHeight = parseInt(window.getComputedStyle(el).height, 10);
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.width = startWidth + dx + 'px';
        el.style.height = startHeight + dy + 'px';
    });
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.userSelect = '';
    });
}
export function loadSceneForNode(nodeData) {
    if (nodeData.scene.background) {
        sceneEditor.style.backgroundImage = `url(${nodeData.scene.background})`;
        sceneEditor.style.backgroundSize = 'cover';
    } else {
        sceneEditor.style.backgroundImage = 'none';
    }
    sceneEditor.querySelectorAll('.sprite').forEach(el => el.remove());
    spriteList.innerHTML = '';
    nodeData.scene.sprites.forEach(spriteData => {
        const sprite = document.createElement('div');
        sprite.classList.add('sprite');
        sprite.style.position = 'absolute';
        sprite.style.left = spriteData.x + 'px';
        sprite.style.top = spriteData.y + 'px';
        sprite.style.backgroundImage = `url(${spriteData.src})`;
        sprite.style.backgroundSize = 'contain';
        sprite.style.backgroundRepeat = 'no-repeat';
        sprite.style.width = spriteData.width + 'px';
        sprite.style.height = spriteData.height + 'px';
        sprite.style.cursor = 'move';
        if (spriteData.focus === false) {
            sprite.style.filter = 'brightness(80%)';
            sprite.dataset.focus = 'false';
        } else {
            sprite.style.filter = 'brightness(100%)';
            sprite.dataset.focus = 'true';
        }
        sprite.dataset.animationClass = spriteData.animationClass || '';
        sprite.dataset.continuityIdentifier = spriteData.continuityIdentifier || ''; 
        sprite.dataset.sfx = JSON.stringify(spriteData.sfx || []);
        makeDraggableAndResizable(sprite);
        sceneEditor.appendChild(sprite);
        addSpriteThumbnail(spriteData.src, sprite);
        spriteData.element = sprite;
    });
}
export function commitSceneChangesToNodeData() {
    if (!window.selectedNodeData) return;
    window.selectedNodeData.dialogue = window.dialogueEditor.value();
    const bgImage = sceneEditor.style.backgroundImage;
    const match = bgImage && bgImage.match(/url\("?(.*?)"?\)/);
    window.selectedNodeData.scene.background = match ? match[1] : null;
    const sprites = sceneEditor.querySelectorAll('.sprite');
    const updatedSprites = [];
    sprites.forEach(sprite => {
        const bg = sprite.style.backgroundImage;
        const bgMatch = bg && bg.match(/url\("?(.*?)"?\)/);
        const src = bgMatch ? bgMatch[1] : "";
        let sfxData = [];
        try {
            sfxData = JSON.parse(sprite.dataset.sfx || '[]');
        } catch (e) {
            sfxData = [];
        }
        updatedSprites.push({
            src,
            x: parseInt(sprite.style.left, 10),
            y: parseInt(sprite.style.top, 10),
            width: parseInt(sprite.style.width, 10),
            height: parseInt(sprite.style.height, 10),
            focus: sprite.dataset.focus === 'true',
            animationClass: sprite.dataset.animationClass || '',
            continuityIdentifier: sprite.dataset.continuityIdentifier || '', 
            sfx: sfxData
        });
    });
    window.selectedNodeData.scene.sprites = updatedSprites;
}