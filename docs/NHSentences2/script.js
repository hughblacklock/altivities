let currentSet = null;
let currentUnit = null;
let currentActivity = null;
let data = {};
let dragSrc = null;
let previousActivities = [];


async function loadData(set) {
  const res = await fetch(`data/${set}.json`);
  data = await res.json();
}

function enterMenuMode() {
  const left = document.getElementById("workspace-left");
  const bank = document.getElementById("sentence-bank");

  // Show left panel full width
  left.classList.remove("activity-mode");
  left.classList.add("menu-mode");

  // Hide sentence bank
  bank.classList.add("hidden");

  // Hide activity-only buttons
  document.getElementById("btn-save").style.display = "none";
  document.getElementById("btn-reset").style.display = "none";
  document.getElementById("btn-prev-activities").style.display = "none";

  // Prepare workspace for menu HTML
  left.innerHTML = "";
}


function showMainMenu() {
  enterMenuMode();
  const left = document.getElementById("workspace-left");

  left.innerHTML = `
      <h1>Select Book</h1>
      <button id="btn-nh5">New Horizons 5</button>
      <button id="btn-nh6">New Horizons 6</button>
  `;

  document.getElementById("btn-nh5").onclick = () => {
    currentSet = "nh5";
    loadData("nh5").then(showUnits);
  };

  document.getElementById("btn-nh6").onclick = () => {
    currentSet = "nh6";
    loadData("nh6").then(showUnits);
  };
}

function enterActivityMode() {
  const left = document.getElementById("workspace-left");
  const bank = document.getElementById("sentence-bank");

  // Show split layout
  left.classList.remove("menu-mode");
  left.classList.add("activity-mode");

  // Show sentence bank
  bank.classList.remove("hidden");

  // Clear both areas
  left.innerHTML = "";
  bank.innerHTML = "";

  // Show activity buttons
  document.getElementById("btn-save").style.display = "inline-block";
  document.getElementById("btn-reset").style.display = "inline-block";
  document.getElementById("btn-prev-activities").style.display = "inline-block";
}

function showUnits() {
  enterMenuMode();
  const app = document.getElementById('workspace-left');

  // Extract unique unit numbers from the JSON
  const units = [...new Set(data.map(entry => entry.unit))].sort((a,b)=>a-b);

  app.innerHTML = `<h2>${currentSet.toUpperCase()} Units</h2>`;

  units.forEach(unit => {
    const b = document.createElement('button');
    b.textContent = `Unit ${unit}`;
    b.onclick = () => { currentUnit = unit; showActivities(); };
    app.appendChild(b);
  });

  
  showActivityButtons(false);

}

function showActivities() {
  enterMenuMode();
  const app = document.getElementById('workspace-left');

  // Filter for entries that match the selected unit
  const activities = data
    .filter(entry => entry.unit === currentUnit)
    .map(entry => entry.activity);

  // Remove duplicates & sort
  const uniqueActivities = [...new Set(activities)].sort((a,b)=>a-b);

  app.innerHTML = `<h2>Unit ${currentUnit}</h2>`;

  uniqueActivities.forEach(act => {
    const b = document.createElement('button');
    b.textContent = `Activity ${act}`;
    b.onclick = () => { currentActivity = act; showDialogue(); };
    app.appendChild(b);
  });
  showActivityButtons(false);

}

function createSentenceDiv(line) {
  const div = document.createElement('div');
  div.className = 'dialogue';
  div.draggable = true;

  // store speaker number on the element
  div.dataset.speaker = line.speaker || "1";
  div.dataset.name = line.name || "Unknown";

  // JSON-driven avatar
  div.dataset.avatar = line.avatar
    ? `data/Images/${line.avatar}`
    : "data/Images/default.png";
  // Add speaker-specific color hints for the sentence bank
  if (div.dataset.speaker === "1") {
      div.classList.add("bank-left");
  } else {
      div.classList.add("bank-right");
  }

  // existing dynamic/static text creation...
  if (line.type === 'dynamic') {
    const span = document.createElement('span');
    span.className = 'dynamic';
    span.textContent = '____';
    span.ondblclick = () => editWord(span);

    const parts = line.text.split('____');
    div.append(parts[0] || '', span, parts[1] || '');
  } else {
    div.textContent = line.text;
  }

  div.addEventListener("dragstart", handleDragStart);
  div.addEventListener("dragend", handleDragEnd);

  return div;
}

function applyBubbleWithAvatar(div) {
  // If we've already converted this div once, don't do it again
  if (div.querySelector('.bubble-content')) return;

  const speaker = div.dataset.speaker;
  const avatarSrc = div.dataset.avatar;

  // Create avatar image (optional: only if avatarSrc exists)
  let avatar = null;
  if (avatarSrc) {
    avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = avatarSrc;
  }

  // Wrap existing children (text + dynamic spans) into bubble-content
  const bubble = document.createElement('div');
  bubble.className = 'bubble-content';

  const nodes = Array.from(div.childNodes);
  nodes.forEach(n => bubble.appendChild(n)); // moves nodes, keeps events like ondblclick

  // Clear the original div and rebuild layout
  div.innerHTML = "";

  if (speaker === "1") {
    // left side speaker
    div.classList.add('left-bubble');
    div.classList.remove('right-bubble');

    if (avatar) div.appendChild(avatar);  // [avatar][bubble]
    div.appendChild(bubble);
  } else {
    // right side speaker
    div.classList.add('right-bubble');
    div.classList.remove('left-bubble');

    div.appendChild(bubble);              // [bubble][avatar]
    if (avatar) div.appendChild(avatar);
  }
}


let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  e.dataTransfer.effectAllowed = "move";
  this.classList.add("dragging");
}

function handleDragEnd(e) {
  this.classList.remove("dragging");
  draggedElement = null;
}

function handleDrop(e) {
  e.preventDefault();
  if (!draggedElement) return;

  draggedElement.classList.remove(
    "chat-left", "chat-right",
    "chat-neutral"
  );

  if (draggedElement.dataset.speaker === "neutral") {
    draggedElement.classList.add("bank-neutral");
  }

  // Move element
  this.appendChild(draggedElement);

  // Remove absolute/old positioning
  draggedElement.style.position = "relative";
  draggedElement.style.left = "0";
  draggedElement.style.top = "0";
  draggedElement.classList.remove("bank-left", "bank-right");


  // Only apply alignment in workspace-left
  //if (this.id === "workspace-left") {
  //  applyBubbleWithAvatar(draggedElement);
  //}

  // In the sentence bank → always neutral
  // In the sentence bank → restore bank formatting
  if (this.id === "sentence-bank") {

    // Remove ALL row/chat/bank styling
    draggedElement.classList.remove(
        "left-bubble",
        "right-bubble",
        "chat-left",
        "chat-right",
        "chat-neutral",
        "bank-left",
        "bank-right",
        "bank-neutral"
    );

    // Remove avatar if exists
    const avatar = draggedElement.querySelector(".avatar");
    if (avatar) avatar.remove();

    // Unwrap bubble-content if it exists
    const bubbleContent = draggedElement.querySelector(".bubble-content");
    if (bubbleContent) {
        const children = Array.from(bubbleContent.childNodes);
        draggedElement.innerHTML = "";
        children.forEach(child => draggedElement.appendChild(child));
    }

    // Apply correct BANK color
    const speaker = draggedElement.dataset.speaker;

    if (speaker === "neutral") {
        // Always grey in bank
        draggedElement.classList.add("bank-neutral");
    } else if (speaker === "1") {
        draggedElement.classList.add("bank-left");
    } else {
        draggedElement.classList.add("bank-right");
    }

    return; // stop further processing
}


}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createBlankRow() {
    const row = document.createElement('div');
    row.className = 'conversation-row';

    const slot = document.createElement('div');
    slot.className = 'conversation-slot dotted';
    slot.dataset.empty = "true";
    
    // Make it a drop target
    slot.addEventListener("dragover", e => e.preventDefault());
    slot.addEventListener("drop", handleRowDrop);

    row.appendChild(slot);

    document.getElementById("workspace-left").appendChild(row);
}

function handleRowDrop(e) {
    e.preventDefault();
    e.stopPropagation(); //stop 
    if (!draggedElement) return;

    const slot = this;

    // If this is the first time something is dropped into this row:
    if (slot.dataset.empty === "true") {
        
        slot.classList.remove("dotted");
        slot.dataset.empty = "false";
        slot.classList.add("filled");

        // Create avatar + message-group
        const speaker = draggedElement.dataset.speaker;
        
        //slot.dataset.speaker = speaker;

        // Neutral first = row not decided yet
        slot.dataset.speaker = (speaker === "neutral") ? "unset" : speaker;

        const avatarSrc = draggedElement.dataset.avatar;

        const rowContainer = document.createElement('div');
        if (speaker === "1") {
            rowContainer.className = "row-left";
        } else if (speaker === "2") {
            rowContainer.className = "row-right";
        } else {
            // Neutral should not force left or right yet
            // It should visually behave like a neutral row
            rowContainer.className = "row-neutral";
        }

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = avatarSrc;

        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';

        slot.innerHTML = ""; // Clear dotted slot
        if (speaker === "1") {
            rowContainer.appendChild(avatar);
            rowContainer.appendChild(messageGroup);
        } else {
            rowContainer.appendChild(messageGroup);
            rowContainer.appendChild(avatar);
        }

        slot.appendChild(rowContainer);

        // Add the first bubble
        messageGroup.appendChild(draggedElement);
        draggedElement.classList.remove("bank-left", "bank-right", "chat-left", "chat-right");

        if (speaker === "neutral") {
            draggedElement.classList.add("chat-neutral");
        } else {
            draggedElement.classList.add(
                speaker === "1" ? "chat-left" : "chat-right"
            );
        }

        // Create next new dotted row
        createBlankRow();

    } else {
      let rowSpeaker = slot.dataset.speaker;
      let bubbleSpeaker = draggedElement.dataset.speaker;

      // CASE A — row is unset AND bubble is real-speaker → lock row
      if (rowSpeaker === "unset" && bubbleSpeaker !== "neutral") {
          slot.dataset.speaker = bubbleSpeaker; // lock row
          rowSpeaker = bubbleSpeaker;
      }

      // CASE B — row has a speaker and bubble is real-speaker but wrong side → reject
      if (bubbleSpeaker !== "neutral" && rowSpeaker !== "unset" && bubbleSpeaker !== rowSpeaker) {
          const bank = document.getElementById("sentence-bank");
          bank.appendChild(draggedElement);
          return;
      }

      // === ACCEPTED CASES ===
      // bubbleSpeaker === rowSpeaker OR bubbleSpeaker is neutral OR row was unset

      const group = slot.querySelector(".message-group");

      // Remove bank styling
      draggedElement.classList.remove(
        "bank-left", "bank-right",
        "chat-left", "chat-right",
        "chat-neutral",
        "bank-neutral"
      );

      // ⭐ NEUTRAL bubbles always stay neutral, regardless of rowSpeaker
      if (draggedElement.dataset.speaker === "neutral") {
          draggedElement.classList.remove("chat-left", "chat-right");
          draggedElement.classList.add("chat-neutral");
      } else {
          // Apply chat-left/right only for real speakers
          if (rowSpeaker === "1") {
              draggedElement.classList.add("chat-left");
              draggedElement.classList.remove("chat-right");
          } else if (rowSpeaker === "2") {
              draggedElement.classList.add("chat-right");
              draggedElement.classList.remove("chat-left");
          }
      }


    group.appendChild(draggedElement);
    }
}


function showDialogue() {
  enterActivityMode();
  
  const left = document.getElementById("workspace-left");
  const bank = document.getElementById("sentence-bank");

  // Clear previous content
  left.innerHTML = "";
  bank.innerHTML = "";

  // Create first blank row BEFORE loading sentences
  createBlankRow();

  const entry = data.find(
    d => d.unit === currentUnit && d.activity === currentActivity
  );

  // Compute previous activities within this unit
  previousActivities = data.filter(d =>
      d.unit === currentUnit && d.activity < currentActivity
  );

  originalLines = JSON.parse(JSON.stringify(entry.lines));

  // shuffle a copy so originalLines stays correct
  const shuffled = shuffleArray([...entry.lines]);

  // fill right column with draggable sentences in random order
  shuffled.forEach(line => {
    const div = createSentenceDiv(line);
    bank.appendChild(div);
  });

  // Remove old badge (if any)
  const oldTrash = document.getElementById("trash-badge");
  if (oldTrash) oldTrash.remove();

  // Create new badge
  const trash = document.createElement("div");
  trash.id = "trash-badge";
  trash.innerHTML = '<span class="material-icons">delete</span>';

  bank.appendChild(trash);

  // Enable drag-drop on trash badge
  trash.addEventListener("dragover", e => {
      e.preventDefault();
      e.stopPropagation();   // ⭐ IMPORTANT
  });

  trash.addEventListener("drop", e => {
      e.preventDefault();
      e.stopPropagation();   // ⭐ IMPORTANT
      handleTrashDrop(e);
  });
}

function showActivityButtons(show) {
  document.getElementById("btn-save").style.display = show ? "inline-block" : "none";
  document.getElementById("btn-reset").style.display = show ? "inline-block" : "none";
  document.getElementById("btn-prev-activities").style.display = show ? "inline-block" : "none";

}

function editWord(el){
  const newWord=prompt("Enter your word:");
  if(newWord) el.textContent=newWord;
}

function handleTrashDrop(e) {
    if (!draggedElement) return;

    // Only delete neutral bubbles
    if (draggedElement.dataset.speaker === "neutral") {
        draggedElement.remove();
    } else {
        // Put speaker bubbles back into bank
        document.getElementById("sentence-bank").appendChild(draggedElement);
    }
}



function saveScene() {
  const studentName = prompt("Enter your name:");
  if (!studentName) return;

  const today = new Date();
  const dateStr = today.toISOString().slice(0,10).replace(/-/g,"");

  const filename = `${dateStr}_${studentName}_${currentSet}_U${currentUnit}_A${currentActivity}`;

  // Screenshot the ACTIVITY AREA (top 90%)
  html2canvas(document.getElementById('activity-container')).then(canvas => {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });

  // CSV Export (optional if you're using it)
  const lines = [...document.querySelectorAll('.dialogue')].map(el => el.innerText);
  const csv = lines.map(l => `"${l.replace(/"/g, '""')}"`).join("\n");
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
}

function openPreviousActivitiesPopup() {
    const prevActivities = document.getElementById("prev-activities-popup");
    const list = document.getElementById("activities-popup-list");
    list.innerHTML = "";

    if (previousActivities.length === 0) {
        list.innerHTML = "<p>No previous activities available.</p>";
    } else {
        previousActivities.forEach(act => {
            const header = document.createElement("h4");
            header.textContent = `Activity ${act.activity}`;
            list.appendChild(header);

            act.lines.forEach(line => {
                const option = document.createElement("div");
                option.className = "prev-option";
                option.textContent = line.text; // display only sentence text

                option.onclick = () => {
                  const newBubble = createSentenceDiv(line);

                  // OVERRIDE speaker → make this a neutral bubble
                  newBubble.dataset.speaker = "neutral";

                  // Remove any coloring from old side
                  newBubble.classList.remove("bank-left", "bank-right");

                  // Apply a neutral style for sentence bank
                  newBubble.classList.add("bank-neutral");

                  document.getElementById("sentence-bank").appendChild(newBubble);

                  closePreviousActivitiesPopup();
                };

                list.appendChild(option);
            });
        });
    }

    prevActivities.classList.remove("hidden");
}

function closePreviousActivitiesPopup() {
  const popup = document.getElementById("prev-activities-popup");
  popup.classList.add("hidden");
}

function resetActivity() {
  const left = document.getElementById('workspace-left');
  const bank = document.getElementById('sentence-bank');

  left.innerHTML = "";
  bank.innerHTML = "";

  // Shuffle a copy of original lines
  const shuffled = shuffleArray([...originalLines]);

  // Repopulate sentence bank in new random order
  shuffled.forEach(line => {
    bank.appendChild(createSentenceDiv(line));
  });
  createBlankRow();
}

window.onload = () => {
  document.getElementById('btn-home').onclick = showMainMenu;
  document.getElementById('btn-reset').onclick = resetActivity;
  document.getElementById('btn-save').onclick = saveScene;
  document.getElementById("btn-prev-activities").onclick = openPreviousActivitiesPopup;
  document.getElementById('activities-popup-close').onclick = closePreviousActivitiesPopup;

  document.getElementById("prev-activities-popup").onclick = e => {
    if (e.target.id === "prev-activities-popup") {
        closePreviousActivitiesPopup();
    }
  };

  const left = document.getElementById("workspace-left");
  const bank = document.getElementById("sentence-bank");

  bank.addEventListener("dragover", e => e.preventDefault());
  bank.addEventListener("drop", handleDrop);


  
  
  showMainMenu();

  };

