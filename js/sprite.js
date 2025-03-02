import * as THREE from 'three';
import { $ } from './ui.js';

const canvas = $('sceneCanvas');
const canvasContainer = $('canvasContainer');
const baseWidth = 1280;
const baseHeight = 720;
const sidebar = $('sidebar');

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

// Track if there are unsaved scene changes
window.hasUnsavedSceneChanges = false;
window.originalSceneState = null;

// Function to check if scene has changed
function checkSceneChanges() {
    if (!window.selectedNodeData || !window.originalSceneState) return false;
    
    // Check background changes
    const currentBackground = backgroundMesh && backgroundMesh.material.map ? 
        (backgroundMesh.material.map.image && 
         (backgroundMesh.material.map.image.currentSrc || backgroundMesh.material.map.image.src)) || null :
        null;
    
    if (currentBackground !== window.originalSceneState.background) {
        return true;
    }
    
    // Check sprite changes
    if (sprites.length !== window.originalSceneState.sprites.length) {
        return true;
    }
    
    // Check each sprite for changes
    for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const originalSprite = window.originalSceneState.sprites[i];
        
        if (sprite.x !== originalSprite.x ||
            sprite.y !== originalSprite.y ||
            sprite.width !== originalSprite.width ||
            sprite.height !== originalSprite.height ||
            sprite.focus !== originalSprite.focus ||
            sprite.animationClass !== originalSprite.animationClass ||
            sprite.zIndex !== originalSprite.zIndex ||
            sprite.flip !== originalSprite.flip ||
            sprite.image?.src !== originalSprite.src) {
            return true;
        }
    }
    
    return false;
}

// Function to show toast notification for unsaved changes
function showUnsavedChangesToast(show) {
    const toastContainer = document.getElementById('unsavedChangesContainer');
    
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'unsavedChangesContainer';
        container.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300';
        container.style.opacity = show ? '1' : '0';
        container.style.pointerEvents = show ? 'auto' : 'none';
        
        const toast = document.createElement('div');
        toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3';
        
        const icon = document.createElement('div');
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>`;
        
        const message = document.createElement('div');
        message.textContent = 'Unsaved changes to this node\'s scene';
        
        const saveButton = document.createElement('button');
        saveButton.className = 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200';
        saveButton.textContent = 'Save';
        saveButton.onclick = () => {
            commitSceneChangesToNodeData();
            window.hasUnsavedSceneChanges = false;
            showUnsavedChangesToast(false);
        };
        
        toast.appendChild(icon);
        toast.appendChild(message);
        toast.appendChild(saveButton);
        container.appendChild(toast);
        document.body.appendChild(container);
    } else {
        toastContainer.style.opacity = show ? '1' : '0';
        toastContainer.style.pointerEvents = show ? 'auto' : 'none';
    }
}

// Function to update the original scene state
function updateOriginalSceneState() {
    if (!window.selectedNodeData) return;
    
    window.originalSceneState = {
        background: window.selectedNodeData.scene.background,
        sprites: window.selectedNodeData.scene.sprites.map(sprite => ({...sprite}))
    };
    
    window.hasUnsavedSceneChanges = false;
    showUnsavedChangesToast(false);
}

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
        crossFadeTexture(sprite, sprite.image.src)

        
        const scaleX = sprite.flip ? -sprite.width : sprite.width;
        sprite.mesh.scale.set(scaleX, sprite.height, 1);

        sprite.mesh.sr

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
    
    if (window.selectedNodeData && window.originalSceneState) {
        checkAndUpdateSceneChanges();
    }
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


const backgroundUpload = $('backgroundUpload');
const uploadBackground = $('uploadBackground');
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
        
        checkAndUpdateSceneChanges();
    };
    reader.readAsDataURL(file);
});


const spriteUpload = $('spriteUpload');
const uploadSprite = $('uploadSprite');
uploadSprite.addEventListener('click', () => spriteUpload.click());
spriteUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    console.log(file)
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
            
            checkAndUpdateSceneChanges();
        };
        img.src = imageSrc;
    };
    reader.readAsDataURL(file);
});


const spriteList = $('spriteList');
const emptySpritesMessage = $('emptySpritesMessage');

function updateEmptySpritesMessage() {
    if (sprites.length === 0) {
        emptySpritesMessage.classList.remove('hidden');
    } else {
        emptySpritesMessage.classList.add('hidden');
    }
}

function addSpriteThumbnail(sprite, src) {
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'relative bg-[#1a1c23] border border-[#343740] rounded-md overflow-hidden hover:border-blue-500 transition-all duration-200 group';
    thumbnailContainer.dataset.spriteId = sprite.id;
    
    const thumbnailWrapper = document.createElement('div');
    thumbnailWrapper.className = 'w-20 h-20 flex items-center justify-center p-1 relative';
    
    const thumbnail = document.createElement('img');
    thumbnail.src = src;
    thumbnail.className = 'max-w-full max-h-full object-contain';
    thumbnail.addEventListener('click', () => {
        currentSprite = sprite;
        updateSelectionOutline();
        
        document.querySelectorAll('#spriteList > div').forEach(el => {
            el.classList.remove('ring-2', 'ring-blue-500');
        });
        thumbnailContainer.classList.add('ring-2', 'ring-blue-500');
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    deleteBtn.className = 'absolute top-1 right-1 bg-red-700 bg-opacity-0 group-hover:bg-opacity-80 transition-all duration-200 text-white rounded-full w-5 h-5 flex items-center justify-center';
    deleteBtn.title = 'Delete sprite';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
            
            checkAndUpdateSceneChanges();
        }
    });
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'bg-[#252830] p-1 flex justify-between items-center';
    
    const zIndexIndicator = document.createElement('span');
    zIndexIndicator.className = 'text-xs text-gray-400';
    zIndexIndicator.textContent = `z:${sprite.zIndex || 0}`;
    
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
    editBtn.className = 'bg-blue-700 bg-opacity-80 hover:bg-opacity-100 transition-all duration-200 text-white rounded-full w-5 h-5 flex items-center justify-center';
    editBtn.title = 'Edit sprite';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSpriteDetailModal(sprite);
    });
    
    thumbnailWrapper.appendChild(thumbnail);
    thumbnailWrapper.appendChild(deleteBtn);
    controlsContainer.appendChild(zIndexIndicator);
    controlsContainer.appendChild(editBtn);
    
    thumbnailContainer.appendChild(thumbnailWrapper);
    thumbnailContainer.appendChild(controlsContainer);
    
    spriteList.appendChild(thumbnailContainer);
    
    if (currentSprite && currentSprite.id === sprite.id) {
        thumbnailContainer.classList.add('ring-2', 'ring-blue-500');
    }
    
    updateEmptySpritesMessage();
}


const spriteDetailModal = $('spriteDetailModal');
const spriteFocusToggle = $('spriteFocusToggle');
const spriteAnimClassInput = $('spriteAnimClassInput');
const spriteAnimClassSelect = $('spriteAnimClassSelect');
const animationPreviewContainer = $('animationPreviewContainer');
const animationPreviewSprite = $('animationPreviewSprite');
const spriteContinuityIdentifierInput = $('spriteContinuityIdentifierInput');
const saveSpriteDetailsBtn = $('saveSpriteDetailsBtn');
const closeSpriteDetailModal = $('closeSpriteDetailModal');

const availableAnimations = [
    { value: '', label: 'None', description: 'No animation' },
    { value: 'enter_fade', label: 'Fade In', description: 'Sprite fades in gradually' },
    { value: 'fx_surprised', label: 'Surprised', description: 'Sprite jumps up briefly' },
    { value: 'enter_from_left', label: 'Enter From Left', description: 'Sprite slides in from the left' },
    { value: 'enter_from_right', label: 'Enter From Right', description: 'Sprite slides in from the right' },
    { value: 'enter_from_top', label: 'Enter From Top', description: 'Sprite drops in from the top' },
    { value: 'enter_from_bottom', label: 'Enter From Bottom', description: 'Sprite rises from the bottom' },
    { value: 'fx_shake', label: 'Shake', description: 'Sprite shakes horizontally' },
    { value: 'fx_bounce', label: 'Bounce', description: 'Sprite bounces up and down' },
    { value: 'fx_pulse', label: 'Pulse', description: 'Sprite pulses in size' },
    { value: 'exit_fade', label: 'Fade Out', description: 'Sprite fades out gradually' },
];

function populateAnimationDropdown() {
    spriteAnimClassSelect.innerHTML = '';
    availableAnimations.forEach(animation => {
        const option = document.createElement('option');
        option.value = animation.value;
        option.textContent = animation.label;
        option.dataset.description = animation.description;
        spriteAnimClassSelect.appendChild(option);
    });
}

populateAnimationDropdown();

let previewScene, previewCamera, previewRenderer, previewSpriteMesh;
let previewAnimationId = null;
let previewAnimationState = {
    running: false,
    startTime: 0,
    duration: 2000,
    type: '',
    resetTimeout: null
};

function setupPreviewScene() {
    if (previewRenderer) {
        animationPreviewSprite.removeChild(previewRenderer.domElement);
        cancelAnimationFrame(previewAnimationId);
        previewAnimationId = null;
    }
    
    previewScene = new THREE.Scene();
    
    const previewWidth = 200;
    const previewHeight = 150;
    previewCamera = new THREE.OrthographicCamera(0, previewWidth, previewHeight, 0, -1000, 1000);
    
    previewRenderer = new THREE.WebGLRenderer({ alpha: true });
    previewRenderer.setClearColor(0x000000, 0);
    previewRenderer.setSize(previewWidth, previewHeight);
    
    animationPreviewSprite.innerHTML = '';
    animationPreviewSprite.appendChild(previewRenderer.domElement);
    
    if (previewAnimationState.type) {
        const selectedOption = Array.from(spriteAnimClassSelect.options).find(option => option.value === previewAnimationState.type);
        if (selectedOption && selectedOption.dataset.description) {
            const descriptionElement = document.createElement('div');
            descriptionElement.className = 'text-xs text-gray-400 mt-2 text-center';
            descriptionElement.textContent = selectedOption.dataset.description;
            animationPreviewSprite.appendChild(descriptionElement);
        }
    }
    
    return { previewWidth, previewHeight };
}

function animatePreview() {
    previewAnimationId = requestAnimationFrame(animatePreview);
    
    if (previewAnimationState.running && previewSpriteMesh) {
        const elapsed = Date.now() - previewAnimationState.startTime;
        const progress = Math.min(elapsed / previewAnimationState.duration, 1);
        
        updatePreviewAnimation(progress);
    }
    
    previewRenderer.render(previewScene, previewCamera);
}

function updatePreviewAnimation(progress) {
    if (!previewSpriteMesh) return;
    
    const type = previewAnimationState.type;
    
    if (type === 'enter_fade') {
        previewSpriteMesh.material.opacity = progress;
    }
    else if (type === 'exit_fade') {
        previewSpriteMesh.material.opacity = 1 - progress;
    }
    else if (type === 'fx_surprised') {
        const jumpHeight = 20;
        const y = previewSpriteMesh.userData.originalY - jumpHeight * Math.sin(progress * Math.PI);
        previewSpriteMesh.position.y = y;
    }
    else if (type === 'enter_from_left') {
        const startX = previewSpriteMesh.userData.originalX - 100;
        const targetX = previewSpriteMesh.userData.originalX;
        previewSpriteMesh.position.x = startX + (targetX - startX) * progress;
        previewSpriteMesh.material.opacity = progress;
    }
    else if (type === 'enter_from_right') {
        const startX = previewSpriteMesh.userData.originalX + 100;
        const targetX = previewSpriteMesh.userData.originalX;
        previewSpriteMesh.position.x = startX + (targetX - startX) * progress;
        previewSpriteMesh.material.opacity = progress;
    }
    else if (type === 'enter_from_top') {
        const startY = previewSpriteMesh.userData.originalY - 100;
        const targetY = previewSpriteMesh.userData.originalY;
        previewSpriteMesh.position.y = startY + (targetY - startY) * progress;
        previewSpriteMesh.material.opacity = progress;
    }
    else if (type === 'enter_from_bottom') {
        const startY = previewSpriteMesh.userData.originalY + 100;
        const targetY = previewSpriteMesh.userData.originalY;
        previewSpriteMesh.position.y = startY + (targetY - startY) * progress;
        previewSpriteMesh.material.opacity = progress;
    }
    else if (type === 'fx_shake') {
        const frequency = 12;
        const amplitude = 10 * (1 - progress);
        const shake = amplitude * Math.sin(progress * frequency * Math.PI);
        previewSpriteMesh.position.x = previewSpriteMesh.userData.originalX + shake;
    }
    else if (type === 'fx_bounce') {
        const bounceCount = 3;
        const bounceProgress = (progress * bounceCount) % 1;
        const bounceHeight = 15 * (1 - progress);
        const y = previewSpriteMesh.userData.originalY - bounceHeight * Math.abs(Math.sin(bounceProgress * Math.PI));
        previewSpriteMesh.position.y = y;
    }
    else if (type === 'fx_pulse') {
        const pulseCount = 2;
        const pulseProgress = (progress * pulseCount) % 1;
        const pulseScale = 1 + 0.2 * (1 - progress) * Math.sin(pulseProgress * Math.PI * 2);
        previewSpriteMesh.scale.set(
            previewSpriteMesh.userData.originalWidth * pulseScale,
            previewSpriteMesh.userData.originalHeight * pulseScale,
            1
        );
    }
    
    if (progress >= 1 && previewAnimationState.running) {
        if (previewAnimationState.resetTimeout) {
            clearTimeout(previewAnimationState.resetTimeout);
        }
        
        previewAnimationState.resetTimeout = setTimeout(() => {
            resetPreviewAnimation();
        }, 1000);
    }
}

function resetPreviewAnimation() {
    if (!previewSpriteMesh) return;
    
    previewSpriteMesh.position.x = previewSpriteMesh.userData.originalX;
    previewSpriteMesh.position.y = previewSpriteMesh.userData.originalY;
    previewSpriteMesh.scale.set(
        previewSpriteMesh.userData.originalWidth,
        previewSpriteMesh.userData.originalHeight,
        1
    );
    previewSpriteMesh.material.opacity = 1;
    
    if (previewAnimationState.type === 'exit_fade') {
        previewSpriteMesh.material.opacity = 1;
    }
    
    previewAnimationState.startTime = Date.now();
}

function previewAnimation(animationClass) {
    animationPreviewSprite.className = 'flex items-center justify-center';
    
    if (!animationClass || !currentSprite) {
        animationPreviewSprite.classList.add('hidden');
        $('animationPreview').querySelector('.text-gray-500').classList.remove('hidden');
        
        if (previewAnimationId) {
            cancelAnimationFrame(previewAnimationId);
            previewAnimationId = null;
        }
        
        return;
    }
    
    $('animationPreview').querySelector('.text-gray-500').classList.add('hidden');
    animationPreviewSprite.classList.remove('hidden');
    
    const { previewWidth, previewHeight } = setupPreviewScene();
    
    if (currentSprite && currentSprite.image) {
        const texture = new THREE.Texture(currentSprite.image);
        texture.needsUpdate = true;
        texture.flipY = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        
        const aspectRatio = currentSprite.width / currentSprite.height;
        let spriteWidth, spriteHeight;
        
        if (aspectRatio > 1) {
            spriteWidth = Math.min(previewWidth * 0.8, 150);
            spriteHeight = spriteWidth / aspectRatio;
        } else {
            spriteHeight = Math.min(previewHeight * 0.8, 100);
            spriteWidth = spriteHeight * aspectRatio;
        }
        
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        previewSpriteMesh = new THREE.Mesh(geometry, material);
        
        const centerX = previewWidth / 2;
        const centerY = previewHeight / 2;
        previewSpriteMesh.position.set(centerX, centerY, 0);
        previewSpriteMesh.scale.set(spriteWidth, spriteHeight, 1);
        
        previewSpriteMesh.userData = {
            originalX: centerX,
            originalY: centerY,
            originalWidth: spriteWidth,
            originalHeight: spriteHeight
        };
        
        if (currentSprite.flip) {
            previewSpriteMesh.scale.x = -spriteWidth;
        }
        
        if (animationClass === 'enter_fade' || 
            animationClass === 'enter_from_left' || 
            animationClass === 'enter_from_right' || 
            animationClass === 'enter_from_top' || 
            animationClass === 'enter_from_bottom') {
            material.opacity = 0;
        }
        
        previewScene.add(previewSpriteMesh);
        
        previewAnimationState = {
            running: true,
            startTime: Date.now(),
            duration: 2000,
            type: animationClass,
            resetTimeout: null
        };
        
        if (!previewAnimationId) {
            animatePreview();
        }
    } else {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true
        });
        
        previewSpriteMesh = new THREE.Mesh(geometry, material);
        previewSpriteMesh.position.set(previewWidth / 2, previewHeight / 2, 0);
        previewScene.add(previewSpriteMesh);
        
        const textElement = document.createElement('div');
        textElement.className = 'absolute inset-0 flex items-center justify-center text-gray-400 text-sm';
        textElement.textContent = 'No sprite selected';
        animationPreviewSprite.appendChild(textElement);
    }
}

spriteAnimClassSelect.addEventListener('change', () => {
    const selectedAnimation = spriteAnimClassSelect.value;
    spriteAnimClassInput.value = selectedAnimation;
    previewAnimation(selectedAnimation);
});

spriteAnimClassInput.addEventListener('input', () => {
    const customAnimation = spriteAnimClassInput.value;
    
    const matchingOption = Array.from(spriteAnimClassSelect.options).find(option => option.value === customAnimation);
    
    if (matchingOption) {
        spriteAnimClassSelect.value = customAnimation;
    } else {
        spriteAnimClassSelect.value = '';
    }
    
    previewAnimation(customAnimation);
});

function openSpriteDetailModal(sprite) {
    currentSprite = sprite;
    spriteFocusToggle.checked = sprite.focus;
    
    spriteAnimClassInput.value = sprite.animationClass || '';
    
    const matchingOption = Array.from(spriteAnimClassSelect.options).find(option => option.value === sprite.animationClass);
    
    if (matchingOption) {
        spriteAnimClassSelect.value = sprite.animationClass;
    } else {
        spriteAnimClassSelect.value = '';
    }
    
    previewAnimation(sprite.animationClass);
    
    spriteContinuityIdentifierInput.value = sprite.continuityIdentifier;
    
    const spriteZIndexInput = $('spriteZIndexInput');
    const spriteFlipToggle = $('spriteFlipToggle');
    if (spriteZIndexInput) spriteZIndexInput.value = sprite.zIndex !== undefined ? sprite.zIndex : 0;
    if (spriteFlipToggle) spriteFlipToggle.checked = sprite.flip || false;

    spriteDetailModal.classList.remove('hidden');
    spriteDetailModal.classList.add('flex');
    updateSelectionOutline();
}

saveSpriteDetailsBtn.addEventListener('click', () => {
    if (!currentSprite) return;
    if (document.getElementById('spriteUpdate').files.length > 0) {
        let newFile = document.getElementById('spriteUpdate').files[0];
        document.getElementById('spriteUpdate').value = null
        const newSpriteReader = new FileReader();
        newSpriteReader.onload = (event) => {
            const imageSrc = event.target.result;
            currentSprite.image.src = imageSrc;
            checkAndUpdateSceneChanges();
        };
        newSpriteReader.onerror = (error) => {
            console.error('Error reading file:', error);
        };
        newSpriteReader.readAsDataURL(newFile);
    }
    currentSprite.focus = spriteFocusToggle.checked;
    currentSprite.animationClass = spriteAnimClassInput.value;
    currentSprite.continuityIdentifier = spriteContinuityIdentifierInput.value;
    
    const spriteZIndexInput = $('spriteZIndexInput');
    const spriteFlipToggle = $('spriteFlipToggle');
    if (spriteZIndexInput) currentSprite.zIndex = parseFloat(spriteZIndexInput.value) || 0;
    if (spriteFlipToggle) currentSprite.flip = spriteFlipToggle.checked;

    spriteDetailModal.classList.add('hidden');
    spriteDetailModal.classList.remove('flex');
    updateSpriteMesh(currentSprite);
    
    checkAndUpdateSceneChanges();
});

closeSpriteDetailModal.addEventListener('click', () => {
    spriteDetailModal.classList.add('hidden');
    spriteDetailModal.classList.remove('flex');
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
    
    updateEmptySpritesMessage();

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
            
            if (sprites.length === nodeData.scene.sprites.length) {
                setTimeout(() => {
                    updateOriginalSceneState();
                }, 100);
            }
        };
        img.src = spriteData.src;
    });
    
    if (nodeData.scene.sprites.length === 0) {
        updateOriginalSceneState();
    }
}

function crossFadeTexture(sprite, newSrc, duration, animationClass) {
    const loader = new THREE.TextureLoader();
    loader.load(newSrc, (newTexture) => {
        newTexture.flipY = true;
        newTexture.colorSpace = THREE.SRGBColorSpace;
        sprite.image = newTexture.image;
        sprite.mesh.material.map = newTexture;
        sprite.mesh.material.needsUpdate = true;
    });
}

export function commitSceneChangesToNodeData() {
    if (!window.selectedNodeData) return;
    
    
    window.selectedNodeData.scene.background = backgroundMesh && backgroundMesh.material.map ? 
        (backgroundMesh.material.map.image && 
         (backgroundMesh.material.map.image.currentSrc || backgroundMesh.material.map.image.src)) || null :
        null;
    
    const updatedSprites = sprites.map(sprite => ({
        src: sprite.image?.src || null,
        x: sprite.x,
        y: sprite.y,
        width: sprite.width,
        height: sprite.height,
        focus: sprite.focus,
        animationClass: sprite.animationClass,
        continuityIdentifier: sprite.continuityIdentifier,
        zIndex: sprite.zIndex, 
        flip: sprite.flip        
    }));
    console.log("UPDATED SPRITES", updatedSprites)
    window.selectedNodeData.scene.sprites = updatedSprites;
    
    updateOriginalSceneState();
    
    return true; 
}

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); 
        
        if (window.hasUnsavedSceneChanges && window.selectedNodeData) {
            commitSceneChangesToNodeData();
            window.hasUnsavedSceneChanges = false;
            showUnsavedChangesToast(false);
        }
    }
});

function checkAndUpdateSceneChanges() {
    if (checkSceneChanges()) {
        commitSceneChangesToNodeData();
        // window.hasUnsavedSceneChanges = true;
        // showUnsavedChangesToast(true);
    }
}

window.showUnsavedChangesToast = showUnsavedChangesToast;
window.checkAndUpdateSceneChanges = checkAndUpdateSceneChanges;

const addSpriteBtn = $('addSpriteBtn');
if (addSpriteBtn) {
    addSpriteBtn.addEventListener('click', () => {
        $('spriteUpload').click();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateEmptySpritesMessage();
});