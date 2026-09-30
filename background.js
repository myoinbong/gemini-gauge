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

                setTimeout(() => {
                    if (syncTabIds.has(tab.id)) {
                        chrome.tabs.remove(tab.id, () => {
                            chrome.runtime.lastError;
                        });
                        syncTabIds.delete(tab.id);
                    }
                }, 6000);
            }
        });
    });
}

// 1. 알람 보장 함수 (설치 시점뿐만 아니라 브라우저 시작 시에도 무조건 체크/생성)
function setupAlarm() {
    chrome.alarms.get('periodicQuotaSync', (alarm) => {
        if (!alarm) {
            chrome.alarms.create('periodicQuotaSync', {
                delayInMinutes: 1,      // 브라우저 켜지고 1분 뒤 첫 자동 동기화
                periodInMinutes: 30     // 이후 30분마다 반복
            });
            console.log('[Background] 자동 동기화 알람 등록 완료');
        }
    });
}

// 확장 프로그램 설치/업데이트 시 등록
chrome.runtime.onInstalled.addListener(() => {
    setupAlarm();
});

// 브라우저 최초 실행(시작) 시에도 알람 보장 및 초기 동기화 트리거
chrome.runtime.onStartup.addListener(() => {
    setupAlarm();
    syncQuotas(); // 브라우저 켜지면 즉시 최신화
});

// 알람 주기 트리거
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodicQuotaSync') {
        console.log('[Background] 30분 주기 자동 동기화 실행');
        syncQuotas();
    }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'startSync') {
        syncQuotas();
        sendResponse({ status: 'started' });
    }

    if (msg.action === 'dataCollected' && sender.tab?.id) {
        const tabId = sender.tab.id;
        if (syncTabIds.has(tabId)) {
            setTimeout(() => {
                chrome.tabs.remove(tabId, () => {
                    chrome.runtime.lastError;
                });
                syncTabIds.delete(tabId);
            }, 500);
        }
    }
});

// 서비스 워커 시작 시에도 알람 항상 확인
setupAlarm();