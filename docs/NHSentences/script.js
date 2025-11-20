let currentSet = null;
let currentUnit = null;
let currentActivity = null;
let data = {};
let dragSrc = null;

async function loadData(set) {
  const res = await fetch(`data/${set}.json`);
  data = await res.json();
}

function showMainMenu() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <h1>NH Sentences</h1>
    <button id="btn-nh5">NH5</button>
    <button id="btn-nh6">NH6</button>
  `;
  document.getElementById("btn-nh5").onclick = () => { currentSet="nh5"; loadData("nh5").then(showUnits); };
  document.getElementById("btn-nh6").onclick = () => { currentSet="nh6"; loadData("nh6").then(showUnits); };
}

function showUnits() {
  const app = document.getElementById('app');
  app.innerHTML = `<h2>${currentSet.toUpperCase()} Units</h2>`;
  for (let i=1; i<=8; i++){
    const b=document.createElement('button');
    b.textContent=`Unit ${i}`;
    b.onclick=()=>{currentUnit=i;showActivities();};
    app.appendChild(b);
  }
  addReset();
}

function showActivities(){
  const app = document.getElementById('app');
  app.innerHTML=`<h2>Unit ${currentUnit}</h2>`;
  for (let i=1;i<=4;i++){
    const b=document.createElement('button');
    b.textContent=`Activity ${i}`;
    b.onclick=()=>{currentActivity=i;showDialogue();};
    app.appendChild(b);
  }
  addReset();
}

function showDialogue(){
  const app=document.getElementById('app');
  const entry=data.find(d=>d.unit===currentUnit&&d.activity===currentActivity);
  app.innerHTML=`<h2>${currentSet.toUpperCase()} Unit ${currentUnit} Activity ${currentActivity}</h2>`;

  const container = document.createElement('div');
  container.id = "dialogue-container";
  container.style.position = "relative";
  container.style.height = "70vh";
  container.style.border = "1px dashed #ccc";

  entry.lines.forEach((line, idx)=>{
    const div=document.createElement('div');
    div.className='dialogue';
    div.style.position = "absolute";
    div.style.left = `${50 + (Math.random()*400)}px`;
    div.style.top = `${50 + (Math.random()*300)}px`;
    div.style.width = "fit-content";

    if(line.type==='dynamic'){
      const span=document.createElement('span');
      span.className='dynamic';
      span.textContent='____';
      span.ondblclick=()=>editWord(span);
      const parts = line.text.split('____');
      div.append(parts[0] || '', span, parts[1] || '');
    } else {
      div.textContent=line.text;
    }

    makeDraggable(div);
    container.appendChild(div);
  });

  app.appendChild(container);
  addSave();
  addReset();
}


function makeDraggable(el){
  let offsetX, offsetY, isDown=false;

  el.addEventListener('mousedown', e=>{
    isDown=true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    el.style.zIndex = 10;
    el.style.cursor = "grabbing";
  });

  document.addEventListener('mousemove', e=>{
    if(!isDown) return;
    const rect = document.getElementById('dialogue-container').getBoundingClientRect();
    el.style.left = (e.clientX - rect.left - offsetX) + 'px';
    el.style.top  = (e.clientY - rect.top  - offsetY) + 'px';
  });

  document.addEventListener('mouseup', ()=>{
    isDown=false;
    el.style.cursor = "grab";
    el.style.zIndex = 1;
  });
}

// --- Drag and drop handlers ---
function handleDragStart(e){
  dragSrc = this;
  this.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e){
  e.stopPropagation();
  if (dragSrc !== this) {
    const container = this.parentNode;
    const nodes = Array.from(container.children);
    const srcIndex = nodes.indexOf(dragSrc);
    const targetIndex = nodes.indexOf(this);
    if (srcIndex < targetIndex) {
      container.insertBefore(dragSrc, this.nextSibling);
    } else {
      container.insertBefore(dragSrc, this);
    }
  }
  return false;
}

function handleDragEnd(){
  this.style.opacity = '1';
}
// --------------------------------

function editWord(el){
  const newWord=prompt("Enter your word:");
  if(newWord) el.textContent=newWord;
}

function addReset(){
  let btn=document.querySelector('.reset');
  if(btn) btn.remove();
  btn=document.createElement('button');
  btn.className='reset';
  btn.textContent='↩';
  btn.onclick=showMainMenu;
  document.body.appendChild(btn);
}

function addSave() {
  let btn = document.querySelector('.save');
  if (btn) btn.remove();
  btn = document.createElement('img');
  btn.className = 'save';
  btn.src = 'images/save.png';
  btn.alt = 'Save';
  btn.title = 'Save';
  btn.onclick = saveScene;
  document.getElementById('app').appendChild(btn);
}


function saveScene(){
  // Prompt for student name
  const studentName = prompt("Enter your name:");
  if(!studentName) return; // cancel if no name given

  // Build date string
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;

  // Common filename prefix
  const baseName = `${dateStr}_${studentName}_${currentSet}_U${currentUnit}_A${currentActivity}`;

  // Screenshot
  html2canvas(document.getElementById('app')).then(canvas=>{
    const link=document.createElement('a');
    link.download=`${baseName}.png`;
    link.href=canvas.toDataURL();
    link.click();
  });

  // CSV
  const lines=[...document.querySelectorAll('.dialogue')].map(el=>el.innerText);
  const csv=lines.map(l=>`"${l.replace(/"/g,'""')}"`).join("\n");
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${baseName}.csv`;
  a.click();
}


showMainMenu();
