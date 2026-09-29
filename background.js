// 시작 시 또는 설치 시 저장된 모드 적용
function applyViewMode() {
    chrome.storage.local.get(['viewMode'], (res) => {
        const mode = res.viewMode || 'menu'; // 기본값: 툴바 메뉴형
        if (mode === 'menu') {
            chrome.action.setPopup({ popup: 'dashboard.html' });
        } else {
            chrome.action.setPopup({ popup: '' }); // 빈 문자열이어야 onClicked가 작동
        }
    });
}

chrome.runtime.onInstalled.addListener(applyViewMode);
chrome.runtime.onStartup.addListener(applyViewMode);

// 스토리지의 viewMode 값이 변경되면 즉시 반영
chrome.storage.onChanged.addListener((changes) => {
    if (changes.viewMode) {
        applyViewMode();
    }
});

// 'window' 모드일 때 아이콘 클릭 시 독립 창 띄우기
chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: chrome.runtime.getURL('dashboard.html'),
        type: 'popup',
        width: 340,
        height: 480
    });
});