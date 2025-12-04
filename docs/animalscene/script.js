

/* =======================================================
   IMAGE LOADER
   Loads animals → right overlay
   Loads scenery → bottom overlay
   ======================================================= */

const activityContainer = document.querySelector(".activity-container");
const overlayRight = document.getElementById("overlayRight");
const overlayBottom = document.getElementById("overlayBottom");
const playArea = document.getElementById("playArea");

const enlargeBtn = document.getElementById("enlargeBtn");
const returnBtn = document.getElementById("returnBtn");
const revealBtn = document.getElementById("revealBtn");
const loadBtn = document.getElementById("loadBtn");
const loadInput = document.getElementById("loadInput");

let animalsRevealed = false; // toggle state
let sceneryZ = 1000;  // scenery always above animals
let animalZ = 0;      // animals below scenery

async function loadThumbnails() {
    // Load animals
    try {
        const animals = await fetch("images/animals/animals.json").then(r => r.json());

        animals.files.forEach(file => {
            const img = document.createElement("img");
            img.src = `images/animals/${file}`;
            img.className = "thumb";
            img.draggable = true;
            img.dataset.type = "animal";
            overlayRight.appendChild(img);
        });
    } catch (err) {
        console.error("Error loading animals:", err);
    }

    // Load scenery
    try {
        const scenery = await fetch("images/scenery/scenery.json").then(r => r.json());

        scenery.files.forEach(file => {
            const img = document.createElement("img");
            img.src = `images/scenery/${file}`;
            img.className = "thumb";
            img.draggable = true;
            img.dataset.type = "env";
            overlayBottom.appendChild(img);
        });
    } catch (err) {
        console.error("Error loading scenery:", err);
    }
}

loadThumbnails();

/* =======================================================
   POINTER EVENT–BASED DRAG & DROP
   WORKS FOR: mouse, touch, stylus
   Replaces dragstart/dragover/drop logic
======================================================= */

let activeItem = null;    // the thumbnail or placed-item being dragged
let isClone = false;      // false = dragging from overlays, true = dragging placed-item
let offsetX = 0;
let offsetY = 0;

// helper: assign z-index based on type (same as before)
function assignZ(element) {
    if (element.dataset.type === "env") {
        sceneryZ++;
        element.style.zIndex = sceneryZ;
    } else {
        animalZ++;
        element.style.zIndex = animalZ;
    }
}

/* =======================================================
   LOAD SAVED SCENE FROM JSON
   Expected JSON format:
   {
     "items": [
       {
         "src": "images/animals/lion.png",
         "type": "animal",       // "animal" or "env"
         "left": 100,            // px from left of playArea
         "top": 150,             // px from top of playArea
         "width": 120            // optional, px
       }
     ]
   }
======================================================= */

function loadSceneFromData(data) {
    // Clear current placed items
    document.querySelectorAll(".placed-item").forEach(el => el.remove());

    if (!data || !Array.isArray(data.items)) {
        console.warn("Scene JSON has no 'items' array.");
        return;
    }

    data.items.forEach(item => {
        if (!item.src) return;

        const img = document.createElement("img");
        img.src = item.src;
        img.className = "placed-item";
        img.dataset.type = item.type || "env";

        img.style.position = "absolute";
        img.style.left = (item.left ?? 0) + "px";
        img.style.top  = (item.top  ?? 0) + "px";

        if (item.width) {
            img.style.width = item.width + "px";
        }

        assignZ(img);
        playArea.appendChild(img);
    });
}

// Click "Load" → open file picker
loadBtn.addEventListener("click", () => {
    loadInput.value = ""; // reset so same file can be reloaded
    loadInput.click();
});

// When teacher selects a file
loadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            loadSceneFromData(data);
        } catch (err) {
            console.error("Error parsing scene JSON:", err);
            alert("Could not load scene. Is the JSON valid?");
        }
    };
    reader.readAsText(file);
});

/* =======================================================
   SAVE CURRENT SCENE TO JSON
   Output format:
   {
     "items": [
       {
         "src": "images/animals/lion.png",
         "type": "animal",
         "left": 100,
         "top": 150,
         "width": 120
       }
     ]
   }
======================================================= */

function buildSceneData() {
    const items = [];
    const placed = document.querySelectorAll(".placed-item");

    placed.forEach(el => {
        // style.left/top are strings like "123px"
        const left = parseFloat(el.style.left) || 0;
        const top  = parseFloat(el.style.top)  || 0;

        // width may or may not be explicitly set
        let width = parseFloat(el.style.width);
        if (isNaN(width)) {
            width = el.getBoundingClientRect().width;
        }

        items.push({
            src: el.src,
            type: el.dataset.type || "env",
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(width)
        });
    });

    return { items };
}

function downloadSceneJSON() {
    const data = buildSceneData();
    const json = JSON.stringify(data, null, 2);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `animalscene-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

saveBtn.addEventListener("click", downloadSceneJSON);


/* ------------------------------
   START DRAG
------------------------------ */
document.addEventListener("pointerdown", (e) => {
    const target = e.target;

    // Thumbnails → will create clones
    if (target.classList.contains("thumb")) {
        activeItem = target;
        isClone = false;

        // Create a lightweight floating drag preview
        dragPreview = document.createElement("img");
        dragPreview.src = target.src;
        dragPreview.style.position = "fixed";
        dragPreview.style.pointerEvents = "none";
        dragPreview.style.width = "90px";              // same size as thumbnail
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

        e.preventDefault();
        return;
    }


    // Placed items → move them
    if (target.classList.contains("placed-item")) {
        activeItem = target;
        isClone = true;

        const rect = target.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        assignZ(target);  // bring to front on click/touch
        e.preventDefault();
        return;
    }
});

/* ------------------------------
   DRAG MOVE
------------------------------ */
document.addEventListener("pointermove", (e) => {
    if (!activeItem) return;

    const x = e.clientX;
    const y = e.clientY;

    // while dragging a thumbnail: drag the thumbnail itself visually
    if (!isClone && dragPreview) {
        dragPreview.style.left = (x - offsetX) + "px";
        dragPreview.style.top  = (y - offsetY) + "px";
    }


    // while dragging a placed-item: drag it visually
    else {
        activeItem.style.position = "absolute";
        const playRect = playArea.getBoundingClientRect();
        const newLeft = x - playRect.left - offsetX;
        const newTop  = y - playRect.top - offsetY;

        activeItem.style.left = newLeft + "px";
        activeItem.style.top = newTop + "px";
    }
});

/* ------------------------------
   END DRAG (DROP)
------------------------------ */
document.addEventListener("pointerup", (e) => {
    if (!activeItem) return;

    const x = e.clientX;
    const y = e.clientY;

    const playRect = playArea.getBoundingClientRect();
    const rightRect = overlayRight.getBoundingClientRect();
    const bottomRect = overlayBottom.getBoundingClientRect();

    /* --- CASE 1: Dropped in RIGHT overlay → delete if clone --- */
    if (x >= rightRect.left && x <= rightRect.right &&
        y >= rightRect.top  && y <= rightRect.bottom) {

        if (isClone) activeItem.remove();
        
        cleanupAfterDrag();
        return;
    }

    /* --- CASE 2: Dropped in BOTTOM overlay → delete if clone --- */
    if (x >= bottomRect.left && x <= bottomRect.right &&
        y >= bottomRect.top  && y <= bottomRect.bottom) {

        if (isClone) activeItem.remove();

        cleanupAfterDrag();
        return;
    }

    /* --- CASE 3: Dropped inside PLAY AREA --- */
    if (x >= playRect.left && x <= playRect.right &&
        y >= playRect.top  && y <= playRect.bottom) {

        // thumbnail → create a clone in the play area
        if (!isClone) {
            const clone = document.createElement("img");
            clone.src = activeItem.src;
            clone.className = "placed-item";
            clone.dataset.type = activeItem.dataset.type;

            clone.style.position = "absolute";
            clone.style.left = (x - playRect.left - offsetX) + "px";
            clone.style.top  = (y - playRect.top - offsetY) + "px";

            assignZ(clone);
            playArea.appendChild(clone);
        }

        // placed-item → snap final position (already moved)
        else {
            assignZ(activeItem);
        }

        cleanupAfterDrag();
        return;
    }

    /* --- CASE 4: Dropped anywhere else → delete if clone --- */
    if (isClone && activeItem.classList.contains("placed-item")) {
        activeItem.remove();
    }

    cleanupAfterDrag();
});

// Click to select a placed item (adds .selected outline)
// Clicking elsewhere clears selection
document.addEventListener("click", (e) => {
    const target = e.target;

    // If we clicked on a placed item → select it
    if (target.classList && target.classList.contains("placed-item")) {
        // remove selection from others
        document.querySelectorAll(".placed-item.selected")
            .forEach(el => el.classList.remove("selected"));

        target.classList.add("selected");
        return;
    }

    // If click was NOT on a placed item → clear selection
    document.querySelectorAll(".placed-item.selected")
        .forEach(el => el.classList.remove("selected"));
});


/* ------------------------------
   CLEANUP AFTER DRAG
------------------------------ */
function cleanupAfterDrag() {
    if (dragPreview) {
        dragPreview.remove();
        dragPreview = null;
    }
    // Reset inline dragging-styles for thumbnails
    if (activeItem && activeItem.classList.contains("thumb")) {
        activeItem.style.position = "";
        activeItem.style.left = "";
        activeItem.style.top = "";
    }

    activeItem = null;
    isClone = false;
}

/* ------------------------------
    RESET PLAY AREA
------------------------------ */
document.getElementById("resetBtn").addEventListener("click", () => {
    document.querySelectorAll(".placed-item").forEach(el => el.remove());
});

/* ------------------------------
    PRESENTATION MODE PLAY AREA
------------------------------ */

// ENLARGE: Expand play area to full size
enlargeBtn.addEventListener("click", () => {

    // The activity container is already fixed at 1024x768
    const contRect = activityContainer.getBoundingClientRect();

    // The play area has a known fixed size
    const playWidth = playArea.offsetWidth;
    const playHeight = playArea.offsetHeight;

    // Compute scale
    const scaleX = contRect.width / playWidth;
    const scaleY = contRect.height / playHeight;
    const scale = Math.min(scaleX, scaleY);

    // Apply enlarge mode
    playArea.classList.add("enlarged", "no-interaction");
    playArea.style.transform = `scale(${scale})`;

    // Hide overlays
    overlayRight.classList.add("hidden");
    overlayBottom.classList.add("hidden");

    // Show return button
    returnBtn.style.display = "flex";
    revealBtn.style.display = "flex";

});



// RETURN: Restore normal layout
returnBtn.addEventListener("click", () => {
    playArea.classList.remove("enlarged", "no-interaction");
    playArea.style.transform = "";

    overlayRight.classList.remove("hidden");
    overlayBottom.classList.remove("hidden");

    returnBtn.style.display = "none";
    revealBtn.style.display = "none";

    // Reset state if needed
    if (animalsRevealed) {
        hideAnimals();
    }
});

/* ------------------------------
    HIDE/REVEAL IN PRESENTATION
------------------------------ */

function revealAnimals() {
    // Hide scenery (env)
    document.querySelectorAll(".placed-item").forEach(item => {
        if (item.dataset.type === "env") {
            item.style.display = "none";
        }
    });

    animalsRevealed = true;
    revealBtn.innerHTML = `Animals <span class="material-symbols-outlined">visibility_off</span>`;
}

function hideAnimals() {
    // Show scenery again
    document.querySelectorAll(".placed-item").forEach(item => {
        if (item.dataset.type === "env") {
            item.style.display = "";
        }
    });

    animalsRevealed = false;
    revealBtn.innerHTML = `Animals <span class="material-symbols-outlined">visibility</span>`;
}

revealBtn.addEventListener("click", () => {
    if (!animalsRevealed) {
        revealAnimals();
    } else {
        hideAnimals();
    }
});