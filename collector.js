function getGoogleEmail() {
    const candidates = document.querySelectorAll('a[aria-label*="@"], button[aria-label*="@"], a[href*="SignOutOptions"], [aria-label*="Google 계정"], [data-email]');
    for (const el of candidates) {
        const label = el.getAttribute('aria-label') || el.getAttribute('data-email') || '';
        const match = label.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) return match[0];

        const title = el.getAttribute('title') || el.innerText || '';
        const titleMatch = title.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (titleMatch) return titleMatch[0];
    }

    const html = document.documentElement.innerHTML;
    const rawMatch = html.match(/["']([a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))["']/);
    if (rawMatch && !rawMatch[1].includes('google.com') && !rawMatch[1].includes('example.com')) {
        return rawMatch[1];
    }
    return null;
}

function collectData() {
    const text = document.body ? document.body.innerText : '';
    const detectedEmail = getGoogleEmail();

    chrome.storage.local.get(['accounts', 'activeEmail'], (res) => {
        const accounts = res.accounts || {};
        const emailList = Object.keys(accounts);
        const targetEmail = detectedEmail || res.activeEmail || (emailList.length > 0 ? emailList[0] : '기본 계정');
        const accData = accounts[targetEmail] || {};

        let hasUpdate = false;
        const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        // 1. Gemini 수집
        if (location.hostname.includes('gemini.google.com') && location.pathname.includes('/usage')) {
            if (text.includes('현재 사용량')) {
                const curMatch = text.match(/현재\s*사용량[\s\S]*?(\d+%\s*사용됨|\d+%)/);
                const curReset = text.match(/(오[전후]\s*\d+:\d+에\s*초기화|\d+:\d+에\s*초기화)/);
                const weekMatch = text.match(/주간\s*한도[\s\S]*?(\d+%\s*사용됨|\d+%)/);
                const weekReset = text.match(/(\d+월\s*\d+일[^\n\r]*초기화)/);

                if (curMatch) accData.curVal = curMatch[1];
                if (curReset) accData.curReset = curReset[1];
                if (weekMatch) accData.weekVal = weekMatch[1];
                if (weekReset) accData.weekReset = weekReset[1];
                accData.updatedAt = nowTime;
                hasUpdate = true;
            }
        }

        // 2. Google Flow 수집 (one.google.com)
        if (location.hostname.includes('one.google.com')) {
            if (text.includes('Google Flow 크레딧') || text.includes('Flow 크레딧')) {
                const flowCardMatch = text.match(/Google\s*Flow\s*크레딧[\s\r\n]+([0-9]{1,3}(?:,[0-9]{3})*|\d+)(?![\s\S]*?매일)/)
                    || text.match(/Google\s*Flow\s*크레딧\s*[\r\n]+([0-9,]+)/);

                const dailyMatch = text.match(/일일\s*Flow\s*크레딧이\s*([0-9,]+)\s*크레딧\s*남았습니다/);

                let finalCredit = flowCardMatch ? flowCardMatch[1] : null;
                if (!finalCredit) {
                    const headers = Array.from(document.querySelectorAll('div, span, p')).filter(el => el.innerText?.trim() === 'Google Flow 크레딧');
                    for (const h of headers) {
                        const parent = h.parentElement;
                        const numMatch = parent?.innerText?.match(/([0-9]{1,3}(?:,[0-9]{3})+|\d{3,})/);
                        if (numMatch) {
                            finalCredit = numMatch[1];
                            break;
                        }
                    }
                }

                if (finalCredit) {
                    accData.flowCredit = finalCredit + ' C';
                    accData.flowSub = dailyMatch ? `(일일 ${dailyMatch[1]} 남음)` : '(일일 잔여 반영)';
                    accData.updatedAt = nowTime;
                    hasUpdate = true;
                }
            }
        }

        if (hasUpdate) {
            accounts[targetEmail] = accData;
            chrome.storage.local.set({
                accounts: accounts,
                activeEmail: targetEmail
            }, () => {
                console.log(`[Quota Collector] [${targetEmail}] 동기화 완료:`, accData);
                // 백그라운드 워커에 수집 완료 신호 발송 (임시 탭이면 워커가 자동 닫음)
                chrome.runtime.sendMessage({ action: 'dataCollected' });
            });
        }
    });

    return true;
}

let attempts = 0;
const timer = setInterval(() => {
    attempts++;
    if (collectData() || attempts >= 10) {
        clearInterval(timer);
    }
}, 800);