const player = document.getElementById('player');
const map = document.getElementById("map");
const rooms = document.querySelectorAll(".room");

// Track current floor state
let currentFloor = 1; // 1 = first floor, 2 = second floor

function checkRoomEntry() {
    const playerRect = player.getBoundingClientRect();

    rooms.forEach(room => {
        const roomFloor = room.dataset.floor || "both";  // default = both if not set

        // Skip rooms that don't belong to the current floor
        if (roomFloor !== "both" && Number(roomFloor) !== currentFloor) {
            return;
        }

        const roomRect = room.getBoundingClientRect();

        const isColliding =
            playerRect.left   < roomRect.right &&
            playerRect.right  > roomRect.left  &&
            playerRect.top    < roomRect.bottom &&
            playerRect.bottom > roomRect.top;

        if (isColliding) {
            const roomName = room.dataset.room;
            handleRoomEntry(roomName);
        }
    });
}


function handleRoomEntry(roomName) {
    if (roomName === "stair1" || roomName === "stair2") {
        toggleFloor();
    } else {
        // here’s where you’d open classroom screens, etc. later
        console.log("Entered room:", roomName, "on floor", currentFloor);
    }
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

// Player starting position
let posX = 82;  // %
let posY = 62;  // %

function updatePlayer() {
    player.style.left = posX + '%';
    player.style.top = posY + '%';
}

window.addEventListener('keydown', (e) => {
    const step = 2;

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
