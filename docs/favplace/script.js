const player = document.getElementById('player');
const map = document.getElementById("map");
const rooms = document.querySelectorAll(".room");

const roomOverlay       = document.getElementById("roomOverlay");
const roomOverlayClose  = document.getElementById("roomOverlayClose");
const roomTitleEl       = document.getElementById("roomTitle");
const roomImageEl       = document.getElementById("roomImage");
const roomDescriptionEl = document.getElementById("roomDescription");

const targetPanel   = document.getElementById("targetPanel");
const targetButton  = document.getElementById("targetButton");
const targetLabel   = document.getElementById("targetLabel");
const targetSelect  = document.getElementById("targetSelect");

// Track current floor state
let currentFloor = 1; // 1 = first floor, 2 = second floor
let ROOM_DATA = {}; 
let activeTarget = null;  // roomName string or null
let currentRoomName = null;

// Player starting position
let posX = 82;  // %
let posY = 62;  // %

let prevPosX = posX;
let prevPosY = posY;

// Facing direction: "up" | "right" | "down" | "left"
let direction = "down";   // starting facing down

// Load the JSON file when the page loads
fetch("rooms.json")
    .then(response => response.json())
    .then(data => {
        ROOM_DATA = data;
        console.log("Room data loaded:", ROOM_DATA);

        // Populate targetSelect options from ROOM_DATA
        populateTargetSelect();
    })
    .catch(err => console.error("Error loading rooms.json:", err));

function checkRoomEntry() {
    const playerRect = player.getBoundingClientRect();
    let collidedRoom = null;

    rooms.forEach(room => {
        const roomFloor = room.dataset.floor || "both";

        // skip rooms for other floors
        if (roomFloor !== "both" && Number(roomFloor) !== currentFloor) {
            return;
        }

        const roomRect = room.getBoundingClientRect();

        const isColliding =
            playerRect.left   < roomRect.right &&
            playerRect.right  > roomRect.left &&
            playerRect.top    < roomRect.bottom &&
            playerRect.bottom > roomRect.top;

        if (isColliding && !collidedRoom) {
            collidedRoom = room;
        }
    });

    if (collidedRoom) {
        const roomName = collidedRoom.dataset.room;

        if (roomName !== currentRoomName) {
            currentRoomName = roomName;
            handleRoomEntry(roomName);
        }
    } else {
        // just left all rooms
        currentRoomName = null;
    }
}

function handleRoomEntry(roomName) {

    // Handle staircases first
    if (roomName === "stair1" || roomName === "stair2") {
        toggleFloor();
        return;
    }

    // Look up this room in rooms.json
    const roomConfig = ROOM_DATA[roomName];
    if (!roomConfig) {
        console.warn("No room config found for:", roomName);
        return;
    }

    // If this is a blocked area (stop.png), bounce the player back
    if (roomConfig.blocked) {
        // snap back to previous position
        posX = prevPosX;
        posY = prevPosY;
        updatePlayer();

        // show the DAME image
        showRoomOverlay(roomConfig);
        // we don't consider ourselves "inside" this room
        currentRoomName = null;

        // optional: play a sound, flash, or small message here instead of overlay
        // e.g. showRoomOverlay(roomConfig) if you want the stop sign to pop up

        return;
    }

    if (activeTarget) {
        const targetConfig = ROOM_DATA[activeTarget];

        if (roomName === activeTarget) {
            // ✅ Correct room for the current target
            showTargetFeedback(true, targetConfig);

            // Clear target once succeeded (optional)
            activeTarget = null;
            targetLabel.textContent = "No target";
            targetSelect.value = "";

            // Then show the normal room popup
            showRoomOverlay(roomConfig);
        } else {
            // ❌ Wrong room: feedback + NO overlay
            showTargetFeedback(false, ROOM_DATA[activeTarget] || roomConfig);
            // Don't open room overlay
        }
        return;
    }

    // 4. Normal room: show overlay as before
    showRoomOverlay(roomConfig);
}


function toggleFloor() {
    currentFloor = currentFloor === 1 ? 2 : 1;

    if (currentFloor === 1) {
        map.style.backgroundImage = 'url("images/firstfloor.png")';
    } else {
        map.style.backgroundImage = 'url("images/secondfloor.png")';
    }

    console.log("Switched to floor:", currentFloor);
}

roomOverlayClose.addEventListener("click", () => {
    roomOverlay.classList.add("hidden");
});

function showRoomOverlay(roomConfig) {
    roomTitleEl.textContent = roomConfig.title || "";
    roomImageEl.src = roomConfig.image || "";
    roomImageEl.alt = roomConfig.title || "";
    roomDescriptionEl.textContent = roomConfig.description || "";

    roomOverlay.classList.remove("hidden");
}

function updatePlayer() {
    player.style.left = posX + '%';
    player.style.top = posY + '%';
}

// Update Koapyon sprite based on direction
function updatePlayerSprite() {
    player.src = `images/koapyon_${direction}.png`;
}

function rotateDirection(delta) {
    // Clockwise order
    const order = ["up", "right", "down", "left"];
    let idx = order.indexOf(direction);
    idx = (idx + delta + order.length) % order.length;
    direction = order[idx];
    updatePlayerSprite();
}

function rotateDirection(delta) {
    // Clockwise order
    const order = ["up", "right", "down", "left"];
    let idx = order.indexOf(direction);
    idx = (idx + delta + order.length) % order.length;
    direction = order[idx];
    updatePlayerSprite();
}

function moveForward(step) {
    // remember where we were (for your bounce-back logic)
    prevPosX = posX;
    prevPosY = posY;

    if (direction === "up") {
        posY = Math.max(0, posY - step);
    } else if (direction === "down") {
        posY = Math.min(100, posY + step);
    } else if (direction === "left") {
        posX = Math.max(0, posX - step);
    } else if (direction === "right") {
        posX = Math.min(100, posX + step);
    }

    updatePlayer();
    checkRoomEntry();   // keep your existing room logic
}

function populateTargetSelect() {
    // Clear existing (keep first "Select a room…" option)
    targetSelect.innerHTML = '<option value="">Select a room…</option>';

    // Build options from ROOM_DATA keys, skipping stairs/court/etc if you want
    Object.keys(ROOM_DATA).forEach(roomName => {
        const cfg = ROOM_DATA[roomName];

        // Skip non-targetable rooms if you like:
        if (roomName === "stair1" || roomName === "stair2" || roomName === "court") return;
        if (cfg.image && cfg.image.endsWith("dame.png") || cfg.image && cfg.image.endsWith("nojump.png")) return;

        const option = document.createElement("option");
        option.value = roomName;
        option.textContent = cfg.title || roomName;
        targetSelect.appendChild(option);
    });
}

let targetFeedbackTimeout = null;
let judgeOverlayTimeout = null;

function showTargetFeedback(isCorrect, roomConfig) {
    // ----- Small bottom-right text feedback (unchanged in spirit) -----
    const old = document.getElementById("targetFeedback");
    if (old) old.remove();
    if (targetFeedbackTimeout) {
        clearTimeout(targetFeedbackTimeout);
        targetFeedbackTimeout = null;
    }

    const msgDiv = document.createElement("div");
    msgDiv.id = "targetFeedback";
    msgDiv.classList.add(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
        msgDiv.textContent = `Correct! ${roomConfig.title || ""}`.trim();
    } else {
        msgDiv.textContent = `Not ${roomConfig.title || "this room"}!`;
    }

    document.body.appendChild(msgDiv);

    targetFeedbackTimeout = setTimeout(() => {
        msgDiv.remove();
    }, 1800);

    // ----- Big 〇 / ✕ overlay -----
    const existingOverlay = document.getElementById("judgeOverlay");
    if (existingOverlay) existingOverlay.remove();
    if (judgeOverlayTimeout) {
        clearTimeout(judgeOverlayTimeout);
        judgeOverlayTimeout = null;
    }

    const overlay = document.createElement("div");
    overlay.id = "judgeOverlay";
    overlay.classList.add(isCorrect ? "maru" : "batsu");
    overlay.textContent = isCorrect ? "〇" : "✕";

    document.body.appendChild(overlay);

    // Remove after 1 second (animation is 1s)
    judgeOverlayTimeout = setTimeout(() => {
        overlay.remove();
    }, 1000);
}


targetButton.addEventListener("click", () => {
    // Toggle the visibility of the select
    targetSelect.classList.toggle("hidden");
});

// When a room is chosen
targetSelect.addEventListener("change", () => {
    const value = targetSelect.value;
    if (value) {
        activeTarget = value;
        const cfg = ROOM_DATA[value];
        targetLabel.textContent = `Target: ${cfg.title || value}`;
    } else {
        activeTarget = null;
        targetLabel.textContent = "No target";
    }
});


window.addEventListener("keydown", (e) => {
    const step = 2; // % per "Go straight"

    // Only handle navigation keys
    if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault(); // stop page from scrolling
    }

    if (e.key === "ArrowLeft") {
        // Turn left (counter-clockwise)
        rotateDirection(-1);
        return;
    }

    if (e.key === "ArrowRight") {
        // Turn right (clockwise)
        rotateDirection(1);
        return;
    }

    if (e.key === "ArrowUp") {
        // Go straight in the direction we’re facing
        moveForward(step);
        return;
    }

    // ArrowDown: do nothing
});

map.addEventListener('click', (e) => {
    const rect = map.getBoundingClientRect();
    const x = e.clientX - rect.left;   // px from left of map
    const y = e.clientY - rect.top;    // px from top of map

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    console.log(`Clicked at: left: ${xPercent.toFixed(2)}%, top: ${yPercent.toFixed(2)}%`);
});

// More intuitive popup closers. Click outside 
// or press escape or space
window.addEventListener("keydown", (e) => {
    if (roomOverlay.classList.contains("hidden")) return;

    if (e.key === "Escape" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();   // stops scrolling for space
        roomOverlay.classList.add("hidden");
    }
});

roomOverlay.addEventListener("click", (e) => {
    if (e.target === roomOverlay) {
        roomOverlay.classList.add("hidden");
    }
});

updatePlayer();
updatePlayerSprite();




