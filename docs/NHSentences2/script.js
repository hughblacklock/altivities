let currentSet = null;
let currentUnit = null;
let currentActivity = null;
let data = {};
let dragSrc = null;

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

  // Move element
  this.appendChild(draggedElement);

  // Remove absolute/old positioning
  draggedElement.style.position = "relative";
  draggedElement.style.left = "0";
  draggedElement.style.top = "0";
  draggedElement.classList.remove("bank-left", "bank-right");


  // Only apply alignment in workspace-left
  if (this.id === "workspace-left") {
    const speaker = draggedElement.dataset.speaker;

    if (speaker === "1") {
      draggedElement.classList.add("left-bubble");
      draggedElement.classList.remove("right-bubble");
    } else {
      draggedElement.classList.add("right-bubble");
      draggedElement.classList.remove("left-bubble");
    }
  }

  // In the sentence bank → always neutral
  if (this.id === "sentence-bank") {
    draggedElement.classList.remove("left-bubble");
    draggedElement.classList.remove("right-bubble");
  }
}


function showDialogue() {
  enterActivityMode();

  
  const left = document.getElementById("workspace-left");
  const bank = document.getElementById("sentence-bank");

  const entry = data.find(
    d => d.unit === currentUnit && d.activity === currentActivity
  );

  originalLines = JSON.parse(JSON.stringify(entry.lines));

  // fill right column with draggable sentences
  entry.lines.forEach(line => {
    const div = createSentenceDiv(line);
    bank.appendChild(div);
  });
}

function showActivityButtons(show) {
  document.getElementById("btn-save").style.display = show ? "inline-block" : "none";
  document.getElementById("btn-reset").style.display = show ? "inline-block" : "none";
}


function editWord(el){
  const newWord=prompt("Enter your word:");
  if(newWord) el.textContent=newWord;
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

function resetActivity() {
  const left = document.getElementById('workspace-left');
  const bank = document.getElementById('sentence-bank');

  left.innerHTML = "";
  bank.innerHTML = "";

  originalLines.forEach(line => {
    bank.appendChild(createSentenceDiv(line));
  });
}

window.onload = () => {
  document.getElementById('btn-home').onclick = showMainMenu;
  document.getElementById('btn-reset').onclick = resetActivity;
  document.getElementById('btn-save').onclick = saveScene;

  const left = document.getElementById("workspace-left");
  const bank = document.getElementById("sentence-bank");

  left.addEventListener("dragover", e => e.preventDefault());
  bank.addEventListener("dragover", e => e.preventDefault());

  left.addEventListener("drop", handleDrop);
  bank.addEventListener("drop", handleDrop);

  showMainMenu();
};
