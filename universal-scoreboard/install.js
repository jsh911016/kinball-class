let installPrompt=null;
const installButton=document.querySelector('#install-app');
const installHelp=document.querySelector('#install-help');
const offlineStatus=document.querySelector('#offline-status');
function installed(){installButton.hidden=window.matchMedia('(display-mode: standalone)').matches}
installed();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installButton.hidden=false});
window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.hidden=true;installHelp.close();toast('앱이 설치되었어요. 홈 화면에서 실행하세요.')});
installButton.onclick=async()=>{if(!installPrompt){installHelp.showModal();return}const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice}catch{installHelp.showModal()}};
document.querySelector('#close-install').onclick=()=>installHelp.close();
if('serviceWorker'in navigator&&window.isSecureContext){
  navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineStatus.textContent='✓ 오프라인 사용 준비 완료'}).catch(()=>{offlineStatus.textContent='오프라인 준비 실패 · 인터넷 연결 후 다시 열어주세요'});
}else offlineStatus.textContent='앱 설치는 Chrome에서 HTTPS 주소로 열어주세요';
