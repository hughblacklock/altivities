let currentSet = null;
let currentUnit = null;
let currentActivity = null;
let data = {};
let dragSrc = null;
let previousActivities = [];

let insertMarker = null;

// Create or reuse a single insert marker
function getOrCreateInsertMarker() {
    if (!insertMarker) {
        insertMarker = document.createElement('div');
        insertMarker.className = 'insert-marker';
    }
    return insertMarker;
}

function clearInsertMarker() {
    if (insertMarker && insertMarker.parentElement) {
        insertMarker.parentElement.removeChild(insertMarker);
    }
}

// Decide where the marker should go inside a message-group
function updateInsertMarker(e, group) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedElement) return;

    const bubbles = Array.from(group.querySelectorAll('.dialogue'));

    const marker = getOrCreateInsertMarker();

    // If no bubbles yet, put marker at the start
    if (bubbles.length === 0) {
        group.appendChild(marker);
        return;
    }

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Find the closest bubble to the cursor (works with wrapping)
    let closest = null;
    let closestDist = Infinity;

    bubbles.forEach(b => {
        const rect = b.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mouseX - cx;
        const dy = mouseY - cy;
        const dist = dx*dx + dy*dy;
        if (dist < closestDist) {
            closestDist = dist;
            closest = b;
        }
    });

    if (!closest) {
        group.appendChild(marker);
        return;
    }

    const rect = closest.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;

    // Insert marker before or after the closest bubble
    if (mouseX < midX) {
        group.insertBefore(marker, closest);
    } else {
        if (closest.nextSibling) {
            group.insertBefore(marker, closest.nextSibling);
        } else {
            group.appendChild(marker);
        }
    }
}

function setupGroupReorder(messageGroup) {
    // Handle reordering and inserting into an existing row
    messageGroup.addEventListener('dragover', function(e) {
        if (!draggedElement) return;
        updateInsertMarker(e, messageGroup);
    });

    messageGroup.addEventListener('dragleave', function(e) {
        // If we leave the whole group, you *can* clear the marker,
        // but it's optional. Leaving it often feels nicer.
    });

    messageGroup.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedElement) return;

        const slot = messageGroup.closest('.conversation-slot');
        let rowSpeaker = slot.dataset.speaker || "unset";
        const bubbleSpeaker = draggedElement.dataset.speaker;

        // If row unset and bubble has real speaker → lock row
        if (rowSpeaker === "unset" && bubbleSpeaker !== "neutral") {
            rowSpeaker = bubbleSpeaker;
            slot.dataset.speaker = bubbleSpeaker;
        }

        // Reject conflicting speaker into the bank
        if (bubbleSpeaker !== "neutral" &&
            rowSpeaker !== "unset" &&
            bubbleSpeaker !== rowSpeaker) {

            const bank = document.getElementById("sentence-bank");
            bank.appendChild(draggedElement);
            clearInsertMarker();
            return;
        }

        // Reset classes
        draggedElement.classList.remove(
            "bank-left", "bank-right", "bank-neutral",
            "chat-left", "chat-right", "chat-neutral"
        );

        // Apply row styling
        if (bubbleSpeaker === "neutral") {
            draggedElement.classList.add("chat-neutral");
        } else if (rowSpeaker === "1") {
            draggedElement.classList.add("chat-left");
        } else if (rowSpeaker === "2") {
            draggedElement.classList.add("chat-right");
        }

        const marker = insertMarker;
        if (marker && marker.parentElement === messageGroup) {
            messageGroup.insertBefore(draggedElement, marker);
        } else {
            messageGroup.appendChild(draggedElement);
        }

        clearInsertMarker();
    });
}



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
    e.stopPropagation();
    if (!draggedElement) return;

    const slot = this;

    // ============================
    // FIRST TIME FILLING THIS ROW
    // ============================
    if (slot.dataset.empty === "true") {

        slot.classList.remove("dotted");
        slot.dataset.empty = "false";
        slot.classList.add("filled");

        const speaker = draggedElement.dataset.speaker;
        // Row inherits speaker UNLESS bubble is neutral
        slot.dataset.speaker = (speaker === "neutral") ? "unset" : speaker;
        let rowSpeaker = slot.dataset.speaker;

        const avatarSrc = draggedElement.dataset.avatar;

        const rowContainer = document.createElement('div');
        if (speaker === "1") {
            rowContainer.className = "row-left";
        } else if (speaker === "2") {
            rowContainer.className = "row-right";
        } else {
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

        // Attach reorder behaviour to this new group
        setupGroupReorder(messageGroup);

        // Style the first bubble
        draggedElement.classList.remove(
            "bank-left", "bank-right", "bank-neutral",
            "chat-left", "chat-right", "chat-neutral"
        );

        const bubbleSpeaker = draggedElement.dataset.speaker;
        if (bubbleSpeaker === "neutral") {
            draggedElement.classList.add("chat-neutral");
        } else if (rowSpeaker === "1") {
            draggedElement.classList.add("chat-left");
        } else if (rowSpeaker === "2") {
            draggedElement.classList.add("chat-right");
        }

        messageGroup.appendChild(draggedElement);

        // Spawn the next empty row below
        createBlankRow();
        return;
    }

    // ============================
    // EXISTING ROW (ALREADY FILLED)
    // Dropped on the slot background (not between bubbles)
    // → append at the end of this row
    // ============================

    const messageGroup = slot.querySelector(".message-group");
    if (!messageGroup) return;

    let rowSpeaker = slot.dataset.speaker || "unset";
    const bubbleSpeaker = draggedElement.dataset.speaker;

    // Row can lock to a real speaker if currently unset
    if (rowSpeaker === "unset" && bubbleSpeaker !== "neutral") {
        rowSpeaker = bubbleSpeaker;
        slot.dataset.speaker = bubbleSpeaker;
    }

    // Reject conflicting speaker into the bank
    if (bubbleSpeaker !== "neutral" &&
        rowSpeaker !== "unset" &&
        bubbleSpeaker !== rowSpeaker) {

        const bank = document.getElementById("sentence-bank");
        bank.appendChild(draggedElement);
        return;
    }

    // Move bubble into the group at the end
    draggedElement.classList.remove(
        "bank-left", "bank-right", "bank-neutral",
        "chat-left", "chat-right", "chat-neutral"
    );

    if (bubbleSpeaker === "neutral") {
        draggedElement.classList.add("chat-neutral");
    } else if (rowSpeaker === "1") {
        draggedElement.classList.add("chat-left");
    } else if (rowSpeaker === "2") {
        draggedElement.classList.add("chat-right");
    }

    messageGroup.appendChild(draggedElement);
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

function exportOrderedCSV() {
    const rows = Array.from(document.querySelectorAll('.conversation-slot.filled'));

    const output = [];

    rows.forEach((slot, rowIndex) => {
        const group = slot.querySelector('.message-group');
        if (!group) return;

        const bubbles = Array.from(group.querySelectorAll('.dialogue'));

        bubbles.forEach((bubble, bubbleIndex) => {
            const speaker = bubble.dataset.speaker || "";
            const text = bubble.innerText.trim().replace(/\s+/g, " ");

            output.push({
                row: rowIndex + 1,
                order: bubbleIndex + 1,
                speaker,
                text
            });
        });
    });

    // Convert to CSV
    let csv = `"Row","Order","Speaker","Text"\n`;
    output.forEach(row => {
        csv += `"${row.row}","${row.order}","${row.speaker}","${row.text.replace(/"/g, '""')}"\n`;
    });

    return csv;
}



async function saveScene() {
    const studentName = prompt("Enter your name:");
    if (!studentName) return;

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const filename = `${dateStr}_${studentName}_${currentSet}_U${currentUnit}_A${currentActivity}`;
    const workspace = document.getElementById("workspace-left");

    // -------------------------------------------------------
    // 1. CREATE TEMPORARY METADATA HEADER (normal flow)
    // -------------------------------------------------------
    const meta = document.createElement("div");
    meta.id = "screenshot-meta";
    meta.style.width = "100%";
    meta.style.padding = "6px 12px";
    meta.style.background = "#ffffff";
    meta.style.fontWeight = "bold";
    meta.style.fontSize = "16px";
    meta.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    meta.style.marginBottom = "10px";

    meta.textContent = `${studentName} – ${currentSet.toUpperCase()} U${currentUnit} A${currentActivity}`;
    workspace.prepend(meta);

    // -------------------------------------------------------
    // 2. TAKE A HIGH-RES SCREENSHOT OF WORKSPACE ONLY
    // -------------------------------------------------------
    const canvas = await html2canvas(workspace, {
        scale: 2,
        backgroundColor: "#ffffff"
    });

    meta.remove(); // Restore layout

    // Convert screenshot to JPEG for PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.9);

    // -------------------------------------------------------
    // 3. EXTRACT ORDERED TRANSCRIPT DATA
    // -------------------------------------------------------
    const rows = Array.from(document.querySelectorAll('.conversation-slot.filled'));
    const transcript = [];

    rows.forEach((slot, rowIndex) => {
        const group = slot.querySelector('.message-group');
        if (!group) return;

        const bubbles = Array.from(group.querySelectorAll('.dialogue'));
        const rowSpeaker = slot.dataset.speaker || "neutral";

        bubbles.forEach((bubble, bubbleIndex) => {
            transcript.push({
                row: rowIndex + 1,
                order: bubbleIndex + 1,
                speaker: bubble.dataset.speaker || "neutral",
                text: bubble.innerText.trim().replace(/\s+/g, " ")
            });
        });
    });

    // -------------------------------------------------------
    // 4. CREATE PDF (3 pages)
    // -------------------------------------------------------
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        unit: "pt",
        format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();

    // =======================================================
    // PAGE 1 — Screenshot Page
    // =======================================================
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);

    pdf.text(`Student: ${studentName}`, 40, 40);
    pdf.text(`Activity: ${currentSet.toUpperCase()} – Unit ${currentUnit} – Activity ${currentActivity}`, 40, 65);
    pdf.text(`Date: ${today.toLocaleDateString()}`, 40, 90);

    pdf.setLineWidth(1);
    pdf.line(40, 105, pageWidth - 40, 105);

    pdf.setFontSize(18);
    pdf.text("STUDENT DIALOGUE ARRANGEMENT", 40, 140);

    // Fit screenshot to page width
    const imgWidth = pageWidth - 80;
    const aspect = canvas.height / canvas.width;
    const imgHeight = imgWidth * aspect;

    pdf.addImage(imgData, "JPEG", 40, 160, imgWidth, imgHeight);

    // =======================================================
    // PAGE 2 — Transcript Page
    // =======================================================
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("DIALOGUE TRANSCRIPT (ORDERED)", 40, 50);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    let y = 80;
    let currentRow = -1;

    transcript.forEach(item => {
        if (item.row !== currentRow) {
            currentRow = item.row;
            y += 20;
            pdf.setFont("helvetica", "bold");
            pdf.text(`Row ${item.row} — Speaker ${item.speaker}`, 40, y);
            y += 18;
            pdf.setFont("helvetica", "normal");
        }

        const textLine = `${item.order}. ${item.text}`;
        pdf.text(textLine, 60, y);
        y += 16;

        // Prevent overflow
        if (y > 760) {
            pdf.addPage();
            y = 50;
        }
    });

    // =======================================================
    // PAGE 3 — Summary & Rubric Page
    // =======================================================
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("SUMMARY & RUBRIC", 40, 50);

    const totalRows = rows.length;
    const totalBubbles = transcript.length;
    const totalDynamic = transcript.filter(t => t.text.includes("____") === false).length;

    pdf.setFontSize(14);
    pdf.text("Summary", 40, 90);

    pdf.setFontSize(12);
    pdf.text(`Total Rows: ${totalRows}`, 40, 120);
    pdf.text(`Total Bubbles Used: ${totalBubbles}`, 40, 140);
    pdf.text(`Dynamic blanks filled: ${totalDynamic}`, 40, 160);

    pdf.setFontSize(14);
    pdf.text("Rubric", 40, 210);

    pdf.setFontSize(12);
    pdf.text("□ Correct order of lines", 40, 240);
    pdf.text("□ Correct speaker assignment", 40, 260);
    pdf.text("□ Correct content in blanks", 40, 280);
    pdf.text("□ Used full sentences", 40, 300);

    pdf.setFontSize(14);
    pdf.text("Teacher Notes:", 40, 350);

    pdf.setLineWidth(0.5);
    pdf.rect(40, 370, pageWidth - 80, 200);

    // -------------------------------------------------------
    // 5. SAVE PDF
    // -------------------------------------------------------
    pdf.save(`${filename}.pdf`);
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

