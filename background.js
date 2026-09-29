// 동기화용으로 생성된 임시 탭 ID들을 보관하는 Set
const syncTabIds = new Set();

function syncQuotas() {
    const urls = [
        'https://gemini.google.com/usage',
        'https://one.google.com/ai/activity?utm_source=flow&utm_medium=web&utm_campaign=flow_ai_credits_page'
    ];

    urls.forEach((url) => {
        chrome.tabs.create({ url, active: false }, (tab) => {
            if (tab && tab.id) {
                syncTabIds.add(tab.id);

                // 네트워크 지연이나 SPA 렌더링 지연이 있더라도 최대 6초 뒤에는 무조건 탭 강제 정리
                setTimeout(() => {
                    if (syncTabIds.has(tab.id)) {
                        chrome.tabs.remove(tab.id, () => {
                            chrome.runtime.lastError; // 닫힌 탭 에러 무시
                        });
                        syncTabIds.delete(tab.id);
                    }
                }, 6000);
            }
        });
    });
}

// 30분 주기 알람 등록
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('periodicQuotaSync', { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodicQuotaSync') {
        syncQuotas();
    }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // 1. 수동 동기화 요청
    if (msg.action === 'startSync') {
        syncQuotas();
        sendResponse({ status: 'started' });
    }

    // 2. collector.js에서 데이터 수집 완료 보고 시
    if (msg.action === 'dataCollected' && sender.tab?.id) {
        const tabId = sender.tab.id;
        // 임시로 열었던 수집용 탭인 경우 즉시 닫기
        if (syncTabIds.has(tabId)) {
            setTimeout(() => {
                chrome.tabs.remove(tabId, () => {
                    chrome.runtime.lastError;
                });
                syncTabIds.delete(tabId);
            }, 500); // 데이터 반영 안전 시간 0.5초 대기 후 닫기
        }
    }
});