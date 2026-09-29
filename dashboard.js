function render() {
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(null, (data) => {
        if (!data) return;

        let accounts = data.accounts || {};
        const emailList = Object.keys(accounts);
        let currentEmail = data.activeEmail;

        if ((!currentEmail || !accounts[currentEmail]) && emailList.length > 0) {
            currentEmail = emailList[0];
        }

        const accountSelect = document.getElementById('accountSelect');
        if (accountSelect && document.activeElement !== accountSelect) {
            accountSelect.innerHTML = '';
            if (emailList.length === 0) {
                accountSelect.innerHTML = '<option value="">계정 확인 중...</option>';
            } else {
                emailList.forEach((email) => {
                    const opt = document.createElement('option');
                    opt.value = email;
                    opt.textContent = email;
                    if (email === currentEmail) opt.selected = true;
                    accountSelect.appendChild(opt);
                });
            }
        }

        const currentData = (currentEmail && accounts[currentEmail]) ? accounts[currentEmail] : {};
        const update = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = (text !== undefined && text !== null && text !== '') ? text : '-';
        };

        update('curVal', currentData.curVal);
        update('curReset', currentData.curReset);
        update('weekVal', currentData.weekVal);
        update('weekReset', currentData.weekReset);
        update('flowCredit', currentData.flowCredit);
        update('flowSub', currentData.flowSub);

        const timeEl = document.getElementById('updatedAt');
        if (timeEl) {
            timeEl.textContent = currentData.updatedAt ? `${currentData.updatedAt} 기준` : '-';
        }

        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect && data.viewMode) {
            modeSelect.value = data.viewMode;
        }

        const curValEl = document.getElementById('curVal');
        if (curValEl) {
            const p = parseInt(currentData.curVal || '0', 10);
            curValEl.style.color = p >= 80 ? '#d93025' : '#1e8e3e';
        }
    });
}

// 🔄 새로고침 버튼 바인딩
const btnSync = document.getElementById('btnSync');
if (btnSync) {
    btnSync.addEventListener('click', () => {
        btnSync.classList.add('rotating');
        chrome.runtime.sendMessage({ action: 'startSync' }, () => {
            // 2.5초 후 회전 중단
            setTimeout(() => {
                btnSync.classList.remove('rotating');
            }, 2500);
        });
    });
}

// 외부 사이트 열기 바인딩
document.getElementById('btnGemini')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://gemini.google.com' });
});

document.getElementById('btnFlow')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://flow.google.com' });
});

// 계정 선택 변경 시
const accountSelect = document.getElementById('accountSelect');
if (accountSelect) {
    accountSelect.addEventListener('change', (e) => {
        const selectedEmail = e.target.value;
        if (selectedEmail) {
            chrome.storage.local.set({ activeEmail: selectedEmail }, render);
        }
    });
}

// 뷰 모드 전환
const modeSelect = document.getElementById('modeSelect');
if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
        const targetMode = e.target.value;
        chrome.storage.local.set({ viewMode: targetMode }, () => {
            if (targetMode === 'window') {
                chrome.windows.create({
                    url: chrome.runtime.getURL('dashboard.html?window=true'),
                    type: 'popup',
                    width: 340,
                    height: 480
                });
                window.close();
            } else if (targetMode === 'menu') {
                if (window.location.search.includes('window')) {
                    window.close();
                }
            }
        });
    });
}

render();
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(render);
}