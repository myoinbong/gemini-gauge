function collectData() {
    const text = document.body ? document.body.innerText : '';

    // 1. Gemini 사용량 수집
    if (location.hostname === 'gemini.google.com' && location.pathname.includes('/usage')) {
        if (!text.includes('현재 사용량')) return false;

        const curMatch = text.match(/현재\s*사용량[\s\S]*?(\d+%\s*사용됨|\d+%)/);
        const curReset = text.match(/(오[전후]\s*\d+:\d+에\s*초기화|\d+:\d+에\s*초기화)/);
        const weekMatch = text.match(/주간\s*한도[\s\S]*?(\d+%\s*사용됨|\d+%)/);
        const weekReset = text.match(/(\d+월\s*\d+일[^\n\r]*초기화)/);

        const updateObj = {};
        if (curMatch) updateObj.curVal = curMatch[1];
        if (curReset) updateObj.curReset = curReset[1];
        if (weekMatch) updateObj.weekVal = weekMatch[1];
        if (weekReset) updateObj.weekReset = weekReset[1];
        updateObj.updatedAt = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        chrome.storage.local.set(updateObj, () => {
            console.log('[Quota Collector] 제미나이 데이터 저장 성공:', updateObj);
        });
        return true;
    }

    // 2. Google Flow 크레딧 수집
    if (location.hostname === 'one.google.com') {
        if (!text.includes('Google Flow 크레딧')) return false;

        const flowMatch = text.match(/Google\s*Flow\s*크레딧\s*[\r\n\s]*([0-9,]+)/);
        const dailyMatch = text.match(/일일\s*Flow\s*크레딧이\s*([0-9,]+)\s*크레딧\s*남았습니다/);

        const updateObj = {};
        if (flowMatch) updateObj.flowCredit = flowMatch[1] + ' C';
        if (dailyMatch) updateObj.flowSub = `(일일 ${dailyMatch[1]} 남음)`;
        updateObj.updatedAt = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        chrome.storage.local.set(updateObj, () => {
            console.log('[Quota Collector] Flow 데이터 저장 성공:', updateObj);
        });
        return true;
    }
    return false;
}

// 렌더링 지연 대비 최대 8회 폴링
let attempts = 0;
const timer = setInterval(() => {
    attempts++;
    if (collectData() || attempts >= 8) {
        clearInterval(timer);
    }
}, 800);