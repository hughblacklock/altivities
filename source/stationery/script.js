const activityContainer = document.querySelector(".activity-container");
const overlayRight = document.getElementById("overlayRight");
const playArea = document.getElementById("playArea");

const returnBtn = document.getElementById("returnBtn");
const revealBtn = document.getElementById("revealBtn");

let sceneryZ = 1000;  // scenery always above animals
let currentBackground = "images/background.png"; // default

let rotationStartAngle = 0;
let rotationStartPointerAngle = 0;

async function loadThumbnails() {
    try {
        const stationery = await fetch("images/stationery.json").then(r => r.json());

        stationery.forEach(item => {
            const img = document.createElement("img");
            img.src = item.image;
            img.className = "thumb";
            img.draggable = true;
            img.dataset.type = "scenery";

            overlayRight.appendChild(img);
        });
    } catch (err) {
        console.error("Error loading stationery:", err);
    }
}

loadThumbnails();

function ensureRotation(item) {
    if (!item.dataset.rotation) {
        item.dataset.rotation = "0";
    }
}

function applyRotation(item, angle) {
    item.dataset.rotation = String(angle);
    syncWrapperToRotation(item, angle);
}

function removeRotateHandle() {
    if (rotateHandle) {
        rotateHandle.remove();
        rotateHandle = null;
    }
}

function syncWrapperToRotation(wrapper, angle) {
    const rotator = wrapper.querySelector(".rotator");
    const img = wrapper.querySelector(".placed-item-image");

    if (!rotator || !img) return;

    const baseWidth = parseFloat(wrapper.dataset.baseWidth || img.naturalWidth || img.width);
    const baseHeight = parseFloat(wrapper.dataset.baseHeight || img.naturalHeight || img.height);

    if (!baseWidth || !baseHeight) return;

    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const bboxWidth = Math.abs(baseWidth * cos) + Math.abs(baseHeight * sin);
    const bboxHeight = Math.abs(baseWidth * sin) + Math.abs(baseHeight * cos);

    // keep center fixed while resizing wrapper
    const oldWidth = wrapper.offsetWidth || bboxWidth;
    const oldHeight = wrapper.offsetHeight || bboxHeight;

    const oldLeft = parseFloat(wrapper.style.left || 0);
    const oldTop = parseFloat(wrapper.style.top || 0);

    const centerX = oldLeft + oldWidth / 2;
    const centerY = oldTop + oldHeight / 2;

    wrapper.style.width = `${bboxWidth}px`;
    wrapper.style.height = `${bboxHeight}px`;
    wrapper.style.left = `${centerX - bboxWidth / 2}px`;
    wrapper.style.top = `${centerY - bboxHeight / 2}px`;

    // size rotator to original image size, then rotate it
    rotator.style.width = `${baseWidth}px`;
    rotator.style.height = `${baseHeight}px`;
    rotator.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    img.style.width = `${baseWidth}px`;
    img.style.height = `${baseHeight}px`;

    if (wrapper === selectedItem) {
        updateRotateHandlePosition(wrapper);
    }
}

function updateRotateHandlePosition(item) {
    if (!rotateHandle || !item) return;

    const centerX = item.offsetLeft + item.offsetWidth / 2;
    const centerY = item.offsetTop + item.offsetHeight / 2;

    const radius = Math.max(item.offsetWidth, item.offsetHeight) / 2 + 28;

    rotateHandle.style.left = `${centerX - 14}px`;
    rotateHandle.style.top = `${centerY - radius - 14}px`;
}

function showRotateHandle(item) {
    removeRotateHandle();

    rotateHandle = document.createElement("button");
    rotateHandle.className = "rotate-handle";
    rotateHandle.type = "button";
    rotateHandle.innerHTML = "⟳";

    rotateHandle.style.position = "absolute";
    rotateHandle.style.width = "28px";
    rotateHandle.style.height = "28px";
    rotateHandle.style.borderRadius = "50%";
    rotateHandle.style.border = "1px solid #666";
    rotateHandle.style.background = "#fff";
    rotateHandle.style.cursor = "grab";
    rotateHandle.style.zIndex = "9999";
    rotateHandle.style.display = "flex";
    rotateHandle.style.alignItems = "center";
    rotateHandle.style.justifyContent = "center";
    rotateHandle.style.padding = "0";

    playArea.appendChild(rotateHandle);
    updateRotateHandlePosition(item);
}

function selectPlacedItem(item) {
    document.querySelectorAll(".placed-item.selected")
        .forEach(el => el.classList.remove("selected"));

    item.classList.add("selected");
    selectedItem = item;

    ensureRotation(item);
    showRotateHandle(item);
}

function clearSelection() {
    document.querySelectorAll(".placed-item.selected")
        .forEach(el => el.classList.remove("selected"));

    selectedItem = null;
    removeRotateHandle();
}

/* =======================================================
   POINTER EVENT–BASED DRAG & DROP
======================================================= */

let activeItem = null;    // thumb or placed-item wrapper being dragged
let isClone = false;      // false = dragging from overlays, true = dragging placed-item
let offsetX = 0;
let offsetY = 0;

let dragPreview = null;
let selectedItem = null;
let rotateHandle = null;
let isRotating = false;

function assignZ(element) {
    if (element.dataset.type === "env" || element.dataset.type === "scenery") {
        sceneryZ++;
        element.style.zIndex = sceneryZ;
    }
}

function setBackground(src) {
    currentBackground = src;
    playArea.style.backgroundImage = `url("${src}")`;
}

function scaleGame() {
    const baseWidth = 1024;
    const baseHeight = 768;

    const scaleX = window.innerWidth / baseWidth;
    const scaleY = window.innerHeight / baseHeight;

    const scale = Math.min(scaleX, scaleY);

    const container = document.querySelector(".activity-container");
    container.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", scaleGame);
window.addEventListener("load", scaleGame);

function createPlacedWrapper(src, type, left, top) {
    const wrapper = document.createElement("div");
    wrapper.className = "placed-item";
    wrapper.dataset.type = type;
    wrapper.dataset.rotation = "0";

    wrapper.style.position = "absolute";
    wrapper.style.left = `${left}px`;
    wrapper.style.top = `${top}px`;
    wrapper.style.cursor = "move";

    const rotator = document.createElement("div");
    rotator.className = "rotator";
    rotator.style.position = "absolute";
    rotator.style.left = "50%";
    rotator.style.top = "50%";
    rotator.style.transform = "translate(-50%, -50%)";
    rotator.style.transformOrigin = "center center";

    const img = document.createElement("img");
    img.src = src;
    img.className = "placed-item-image";
    img.draggable = false;
    img.style.display = "block";
    img.style.pointerEvents = "none";
    img.style.transformOrigin = "center center";

    img.onload = () => {
        wrapper.dataset.baseWidth = String(img.naturalWidth);
        wrapper.dataset.baseHeight = String(img.naturalHeight);

        syncWrapperToRotation(wrapper, 0);

        if (wrapper === selectedItem) {
            updateRotateHandlePosition(wrapper);
        }
    };

    rotator.appendChild(img);
    wrapper.appendChild(rotator);

    return wrapper;
}

/* ------------------------------
   START DRAG
------------------------------ */
document.addEventListener("pointerdown", (e) => {
    const target = e.target;
    const placedItem = target.closest(".placed-item");

    if (rotateHandle && target === rotateHandle && selectedItem) {
        isRotating = true;

        document.body.classList.add("dragging");
        e.preventDefault();

        // Hide handle while rotating
        rotateHandle.style.display = "none";

        const rect = selectedItem.getBoundingClientRect();
        rotationCenterX = rect.left + rect.width / 2;
        rotationCenterY = rect.top + rect.height / 2;

        rotationStartAngle = parseFloat(selectedItem.dataset.rotation || "0");
        rotationStartPointerAngle = Math.atan2(
            e.clientY - rotationCenterY,
            e.clientX - rotationCenterX
        ) * 180 / Math.PI;

        return;
    }

    // Thumbnails → will create clones
    if (target.classList.contains("thumb")) {
        document.body.classList.add("dragging");
        e.preventDefault();

        activeItem = target;
        isClone = false;

        dragPreview = document.createElement("img");
        dragPreview.src = target.src;
        dragPreview.style.position = "fixed";
        dragPreview.style.pointerEvents = "none";
        dragPreview.style.width = "90px";
        dragPreview.style.height = "90px";
        dragPreview.style.objectFit = "contain";
        dragPreview.style.zIndex = 5000;
        dragPreview.style.border = "none";
        dragPreview.style.background = "transparent";
        dragPreview.style.opacity = "0.9";

        document.body.appendChild(dragPreview);

        const rect = target.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        return;
    }

    // Placed item wrapper → move it
    if (placedItem && playArea.contains(placedItem)) {
        document.body.classList.add("dragging");
        e.preventDefault();

        activeItem = placedItem;
        isClone = true;

        const rect = placedItem.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        assignZ(placedItem);
        selectPlacedItem(placedItem);
        return;
    }
});

/* ------------------------------
   DRAG MOVE
------------------------------ */
document.addEventListener("pointermove", (e) => {
    if (isRotating && selectedItem) {
        e.preventDefault();

        const rect = selectedItem.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const currentPointerAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const newAngle = rotationStartAngle + (currentPointerAngle - rotationStartPointerAngle);

        applyRotation(selectedItem, newAngle);
        return;
    }

    if (activeItem) {
        e.preventDefault();
    }

    if (!activeItem) return;

    const x = e.clientX;
    const y = e.clientY;

    if (!isClone && dragPreview) {
        dragPreview.style.left = (x - offsetX) + "px";
        dragPreview.style.top = (y - offsetY) + "px";
    } else {
        activeItem.style.position = "absolute";
        const playRect = playArea.getBoundingClientRect();
        const newLeft = x - playRect.left - offsetX;
        const newTop = y - playRect.top - offsetY;

        activeItem.style.left = newLeft + "px";
        activeItem.style.top = newTop + "px";

        if (activeItem === selectedItem) {
            updateRotateHandlePosition(activeItem);
        }
    }
});

/* ------------------------------
   END DRAG (DROP)
------------------------------ */
document.addEventListener("pointerup", (e) => {
    document.body.classList.remove("dragging");

    if (isRotating) {
        isRotating = false;
        document.body.classList.remove("dragging");

        // Show handle again
        if (rotateHandle) {
            rotateHandle.style.display = "flex";
        }

        if (selectedItem) updateRotateHandlePosition(selectedItem);
        return;
    }

    if (!activeItem) return;

    const x = e.clientX;
    const y = e.clientY;

    const playRect = playArea.getBoundingClientRect();
    const rightRect = overlayRight.getBoundingClientRect();

    // Dropped in RIGHT overlay → delete if existing placed item
    if (x >= rightRect.left && x <= rightRect.right &&
        y >= rightRect.top && y <= rightRect.bottom) {

        if (isClone) {
            if (activeItem === selectedItem) {
                clearSelection();
            }
            activeItem.remove();
        }

        cleanupAfterDrag();
        return;
    }

    // Dropped inside PLAY AREA
    if (x >= playRect.left && x <= playRect.right &&
        y >= playRect.top && y <= playRect.bottom) {

        if (!isClone) {
            const left = x - playRect.left - offsetX;
            const top = y - playRect.top - offsetY;

            const wrapper = createPlacedWrapper(
                activeItem.src,
                activeItem.dataset.type,
                left,
                top
            );

            assignZ(wrapper);
            playArea.appendChild(wrapper);
            selectPlacedItem(wrapper);
        } else {
            assignZ(activeItem);
            if (activeItem === selectedItem) {
                updateRotateHandlePosition(activeItem);
            }
        }

        cleanupAfterDrag();
        return;
    }

    // Dropped anywhere else → delete if existing placed item
    if (isClone && activeItem.classList.contains("placed-item")) {
        if (activeItem === selectedItem) {
            clearSelection();
        }
        activeItem.remove();
    }

    cleanupAfterDrag();
});

// Clicking elsewhere clears selection
document.addEventListener("click", (e) => {
    const target = e.target;
    const placedItem = target.closest(".placed-item");

    if (rotateHandle && target === rotateHandle) {
        return;
    }

    if (placedItem && playArea.contains(placedItem)) {
        selectPlacedItem(placedItem);
        return;
    }

    clearSelection();
});

/* ------------------------------
   CLEANUP AFTER DRAG
------------------------------ */
function cleanupAfterDrag() {
    if (dragPreview) {
        dragPreview.remove();
        dragPreview = null;
    }

    if (activeItem && activeItem.classList.contains("thumb")) {
        activeItem.style.position = "";
        activeItem.style.left = "";
        activeItem.style.top = "";
    }

    activeItem = null;
    isClone = false;
}