import * as THREE from 'three';

const canvas = document.getElementById('sceneCanvas');
const canvasContainer = document.getElementById('canvasContainer');
const baseWidth = 1280;
const baseHeight = 720;
const sidebar = document.getElementById('sidebar')

const camera = new THREE.OrthographicCamera(0, baseWidth, baseHeight, 0, -1000, 1000);

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(baseWidth, baseHeight);

const scene = new THREE.Scene();

let backgroundMesh = null;
let sprites = [];
let currentSprite = null;

let draggingSprite = null;
let resizingSprite = null;
let dragOffsetX = 0,
    dragOffsetY = 0;
let resizeStartX = 0,
    resizeStartY = 0,
    resizeStartWidth = 0,
    resizeStartHeight = 0;

let selectionOutline = null;

export function resizeCanvas() {
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    const scale = Math.min(containerWidth / baseWidth, containerHeight / baseHeight);
    canvas.style.width = baseWidth * scale + 'px';
    canvas.style.height = baseHeight * scale + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

function updateSpriteMesh(sprite) {
    if (sprite.mesh) {
        
        sprite.mesh.position.set(
            sprite.x + sprite.width / 2,
            sprite.y + sprite.height / 2,
            sprite.zIndex !== undefined ? sprite.zIndex : 0
        );
        
        
        const scaleX = sprite.flip ? -sprite.width : sprite.width;
        sprite.mesh.scale.set(scaleX, sprite.height, 1);

        sprite.mesh.material.color.setScalar(sprite.focus ? 1.0 : 0.5);
    }

    if (sprite === currentSprite) updateSelectionOutline();
}

function updateSelectionOutline() {
    if (selectionOutline) {
        scene.remove(selectionOutline);
        selectionOutline = null;
    }
    if (currentSprite) {
        const handleSize = 15;
        const {
            x,
            y,
            width: w,
            height: h
        } = currentSprite;

        const points = [
            new THREE.Vector3(x, y, 1),
            new THREE.Vector3(x + w, y, 1),
            new THREE.Vector3(x + w, y + h, 1),
            new THREE.Vector3(x, y + h, 1),
            new THREE.Vector3(x, y, 1)
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineDashedMaterial({
            color: 0x3b82f6,
            dashSize: 5,
            gapSize: 3,
            linewidth: 2
        });
        const line = new THREE.Line(geo, lineMat);
        line.computeLineDistances();

        const handleGeo = new THREE.PlaneGeometry(handleSize, handleSize);
        const handleMat = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });
        const handleMesh = new THREE.Mesh(handleGeo, handleMat);
        handleMesh.position.set(x + w - handleSize / 2, y + h - handleSize / 2, 1);

        const borderGeo = new THREE.PlaneGeometry(handleSize + 4, handleSize + 4);
        const borderMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true
        });
        const borderMesh = new THREE.Mesh(borderGeo, borderMat);
        borderMesh.position.copy(handleMesh.position);

        selectionOutline = new THREE.Group();
        selectionOutline.add(line);
        selectionOutline.add(borderMesh);
        selectionOutline.add(handleMesh);
        scene.add(selectionOutline);
    }
}

function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: baseHeight - (event.clientY - rect.top) * scaleY
    };
}

window.addEventListener('mousedown', (e) => {
    const {
        x,
        y
    } = getCanvasCoordinates(e);

    const handleHitSize = 15;
    for (let i = sprites.length - 1; i >= 0; i--) {
        const sprite = sprites[i];
        if (
            x >= sprite.x + sprite.width - handleHitSize &&
            x <= sprite.x + sprite.width + handleHitSize / 2 &&
            y >= sprite.y + sprite.height - handleHitSize &&
            y <= sprite.y + sprite.height + handleHitSize / 2
        ) {
            resizingSprite = sprite;
            resizeStartX = x;
            resizeStartY = y;
            resizeStartWidth = sprite.width;
            resizeStartHeight = sprite.height;
            currentSprite = sprite;
            updateSelectionOutline();
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
            updateSelectionOutline();
            return;
        }
    }
});

window.addEventListener('mousemove', (e) => {

    if (!draggingSprite && !resizingSprite) {
        const {
            x,
            y
        } = getCanvasCoordinates(e);
        let overHandle = false;
        const handleHitSize = 15;
        for (let i = sprites.length - 1; i >= 0; i--) {
            const sprite = sprites[i];
            if (
                x >= sprite.x + sprite.width - handleHitSize &&
                x <= sprite.x + sprite.width + handleHitSize / 2 &&
                y >= sprite.y + sprite.height - handleHitSize &&
                y <= sprite.y + sprite.height + handleHitSize / 2
            ) {
                overHandle = true;
                break;
            }
        }
        canvas.style.cursor = overHandle ? 'nwse-resize' : 'default';
    }


    if (!draggingSprite && !resizingSprite) return;
    const {
        x,
        y
    } = getCanvasCoordinates(e);
    if (draggingSprite) {
        draggingSprite.x = x - dragOffsetX;
        draggingSprite.y = y - dragOffsetY;
        updateSpriteMesh(draggingSprite);
    } else if (resizingSprite) {
        const dx = x - resizeStartX;

        let newWidth = Math.max(10, resizeStartWidth + dx);
        const aspectRatio = resizeStartWidth / resizeStartHeight;
        let newHeight = newWidth / aspectRatio;
        resizingSprite.width = newWidth;
        resizingSprite.height = newHeight;
        updateSpriteMesh(resizingSprite);
    }
});

window.addEventListener('mouseup', () => {
    draggingSprite = null;
    resizingSprite = null;
});


window.addEventListener('dblclick', (e) => {
    const {
        x,
        y
    } = getCanvasCoordinates(e);
    for (let i = sprites.length - 1; i >= 0; i--) {
        const sprite = sprites[i];
        if (x >= sprite.x && x <= sprite.x + sprite.width &&
            y >= sprite.y && y <= sprite.y + sprite.height) {
            openSpriteDetailModal(sprite);
            break;
        }
    }
});


const backgroundUpload = document.getElementById('backgroundUpload');
const uploadBackground = document.getElementById('uploadBackground');
uploadBackground.addEventListener('click', () => backgroundUpload.click());
backgroundUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const imageSrc = event.target.result;
        if (backgroundMesh) {

            const texture = new THREE.TextureLoader().load(imageSrc);
            texture.flipY = true;
            texture.colorSpace = THREE.SRGBColorSpace
            backgroundMesh.material.map = texture;
            backgroundMesh.material.needsUpdate = true;
        } else {

            const texture = new THREE.TextureLoader().load(imageSrc);
            texture.flipY = true;
            texture.colorSpace = THREE.SRGBColorSpace
            const geo = new THREE.PlaneGeometry(baseWidth, baseHeight);
            const mat = new THREE.MeshBasicMaterial({
                map: texture
            });
            backgroundMesh = new THREE.Mesh(geo, mat);
            backgroundMesh.position.set(baseWidth / 2, baseHeight / 2, -1);
            scene.add(backgroundMesh);
        }
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
        const imageSrc = event.target.result;
        const img = new Image();
        img.onload = () => {

            const defaultWidth = 100;
            const spriteWidth = defaultWidth;
            const spriteHeight = defaultWidth * (img.naturalHeight / img.naturalWidth);
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
                sfx: [],
                zIndex: 0,    
                flip: false   
            };

            const texture = new THREE.Texture(img);
            texture.needsUpdate = true;
            texture.flipY = true;
            texture.colorSpace = THREE.SRGBColorSpace
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(sprite.x + sprite.width / 2, sprite.y + sprite.height / 2, 0);
            mesh.scale.set(sprite.width, sprite.height, 1);
            sprite.mesh = mesh;
            scene.add(mesh);
            sprites.push(sprite);
            addSpriteThumbnail(sprite, imageSrc);
        };
        img.src = imageSrc;
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
            scene.remove(sprite.mesh);
            sprites.splice(index, 1);
            thumbnailContainer.remove();
            if (currentSprite && currentSprite.id === sprite.id) {
                currentSprite = null;
                if (selectionOutline) {
                    scene.remove(selectionOutline);
                    selectionOutline = null;
                }
            }
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
    
    
    const spriteZIndexInput = document.getElementById('spriteZIndexInput');
    const spriteFlipToggle = document.getElementById('spriteFlipToggle');
    if (spriteZIndexInput) spriteZIndexInput.value = sprite.zIndex !== undefined ? sprite.zIndex : 0;
    if (spriteFlipToggle) spriteFlipToggle.checked = sprite.flip || false;

    spriteSfxList.innerHTML = '';
    (sprite.sfx || []).forEach(sfxItem => addSpriteSfxRow(sfxItem));
    spriteDetailModal.classList.remove('hidden');
    updateSelectionOutline();
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
    
    
    const spriteZIndexInput = document.getElementById('spriteZIndexInput');
    const spriteFlipToggle = document.getElementById('spriteFlipToggle');
    if (spriteZIndexInput) currentSprite.zIndex = parseFloat(spriteZIndexInput.value) || 0;
    if (spriteFlipToggle) currentSprite.flip = spriteFlipToggle.checked;

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
    updateSpriteMesh(currentSprite);
});

closeSpriteDetailModal.addEventListener('click', () => {
    spriteDetailModal.classList.add('hidden');
});



export function loadSceneForNode(nodeData) {

    if (backgroundMesh) {
        scene.remove(backgroundMesh);
        backgroundMesh = null;
    }

    scene.remove(selectionOutline);
    selectionOutline = null;
    sprites.forEach(sprite => scene.remove(sprite.mesh));
    sprites = [];
    spriteList.innerHTML = '';


    if (nodeData.scene.background) {
        const texture = new THREE.TextureLoader().load(nodeData.scene.background);
        texture.flipY = true;
        texture.colorSpace = THREE.SRGBColorSpace
        const geo = new THREE.PlaneGeometry(baseWidth, baseHeight);
        const mat = new THREE.MeshBasicMaterial({
            map: texture
        });
        backgroundMesh = new THREE.Mesh(geo, mat);
        backgroundMesh.position.set(baseWidth / 2, baseHeight / 2, -1);
        scene.add(backgroundMesh);
    }

    nodeData.scene.sprites.forEach(spriteData => {
        const img = new Image();
        img.onload = () => {
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
                sfx: spriteData.sfx || [],
                zIndex: spriteData.zIndex !== undefined ? spriteData.zIndex : 0, 
                flip: spriteData.flip !== undefined ? spriteData.flip : false         
            };
            const texture = new THREE.Texture(img);
            texture.needsUpdate = true;
            texture.flipY = true;
            texture.colorSpace = THREE.SRGBColorSpace
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(sprite.x + sprite.width / 2, sprite.y + sprite.height / 2, 0);
            mesh.scale.set(sprite.width, sprite.height, 1);
            sprite.mesh = mesh;
            scene.add(mesh);
            sprites.push(sprite);
            updateSpriteMesh(sprite);
            addSpriteThumbnail(sprite, spriteData.src);
        };
        img.src = spriteData.src;
    });
}

export function commitSceneChangesToNodeData() {
    if (!window.selectedNodeData) return;
    window.selectedNodeData.dialogue = window.dialogueEditor.value();
    window.selectedNodeDOM.querySelector("div.font-semibold").textContent =
        `${window.selectedNodeData.speaker} - ${window.selectedNodeData.dialogue}`;
    window.selectedNodeData.scene.background = backgroundMesh ?
        (backgroundMesh.material.map.image.currentSrc || backgroundMesh.material.map.image.src) :
        null;
    const updatedSprites = sprites.map(sprite => ({
        src: sprite.image.src,
        x: sprite.x,
        y: sprite.y,
        width: sprite.width,
        height: sprite.height,
        focus: sprite.focus,
        animationClass: sprite.animationClass,
        continuityIdentifier: sprite.continuityIdentifier,
        sfx: sprite.sfx,
        zIndex: sprite.zIndex, 
        flip: sprite.flip        
    }));
    window.selectedNodeData.scene.sprites = updatedSprites;
}