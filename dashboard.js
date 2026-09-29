function render() {
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(null, (data) => {
        if (!data) return;
        if (data.curVal) document.getElementById('curVal').textContent = data.curVal;
        if (data.curReset) document.getElementById('curReset').textContent = data.curReset;
        if (data.weekVal) document.getElementById('weekVal').textContent = data.weekVal;
        if (data.weekReset) document.getElementById('weekReset').textContent = data.weekReset;
        if (data.flowCredit) document.getElementById('flowCredit').textContent = data.flowCredit;
        if (data.flowSub) document.getElementById('flowSub').textContent = data.flowSub;
        if (data.updatedAt) document.getElementById('updatedAt').textContent = data.updatedAt + ' 기준';

        // 모드 셀렉트 값 동기화
        if (data.viewMode) {
            document.getElementById('modeSelect').value = data.viewMode;
        }

        const p = parseInt(data.curVal || '0', 10);
        document.getElementById('curVal').style.color = p >= 80 ? '#d93025' : '#1e8e3e';
    });
}

// 모드 변경 이벤트 바인딩
document.getElementById('modeSelect').addEventListener('change', (e) => {
    const mode = e.target.value;
    chrome.storage.local.set({ viewMode: mode });
});

// 즉시 창 분리(Pop-out) 버튼
document.getElementById('popoutBtn').addEventListener('click', () => {
    chrome.windows.create({
        url: chrome.runtime.getURL('dashboard.html'),
        type: 'popup',
        width: 340,
        height: 480
    });
    window.close(); // 현재 툴바 메뉴 닫기
});

render();
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(render);
}