const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "studysphere-data-v1";
const defaultData = { tasks: [], plans: [], notes: [], sessions: 0 };
let data;
try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultData); }
catch { data = structuredClone(defaultData); }
let currentFilter = "all";
let timerSeconds = 25 * 60, timerInterval = null, selectedMinutes = 25;

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); renderAll(); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }
function dateLabel() { $("todayDate").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"}); }

function showPage(name) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(name+"Page").classList.add("active");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  const labels={dashboard:"Dashboard",tasks:"My Tasks",planner:"Study Planner",notes:"My Notes",timer:"Focus Timer"};
  $("pageTitle").textContent=labels[name]; $("sidebar").classList.remove("open");
}
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
$("menuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));

$("taskForm").addEventListener("submit",e=>{
  e.preventDefault(); const title=$("taskInput").value.trim(); if(!title)return;
  data.tasks.unshift({id:Date.now(),title,priority:$("taskPriority").value,done:false});
  $("taskInput").value=""; save(); toast("Task added!");
});
function renderTasks(){
  const filtered=data.tasks.filter(t=>currentFilter==="all"||(currentFilter==="active"?!t.done:t.done));
  $("taskCountLabel").textContent=`${filtered.length} ${currentFilter==="all"?"tasks":currentFilter+" tasks"}`;
  $("taskList").innerHTML=filtered.length?filtered.map(t=>`<div class="task-item ${t.done?"completed":""}"><input type="checkbox" data-toggle="${t.id}" ${t.done?"checked":""} aria-label="Mark task complete"><span class="task-name">${escapeHTML(t.title)}</span><span class="priority ${t.priority}">${t.priority}</span><button class="delete-btn" data-delete-task="${t.id}" aria-label="Delete task">×</button></div>`).join(""):`<div class="empty-state">No tasks here yet. Add a task above to get started ✦</div>`;
  document.querySelectorAll("[data-toggle]").forEach(el=>el.addEventListener("change",()=>{const t=data.tasks.find(x=>x.id===Number(el.dataset.toggle));if(t){t.done=el.checked;save();}}));
  document.querySelectorAll("[data-delete-task]").forEach(el=>el.addEventListener("click",()=>{data.tasks=data.tasks.filter(t=>t.id!==Number(el.dataset.deleteTask));save();toast("Task deleted");}));
}
document.querySelectorAll(".filter-btn").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.filter;document.querySelectorAll(".filter-btn").forEach(x=>x.classList.toggle("selected",x===b));renderTasks();}));
function renderDashboard(){
  const total=data.tasks.length,done=data.tasks.filter(t=>t.done).length,pct=total?Math.round(done/total*100):0;
  $("totalTasks").textContent=total;$("completedTasks").textContent=done;$("focusSessions").textContent=data.sessions;
  $("progressPercent").textContent=pct+"%";$("progressRing").style.background=`conic-gradient(var(--purple) ${pct}%,#eeeefa 0)`;
  $("progressCaption").textContent=total?`${done} of ${total} tasks completed`:"Add a task to get started!";
  const pending=data.tasks.filter(t=>!t.done).slice(0,4);
  $("dashboardTaskList").innerHTML=pending.length?pending.map(t=>`<div class="mini-task"><span>○</span><span>${escapeHTML(t.title)}</span><span class="priority ${t.priority}">${t.priority}</span></div>`).join(""):`<div class="empty-state">You're all caught up, or haven't added tasks yet.</div>`;
}
const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
$("planForm").addEventListener("submit",e=>{
  e.preventDefault();const subject=$("planSubject").value.trim();if(!subject)return;
  data.plans.push({id:Date.now(),day:$("planDay").value,subject,time:$("planTime").value});
  $("planSubject").value="";$("planTime").value="";save();toast("Study plan saved!");
});
function renderPlans(){
  $("plannerList").innerHTML=days.map(day=>{const items=data.plans.filter(p=>p.day===day).sort((a,b)=>a.time.localeCompare(b.time));
    return `<article class="day-card"><h3>${day}</h3>${items.length?items.map(p=>`<div class="plan-item"><span>${escapeHTML(p.subject)}</span><time>${p.time}</time><button data-delete-plan="${p.id}" aria-label="Delete plan">×</button></div>`).join(""):`<div class="empty-state">Nothing planned</div>`}</article>`;
  }).join("");
  document.querySelectorAll("[data-delete-plan]").forEach(b=>b.addEventListener("click",()=>{data.plans=data.plans.filter(p=>p.id!==Number(b.dataset.deletePlan));save();}));
}
$("noteForm").addEventListener("submit",e=>{
  e.preventDefault();const title=$("noteTitle").value.trim(),body=$("noteBody").value.trim();if(!title||!body)return;
  data.notes.unshift({id:Date.now(),title,body,created:new Date().toLocaleDateString()});$("noteTitle").value="";$("noteBody").value="";save();toast("Note saved!");
});
function renderNotes(){
  $("notesList").innerHTML=data.notes.length?data.notes.map(n=>`<article class="note-card"><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body)}</p><button data-delete-note="${n.id}">Delete · ${n.created}</button></article>`).join(""):`<div class="empty-state">Your saved notes will appear here.</div>`;
  document.querySelectorAll("[data-delete-note]").forEach(b=>b.addEventListener("click",()=>{data.notes=data.notes.filter(n=>n.id!==Number(b.dataset.deleteNote));save();}));
}
function renderAll(){renderTasks();renderPlans();renderNotes();renderDashboard();}
function updateTimer(){
  const m=Math.floor(timerSeconds/60),s=timerSeconds%60;
  const display=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  $("timerDisplay").textContent=display;
  const dashboardDisplay=$("dashboardTimerDisplay");
  if(dashboardDisplay) dashboardDisplay.textContent=display;
}
function stopTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}
document.querySelectorAll(".mode-btn").forEach(b=>b.addEventListener("click",()=>{stopTimer();document.querySelectorAll(".mode-btn").forEach(x=>x.classList.toggle("active",x===b));selectedMinutes=Number(b.dataset.minutes);timerSeconds=selectedMinutes*60;$("startTimer").textContent="Start "+(selectedMinutes===25?"focus":"break");$("timerStatus").textContent="Ready when you are";updateTimer();}));
$("startTimer").addEventListener("click",()=>{
  if(timerInterval){stopTimer();$("startTimer").textContent="Resume";return;}
  $("startTimer").textContent="Pause";$("timerStatus").textContent="Stay focused...";
  timerInterval=setInterval(()=>{timerSeconds--;updateTimer();if(timerSeconds<=0){stopTimer();$("timerStatus").textContent="Session complete!";$("startTimer").textContent="Start again";if(selectedMinutes===25){data.sessions++;save();}toast("Timer finished. Well done!");}},1000);
});
$("resetTimer").addEventListener("click",()=>{stopTimer();timerSeconds=selectedMinutes*60;$("startTimer").textContent="Start "+(selectedMinutes===25?"focus":"break");$("timerStatus").textContent="Ready when you are";updateTimer();});
dateLabel();renderAll();updateTimer();

// The dashboard shortcut controls the same focus timer as the Focus Timer page.
$("dashboardTimerButton").addEventListener("click",()=>{
  showPage("timer");
  if(!timerInterval) $("startTimer").click();
});
