const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');
const baseWidth = 1280;
const baseHeight = 720;

document.addEventListener("DOMContentLoaded", () => {
    
    canvas.width = baseWidth;
    canvas.height = baseHeight;

    window.addEventListener('resize', resizeCanvas);
});


export function resizeCanvas() {
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    
    const scale = Math.min(containerWidth / baseWidth, containerHeight / baseHeight);

    canvas.style.width = baseWidth * scale + 'px';
    canvas.style.height = baseHeight * scale + 'px';
}


let backgroundImage = null;
const sprites = []; 
let currentSprite = null; 


canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    
    for (let i = sprites.length - 1; i >= 0; i--) {
        const sprite = sprites[i];
        const handleSize = 10;
        if (x >= sprite.x + sprite.width - handleSize && x <= sprite.x + sprite.width &&
            y >= sprite.y + sprite.height - handleSize && y <= sprite.y + sprite.height) {
            resizingSprite = sprite;
            resizeStartX = x;
            resizeStartY = y;
            resizeStartWidth = sprite.width;
            resizeStartHeight = sprite.height;
            currentSprite = sprite;
            redraw();
            return;
        }
    }

    
    for (let i = sprites.length - 1; i >= 0; i--) {
        const sprite = sprites[i];
        if (x >= sprite.x && x <= sprite.x + sprite.width &&
            y >= sprite.y && y <= sprite.y + sprite.height) {
            draggingSprite = sprite;
            dragOffsetX = x - sprite.x;
            dragOffsetY = y - sprite.y;
            currentSprite = sprite;
            redraw();
            return;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!draggingSprite && !resizingSprite) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (draggingSprite) {
        draggingSprite.x = x - dragOffsetX;
        draggingSprite.y = y - dragOffsetY;
        redraw();
    } else if (resizingSprite) {
        const dx = x - resizeStartX;
        const dy = y - resizeStartY;
        resizingSprite.width = resizeStartWidth + dx;
        resizingSprite.height = resizeStartHeight + dy;
        redraw();
    }
});

canvas.addEventListener('mouseup', () => {
    draggingSprite = null;
    resizingSprite = null;
});


canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    for (let i = sprites.length - 1; i >= 0; i--) {
        const sprite = sprites[i];
        if (x >= sprite.x && x <= sprite.x + sprite.width &&
            y >= sprite.y && y <= sprite.y + sprite.height) {
            openSpriteDetailModal(sprite);
            break;
        }
    }
});



function redraw() {
    ctx.clearRect(0, 0, baseWidth, baseHeight);
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, baseWidth, baseHeight);
    }
    sprites.forEach(sprite => {
        ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height);
        
        if (!sprite.focus) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);
        }
        
        if (sprite === currentSprite) {
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#3b82f6';
            ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height);

            
            const handleSize = 10;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(sprite.x + sprite.width - handleSize, sprite.y + sprite.height - handleSize, handleSize, handleSize);
            
            ctx.strokeStyle = 'black';
            ctx.strokeRect(sprite.x + sprite.width - handleSize, sprite.y + sprite.height - handleSize, handleSize, handleSize);
        }
    });
}



let draggingSprite = null;
let resizingSprite = null;
let dragOffsetX = 0,
    dragOffsetY = 0;
let resizeStartX = 0,
    resizeStartY = 0,
    resizeStartWidth = 0,
    resizeStartHeight = 0;


const backgroundUpload = document.getElementById('backgroundUpload');
const uploadBackground = document.getElementById('uploadBackground');
uploadBackground.addEventListener('click', () => backgroundUpload.click());
backgroundUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        backgroundImage = new Image();
        backgroundImage.onload = redraw;
        backgroundImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});


const spriteUpload = document.getElementById('spriteUpload');
const uploadSprite = document.getElementById('uploadSprite');
uploadSprite.addEventListener('click', () => spriteUpload.click());
spriteUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const spriteWidth = 100,
                spriteHeight = 100;
            const sprite = {
                id: Date.now(),
                image: img,
                x: (baseWidth - spriteWidth) / 2,
                y: (baseHeight - spriteHeight) / 2,
                width: spriteWidth,
                height: spriteHeight,
                focus: true,
                animationClass: '',
                continuityIdentifier: '',
                sfx: []
            };
            sprites.push(sprite);
            addSpriteThumbnail(sprite, event.target.result);
            redraw();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});


const spriteList = document.getElementById('spriteList');

function addSpriteThumbnail(sprite, src) {
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'relative border p-2 flex flex-col gap-1';
    const thumbnail = document.createElement('img');
    thumbnail.src = src;
    thumbnail.className = 'w-16 h-16 object-contain';
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'absolute top-0 right-0 bg-red-700 bg-opacity-50 hover:bg-opacity-100 transition border-red-700 border text-xs px-1 py-1';
    deleteBtn.addEventListener('click', () => {
        const index = sprites.findIndex(s => s.id === sprite.id);
        if (index > -1) {
            sprites.splice(index, 1);
            thumbnailContainer.remove();
            redraw();
        }
    });
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'bg-blue-700 bg-opacity-50 hover:bg-opacity-100 transition border-blue-700 border text-xs px-2 py-1 rounded mt-1';
    editBtn.addEventListener('click', () => openSpriteDetailModal(sprite));
    thumbnailContainer.appendChild(thumbnail);
    thumbnailContainer.appendChild(deleteBtn);
    thumbnailContainer.appendChild(editBtn);
    spriteList.appendChild(thumbnailContainer);
}


const spriteDetailModal = document.getElementById('spriteDetailModal');
const spriteFocusToggle = document.getElementById('spriteFocusToggle');
const spriteAnimClassInput = document.getElementById('spriteAnimClassInput');
const spriteContinuityIdentifierInput = document.getElementById('spriteContinuityIdentifierInput');
const spriteSfxList = document.getElementById('spriteSfxList');
const addSpriteSfxBtn = document.getElementById('addSpriteSfxBtn');
const saveSpriteDetailsBtn = document.getElementById('saveSpriteDetailsBtn');
const closeSpriteDetailModal = document.getElementById('closeSpriteDetailModal');

function openSpriteDetailModal(sprite) {
    currentSprite = sprite;
    spriteFocusToggle.checked = sprite.focus;
    spriteAnimClassInput.value = sprite.animationClass;
    spriteContinuityIdentifierInput.value = sprite.continuityIdentifier;
    spriteSfxList.innerHTML = '';
    (sprite.sfx || []).forEach(sfxItem => addSpriteSfxRow(sfxItem));
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
    delBtn.className = 'bg-red-700 bg-opacity-50 hover:bg-opacity-100 transition border-red-700 border text-xs px-1 py-1 rounded';
    delBtn.addEventListener('click', () => row.remove());
    row.appendChild(fileInput);
    row.appendChild(fileLabel);
    row.appendChild(loopLabel);
    row.appendChild(autoLabel);
    row.appendChild(volInput);
    row.appendChild(delBtn);
    spriteSfxList.appendChild(row);
}
addSpriteSfxBtn.addEventListener('click', () => addSpriteSfxRow());

saveSpriteDetailsBtn.addEventListener('click', () => {
    if (!currentSprite) return;
    currentSprite.focus = spriteFocusToggle.checked;
    currentSprite.animationClass = spriteAnimClassInput.value;
    currentSprite.continuityIdentifier = spriteContinuityIdentifierInput.value;
    
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
    currentSprite.sfx = sfxData;
    spriteDetailModal.classList.add('hidden');
    redraw();
});

closeSpriteDetailModal.addEventListener('click', () => {
    spriteDetailModal.classList.add('hidden');
});


export function loadSceneForNode(nodeData) {
    ctx.clearRect(0, 0, baseWidth, baseHeight);
    if (nodeData.scene.background) {
        backgroundImage = new Image();
        backgroundImage.onload = redraw;
        backgroundImage.src = nodeData.scene.background;
    } else {
        backgroundImage = null;
    }
    sprites.length = 0;
    spriteList.innerHTML = '';
    nodeData.scene.sprites.forEach(spriteData => {
        const img = new Image();
        img.onload = redraw;
        img.src = spriteData.src;
        const sprite = {
            id: Date.now() + Math.random(),
            image: img,
            x: spriteData.x,
            y: spriteData.y,
            width: spriteData.width,
            height: spriteData.height,
            focus: spriteData.focus !== false,
            animationClass: spriteData.animationClass || '',
            continuityIdentifier: spriteData.continuityIdentifier || '',
            sfx: spriteData.sfx || []
        };
        sprites.push(sprite);
        addSpriteThumbnail(sprite, spriteData.src);
    });
}

export function commitSceneChangesToNodeData() {
    if (!window.selectedNodeData) return;
    window.selectedNodeData.dialogue = window.dialogueEditor.value();
    window.selectedNodeDOM.querySelector("div.font-semibold").textContent =
        `${window.selectedNodeData.speaker} - ${window.selectedNodeData.dialogue}`;
    window.selectedNodeData.scene.background = backgroundImage ? backgroundImage.src : null;
    const updatedSprites = sprites.map(sprite => ({
        src: sprite.image.src,
        x: sprite.x,
        y: sprite.y,
        width: sprite.width,
        height: sprite.height,
        focus: sprite.focus,
        animationClass: sprite.animationClass,
        continuityIdentifier: sprite.continuityIdentifier,
        sfx: sprite.sfx
    }));
    window.selectedNodeData.scene.sprites = updatedSprites;
}

requestAnimationFrame