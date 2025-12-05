const player = document.getElementById('player');
const map = document.getElementById("map");
const rooms = document.querySelectorAll(".room");

const roomOverlay       = document.getElementById("roomOverlay");
const roomOverlayClose  = document.getElementById("roomOverlayClose");
const roomTitleEl       = document.getElementById("roomTitle");
const roomImageEl       = document.getElementById("roomImage");
const roomDescriptionEl = document.getElementById("roomDescription");

// Track current floor state
let currentFloor = 1; // 1 = first floor, 2 = second floor
let ROOM_DATA = {}; 

// Load the JSON file when the page loads
fetch("rooms.json")
    .then(response => response.json())
    .then(data => {
        ROOM_DATA = data;
        console.log("Room data loaded:", ROOM_DATA);
    })
    .catch(err => console.error("Error loading rooms.json:", err));

let currentRoomName = null;

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

    // 4. Normal room: show overlay as before
    showRoomOverlay(roomConfig);
}


let floorSwapCooldown = false;

function toggleFloor() {
    if (floorSwapCooldown) return;

    floorSwapCooldown = true;
    setTimeout(() => floorSwapCooldown = false, 8000);

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

// Player starting position
let posX = 82;  // %
let posY = 62;  // %

let prevPosX = posX;
let prevPosY = posY;

function updatePlayer() {
    player.style.left = posX + '%';
    player.style.top = posY + '%';
}

window.addEventListener('keydown', (e) => {
    const step = 2;

    // remember where we were before moving
    prevPosX = posX;
    prevPosY = posY;

    if (e.key === 'ArrowLeft')  posX = Math.max(0, posX - step);
    if (e.key === 'ArrowRight') posX = Math.min(100, posX + step);
    if (e.key === 'ArrowUp')    posY = Math.max(0, posY - step);
    if (e.key === 'ArrowDown')  posY = Math.min(100, posY + step);

    updatePlayer();
    checkRoomEntry();
});

updatePlayer();


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


