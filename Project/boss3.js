// boss3.js
function simulateVictory() {
  document.getElementById('boss-hp-fill').style.width = '0%';
  document.getElementById('boss-hp-text').textContent = 'HP: 0';
  setTimeout(() => { document.getElementById('result-overlay').classList.remove('hidden'); }, 600);
}
function winAndReturn() {
  localStorage.setItem('boss3_defeated', 'true');
  if (localStorage.getItem('boss1_defeated')==='true' && localStorage.getItem('boss2_defeated')==='true' && localStorage.getItem('boss3_defeated')==='true') {
    sessionStorage.setItem('just_won_all','true');
  }
  window.location.href = 'index.html';
}
function goBack() { window.location.href = 'index.html'; }
