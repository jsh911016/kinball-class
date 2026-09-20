const COLORS={pink:['핑크','#f2a8cd','#39182b'],gray:['그레이','#aeb7c5','#202833'],black:['블랙','#252830','#ffffff'],white:['화이트','#f5f4ef','#24272c'],yellow:['옐로우','#f4dc77','#3e3413'],green:['그린','#b5df8a','#24351b'],blue:['블루','#99bdf6','#182d4d'],orange:['오렌지','#f6b47f','#422710'],purple:['퍼플','#c3aff0','#2f2248'],red:['레드','#f79595','#491d1d']};
const KEY='universal-scoreboard-v1';
const fresh=()=>({count:2,teams:['pink','blue','yellow','green'].map((color,i)=>({name:`${String.fromCharCode(65+i)}팀`,color,score:0})),duration:300,remaining:300,phase:'ready',endAt:null,sound:true});
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||![2,3,4].includes(s.count)||!Array.isArray(s.teams)||s.teams.length!==4||!s.teams.every(t=>typeof t.name==='string'&&COLORS[t.color]&&Number.isInteger(t.score)&&t.score>=0&&t.score<=9999)||!Number.isFinite(s.duration)||s.duration<1||s.duration>10859||!Number.isFinite(s.remaining)||s.remaining<0||s.remaining>s.duration||!['ready','running','paused','ended'].includes(s.phase)||(s.phase==='running'&&!Number.isFinite(s.endAt)))return fresh();return s}catch{return fresh()}}
let state=load(),history=[],audioContext,wakeLock;
const $=s=>document.querySelector(s);
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{toast('이 브라우저에서는 자동 저장을 사용할 수 없어요.')}}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toast.id);toast.id=setTimeout(()=>$('#toast').classList.remove('show'),2600)}
function unlockAudio(){try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume()}catch{}}
function announce(word){if(!state.sound)return;unlockAudio();try{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);osc.frequency.value=word==='Start'?740:440;gain.gain.setValueAtTime(.12,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.35);osc.start();osc.stop(audioContext.currentTime+.35)}catch{}if('speechSynthesis'in window){speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(word);speech.lang='en-US';speech.rate=.85;const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('en'));if(voice)speech.voice=voice;speechSynthesis.speak(speech)}else toast('영어 음성을 지원하지 않는 브라우저입니다. 알림음으로 안내해요.')}
async function keepAwake(){try{if(state.phase==='running'&&!wakeLock&&'wakeLock'in navigator){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null);if(state.phase!=='running')wakeLock.release()}}catch{}}
function releaseAwake(){if(wakeLock)wakeLock.release().catch(()=>{})}
function customColor(team){return /^#[0-9a-f]{6}$/i.test(team.customColor||'')?team.customColor:null}
function contrastInk(hex){const rgb=hex.slice(1).match(/../g).map(v=>{const n=parseInt(v,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#000000':'#ffffff'}
function renderTeams(){
  const root=$('#teams');root.replaceChildren();root.style.setProperty('--count',state.count);root.dataset.count=state.count;
  state.teams.slice(0,state.count).forEach((team,i)=>{
    const card=document.createElement('article');card.className='team';
    const paint=()=>{const color=customColor(team);card.style.setProperty('--color',color||COLORS[team.color][1]);card.style.setProperty('--ink',color?contrastInk(color):COLORS[team.color][2])};paint();
    card.innerHTML=`<div class="team-top"><span class="team-number">TEAM ${String(i+1).padStart(2,'0')}</span><select class="color-select" aria-label="${i+1}번 팀 색상"></select></div><label class="custom-color"><span>직접 색상 지정</span><input type="color" aria-label="${i+1}번 팀 직접 색상 지정"></label><input class="team-name" maxlength="16" aria-label="${i+1}번 팀 이름"><button class="score" aria-label="${i+1}번 팀 1점 추가"></button><div class="score-actions"><button aria-label="${i+1}번 팀 1점 빼기">−</button><button aria-label="${i+1}번 팀 1점 추가">+ 1</button></div>`;
    const select=card.querySelector('select');Object.entries(COLORS).forEach(([key,[name]])=>select.add(new Option('● '+name,key)));
    const customOption=new Option('직접 지정','custom');customOption.disabled=true;select.add(customOption);select.value=customColor(team)?'custom':team.color;
    select.onchange=()=>{team.color=select.value;delete team.customColor;save();renderTeams()};
    const picker=card.querySelector('[type="color"]');picker.value=customColor(team)||COLORS[team.color][1];
    picker.oninput=()=>{team.customColor=picker.value;select.value='custom';paint();save()};
    const input=card.querySelector('.team-name');input.value=team.name;input.onchange=()=>{team.name=input.value.trim()||`${String.fromCharCode(65+i)}팀`;input.value=team.name;save();renderStatus()};
    card.querySelector('.score').textContent=team.score;card.querySelector('.score').onclick=()=>score(i,1);
    const buttons=card.querySelectorAll('.score-actions button');buttons[0].onclick=()=>score(i,-1);buttons[0].disabled=team.score===0;buttons[1].onclick=()=>score(i,1);root.append(card)
  });renderStatus()
}
function renderStatus(){document.querySelectorAll('[data-count]').forEach(b=>{b.setAttribute('aria-pressed',Number(b.dataset.count)===state.count);b.disabled=state.phase==='running'||state.phase==='paused'});$('#undo').disabled=!history.length;$('#sound').textContent=state.sound?'♪ 소리 켬':'♪ 소리 끔';$('#sound').setAttribute('aria-pressed',Boolean(state.sound));const teams=state.teams.slice(0,state.count),max=Math.max(...teams.map(t=>t.score)),leaders=teams.filter(t=>t.score===max);$('#leader').textContent=max===0?'모든 팀이 준비됐어요':leaders.length===teams.length?'모든 팀 동점!':leaders.map(t=>t.name).join(' · ')+(leaders.length>1?' 공동 선두':' 선두')+` · ${max}점`;renderTimer()}
function renderTimer(){const n=state.remaining;$('#clock').textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;$('#clock').classList.toggle('urgent',n<=10&&state.phase!=='ready');$('#status').textContent={ready:'● 경기 준비',running:'● 경기 진행 중',paused:'Ⅱ 일시정지',ended:'■ 경기 종료'}[state.phase];$('#start').textContent={ready:'▶ 경기 시작',running:'Ⅱ 일시정지',paused:'▶ 이어하기',ended:'↺ 새 경기'}[state.phase];$('#finish').disabled=state.phase==='ready'||state.phase==='ended';document.querySelectorAll('.timer-settings button,.timer-settings input').forEach(el=>el.disabled=state.phase==='running'||state.phase==='paused')}
function score(i,delta){if(i>=state.count)return;if(state.phase==='ended')return toast('새 경기를 눌러 다음 경기를 시작하세요.');const t=state.teams[i],n=Math.max(0,Math.min(9999,t.score+delta));if(n===t.score)return;history.push(state.teams.map(t=>t.score));if(history.length>100)history.shift();t.score=n;save();renderTeams()}
function sync(){if(state.phase!=='running')return;state.remaining=Math.max(0,Math.ceil((state.endAt-Date.now())/1000));renderTimer();if(state.remaining===0)finish();}
function toggle(){unlockAudio();if(state.phase==='running'){sync();if(state.phase==='ended')return;state.phase='paused';state.endAt=null;releaseAwake()}else{if(state.phase==='ended')return $('#reset').click();if(state.phase==='ready')announce('Start');state.phase='running';state.endAt=Date.now()+state.remaining*1000;keepAwake()}save();renderStatus()}
function finish(){if(state.phase==='ended')return;state.phase='ended';state.endAt=null;save();releaseAwake();announce('Over');renderStatus();const teams=state.teams.slice(0,state.count),max=Math.max(...teams.map(t=>t.score)),winners=teams.filter(t=>t.score===max);$('#winner').textContent=winners.length===teams.length?'무승부!':winners.map(t=>t.name).join(' · ')+(winners.length>1?' 공동 우승!':' 승리!');$('#result-scores').replaceChildren();teams.forEach(t=>{const row=document.createElement('div'),name=document.createElement('span'),score=document.createElement('strong');name.textContent=t.name;score.textContent=`${t.score}점`;row.append(name,score);$('#result-scores').append(row)});if(!$('#result').open)$('#result').showModal()}
function setTime(n){if(['running','paused'].includes(state.phase))return;if(!Number.isInteger(n)||n<1||n>10859)return toast('경기 시간을 1초부터 180분 59초까지 입력하세요.');state.duration=n;state.remaining=n;state.phase='ready';state.endAt=null;$('#minutes').value=Math.floor(n/60);$('#seconds').value=n%60;save();renderStatus()}
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{if(['running','paused'].includes(state.phase))return;if(state.teams.some(t=>t.score)&&!confirm('팀 수를 변경하면 모든 점수가 초기화됩니다. 변경할까요?'))return;state.count=Number(b.dataset.count);state.teams.forEach(t=>t.score=0);history=[];state.phase='ready';state.remaining=state.duration;save();renderTeams()});
document.querySelectorAll('[data-minutes]').forEach(b=>b.onclick=()=>setTime(Number(b.dataset.minutes)*60));
function addTime(minutes){
  sync();
  if(state.phase==='ended')return toast('새 경기를 준비한 뒤 시간을 추가하세요.');
  const extra=minutes*60;
  if(state.duration+extra>10859)return toast('경기 시간은 최대 180분 59초까지 추가할 수 있어요.');
  state.duration+=extra;
  state.remaining+=extra;
  if(state.phase==='running')state.endAt+=extra*1000;
  $('#minutes').value=Math.floor(state.duration/60);
  $('#seconds').value=state.duration%60;
  save();renderTimer();toast(`${minutes}분을 추가했어요.`);
}
document.querySelectorAll('[data-add-minutes]').forEach(b=>b.onclick=()=>addTime(Number(b.dataset.addMinutes)));
$('#apply-time').onclick=()=>{const m=Number($('#minutes').value),s=Number($('#seconds').value);if(!Number.isInteger(m)||m<0||m>180||!Number.isInteger(s)||s<0||s>59)return toast('분은 0–180, 초는 0–59로 입력하세요.');setTime(m*60+s)};
$('#reset-time').onclick=()=>setTime(state.duration);$('#start').onclick=toggle;$('#finish').onclick=()=>{sync();if(state.phase!=='ended')finish()};
$('#sound').onclick=()=>{state.sound=!state.sound;unlockAudio();if(!state.sound&&'speechSynthesis'in window)speechSynthesis.cancel();save();renderStatus()};
$('#undo').onclick=()=>{if(!history.length)return;if(state.phase==='ended')return toast('종료된 경기의 점수는 변경할 수 없어요.');const previous=history.pop();state.teams.forEach((t,i)=>t.score=previous[i]);save();renderTeams()};
$('#reset').onclick=()=>{if((state.teams.some(t=>t.score)||['running','paused'].includes(state.phase))&&!confirm('점수와 타이머를 초기화하고 새 경기를 준비할까요?'))return;state.teams.forEach(t=>t.score=0);state.phase='ready';state.remaining=state.duration;state.endAt=null;history=[];releaseAwake();if('speechSynthesis'in window)speechSynthesis.cancel();save();renderTeams();toast('새 경기 준비 완료!')};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('이 브라우저에서는 전체화면을 지원하지 않아요.')}};
document.addEventListener('fullscreenchange',()=>$('#fullscreen').textContent=document.fullscreenElement?'⛶ 전체화면 종료':'⛶ 전체화면');
$('#close-result').onclick=()=>$('#result').close();
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,button')||$('#result').open)return;if(e.code==='Space'){e.preventDefault();toggle()}else if(/^[1-4]$/.test(e.key))score(Number(e.key)-1,1)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();keepAwake()}});
$('#minutes').value=Math.floor(state.duration/60);$('#seconds').value=state.duration%60;renderTeams();sync();if(state.phase==='running')keepAwake();setInterval(sync,200);

