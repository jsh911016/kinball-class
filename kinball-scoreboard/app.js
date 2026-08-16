const TEAM_COLORS=['pink','black','gray'];
const defaultState={scores:[0,0,0],names:['핑크 팀','블랙 팀','그레이 팀'],seconds:600,sound:true,timerRunning:false,timerEndAt:null};
let state=load(),history=[],timerId=null,ruleTimerId=null,wakeLock=null;
const $=selector=>document.querySelector(selector);

function load(){try{return {...defaultState,...JSON.parse(localStorage.getItem('kinball-simple-scoreboard')||'{}')}}catch{return {...defaultState}}}
function save(){localStorage.setItem('kinball-simple-scoreboard',JSON.stringify(state))}
function remember(){history.push([...state.scores]);if(history.length>30)history.shift()}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(el.hideId);el.hideId=setTimeout(()=>el.classList.remove('show'),1800)}
function beep(frequency=650,duration=.08){if(!state.sound)return;try{const context=new AudioContext(),osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=frequency;osc.connect(gain);gain.connect(context.destination);gain.gain.setValueAtTime(.14,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);osc.start();osc.stop(context.currentTime+duration)}catch{}}

function render(){
  $('#teams').innerHTML=state.scores.map((score,index)=>`<article class="team ${TEAM_COLORS[index]}"><input class="team-name" data-name="${index}" value="${state.names[index]}" maxlength="12" aria-label="${index+1}번 팀 이름"><div class="score">${score}</div><div class="score-actions"><button class="add" data-add="${index}">+ 1 득점</button><button class="subtract" data-subtract="${index}">− 1</button><button class="foul" data-foul="${index}">파울</button></div></article>`).join('');
  document.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>changeScore(+button.dataset.add,1));
  document.querySelectorAll('[data-subtract]').forEach(button=>button.onclick=()=>changeScore(+button.dataset.subtract,-1));
  document.querySelectorAll('[data-foul]').forEach(button=>button.onclick=()=>foul(+button.dataset.foul));
  document.querySelectorAll('[data-name]').forEach(input=>input.onchange=()=>{state.names[+input.dataset.name]=input.value.trim()||defaultState.names[+input.dataset.name];save();render()});
  $('#soundToggle').textContent=state.sound?'🔊 소리 켬':'🔇 소리 끔';$('#soundToggle').setAttribute('aria-pressed',String(state.sound));
  renderTimer();
}
function changeScore(index,amount){if(amount<0&&state.scores[index]===0)return toast('점수는 0보다 낮출 수 없어요');remember();state.scores[index]+=amount;save();beep(amount>0?660:320);render()}
function foul(index){remember();state.scores=state.scores.map((score,i)=>i===index?score:score+1);save();beep(190,.18);render();toast(`${state.names[index]} 파울 · 나머지 두 팀 +1`)}
function renderTimer(){const minutes=Math.floor(state.seconds/60),seconds=state.seconds%60;$('#timer').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;$('#timerToggle').textContent=state.timerRunning?'일시정지':'시작'}
function syncTimer(){if(!state.timerRunning||!state.timerEndAt)return;state.seconds=Math.max(0,Math.ceil((state.timerEndAt-Date.now())/1000));renderTimer();if(state.seconds<=0)finishTimer();else if(state.seconds%5===0)save()}
async function requestWakeLock(){if(!('wakeLock'in navigator)||wakeLock)return;try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null)}catch{}}
async function releaseWakeLock(){if(!wakeLock)return;try{await wakeLock.release()}catch{}wakeLock=null}
function startTimer(){if(state.seconds<=0)state.seconds=600;state.timerRunning=true;state.timerEndAt=Date.now()+state.seconds*1000;save();syncTimer();clearInterval(timerId);timerId=setInterval(syncTimer,250);requestWakeLock()}
function pauseTimer(){syncTimer();state.timerRunning=false;state.timerEndAt=null;clearInterval(timerId);timerId=null;save();renderTimer();releaseWakeLock()}
function toggleTimer(){state.timerRunning?pauseTimer():startTimer()}
function finishTimer(){clearInterval(timerId);timerId=null;state.seconds=0;state.timerRunning=false;state.timerEndAt=null;save();renderTimer();releaseWakeLock();beep(900,.9);$('#timeUp').hidden=false;$('#closeTimeUp').focus()}
function startRuleTimer(total){clearInterval(ruleTimerId);let left=total;$('#ruleTimer').textContent=left;beep();ruleTimerId=setInterval(()=>{left--;$('#ruleTimer').textContent=left||'종료';if(left<=0){clearInterval(ruleTimerId);beep(900,.5)}else beep(430,.04)},1000)}

$('#timerToggle').onclick=toggleTimer;
$('#timerReset').onclick=()=>{pauseTimer();state.seconds=600;save();renderTimer()};
$('#minusMinute').onclick=()=>{state.seconds=Math.max(0,state.seconds-60);if(state.timerRunning)state.timerEndAt=Date.now()+state.seconds*1000;save();renderTimer()};
$('#plusMinute').onclick=()=>{state.seconds+=60;if(state.timerRunning)state.timerEndAt=Date.now()+state.seconds*1000;save();renderTimer()};
$('#soundToggle').onclick=()=>{state.sound=!state.sound;save();render()};
$('#undo').onclick=()=>{const previous=history.pop();if(!previous)return toast('되돌릴 기록이 없어요');state.scores=previous;save();render();toast('직전 점수로 되돌렸어요')};
$('#resetScores').onclick=()=>{if(!confirm('세 팀의 점수를 모두 0점으로 초기화할까요?'))return;remember();state.scores=[0,0,0];save();render()};
$('#fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{toast('전체화면을 사용할 수 없어요')}};
$('#closeTimeUp').onclick=()=>{$('#timeUp').hidden=true};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.timerRunning){syncTimer();requestWakeLock()}});
document.querySelectorAll('[data-countdown]').forEach(button=>button.onclick=()=>startRuleTimer(+button.dataset.countdown));
if(state.timerRunning&&state.timerEndAt){syncTimer();if(state.seconds>0){timerId=setInterval(syncTimer,250);requestWakeLock()}}
render();
