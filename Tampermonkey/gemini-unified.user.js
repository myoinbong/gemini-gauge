// ==UserScript==
// @name         Gemini & Flow Unified Quota Widget
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  제미나이 사용량 한도 및 구글 플로우 크레딧 통합 모니터링 위젯 (Trusted Types 완벽 우회)
// @author       You
// @match        https://gemini.google.com/*
// @match        https://one.google.com/ai/activity*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    /* 1. Google One Flow 페이지 캐싱 */
    if (window.location.hostname === 'one.google.com') {
        function captureFlowCredits() {
            const bodyText = document.body ? document.body.innerText : '';
            if (!bodyText.includes('Google Flow 크레딧')) return false;

            const flowMatch = bodyText.match(/Google\s*Flow\s*크레딧\s*[\r\n\s]*([0-9,]+)/);
            const dailyMatch = bodyText.match(/일일\s*Flow\s*크레딧이\s*([0-9,]+)\s*크레딧\s*남았습니다/);

            if (flowMatch) {
                const now = new Date();
                const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
                const flowData = {
                    flowCredit: flowMatch[1],
                    dailyCredit: dailyMatch ? dailyMatch[1] : null,
                    updatedAt: timeStr
                };
                GM_setValue('google_flow_cache', flowData);
                return true;
            }
            return false;
        }

        let count = 0;
        const flowTimer = setInterval(() => {
            count++;
            if (captureFlowCredits() || count > 10) clearInterval(flowTimer);
        }, 800);
        return;
    }

    /* 2. Gemini 페이지 위젯 표시 */
    GM_addStyle(`
        #spark-quota-widget {
            position: fixed !important;
            top: 75px !important;
            right: 25px !important;
            z-index: 2147483647 !important;
            background-color: #ffffff !important;
            border: 1px solid #dadce0 !important;
            border-radius: 12px !important;
            padding: 12px 14px !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            min-width: 195px !important;
            color: #202124 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 7px !important;
        }
        #spark-quota-widget .w-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f1f3f4;
            padding-bottom: 5px;
        }
        #spark-quota-widget .w-title {
            font-weight: 700;
            font-size: 12px;
            color: #1a73e8;
            cursor: pointer;
        }
        #spark-quota-widget .w-section {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        #spark-quota-widget .w-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
        }
        #spark-quota-widget .w-label-box {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        #spark-quota-widget .w-label {
            color: #3c4043;
            font-weight: 500;
        }
        #spark-quota-widget .w-value {
            font-weight: 700;
            color: #1e8e3e;
        }
        #spark-quota-widget .w-subtext {
            font-size: 10px;
            color: #70757a;
            text-align: right;
        }
        #spark-quota-widget .w-divider {
            height: 1px;
            background-color: #f1f3f4;
            margin: 1px 0;
        }
        #spark-quota-widget .w-badge {
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 4px;
            font-weight: 600;
        }
        #spark-quota-widget .badge-spark {
            background: #e8f0fe;
            color: #1a73e8;
        }
        #spark-quota-widget .badge-flow {
            background: #e6f4ea;
            color: #137333;
        }
    `);

    let curValEl, curResetEl, weekValEl, weekResetEl, flowCreditEl, flowSubEl;

    function createBadgeRow(badgeText, badgeClass, labelText, valueText, valColor) {
        const row = document.createElement('div');
        row.className = 'w-row';

        const labelBox = document.createElement('div');
        labelBox.className = 'w-label-box';

        const badge = document.createElement('span');
        badge.className = `w-badge ${badgeClass}`;
        badge.textContent = badgeText;

        const label = document.createElement('span');
        label.className = 'w-label';
        label.textContent = labelText;

        labelBox.appendChild(badge);
        labelBox.appendChild(label);

        const val = document.createElement('span');
        val.className = 'w-value';
        val.textContent = valueText;
        if (valColor) val.style.color = valColor;

        row.appendChild(labelBox);
        row.appendChild(val);
        return { row, val };
    }

    function buildUI() {
        if (document.getElementById('spark-quota-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'spark-quota-widget';

        // 헤더
        const header = document.createElement('div');
        header.className = 'w-header';

        const title = document.createElement('div');
        title.className = 'w-title';
        title.textContent = '⚡ AI 쿼터 및 크레딧';
        title.title = '클릭 시 제미나이 사용량 페이지로 이동';
        title.addEventListener('click', () => {
            window.location.href = 'https://gemini.google.com/usage';
        });

        header.appendChild(title);

        // 1. 현재 사용량
        const sec1 = document.createElement('div');
        sec1.className = 'w-section';
        const item1 = createBadgeRow('스파크', 'badge-spark', '현재 사용량', '-');
        curValEl = item1.val;
        curResetEl = document.createElement('span');
        curResetEl.className = 'w-subtext';
        sec1.appendChild(item1.row);
        sec1.appendChild(curResetEl);

        // 2. 주간 한도
        const sec2 = document.createElement('div');
        sec2.className = 'w-section';
        const item2 = createBadgeRow('스파크', 'badge-spark', '주간 한도', '-');
        weekValEl = item2.val;
        weekResetEl = document.createElement('span');
        weekResetEl.className = 'w-subtext';
        sec2.appendChild(item2.row);
        sec2.appendChild(weekResetEl);

        const div = document.createElement('div');
        div.className = 'w-divider';

        // 3. Flow 크레딧
        const sec3 = document.createElement('div');
        sec3.className = 'w-section';
        const item3 = createBadgeRow('Flow', 'badge-flow', '크레딧', '-', '#137333');
        flowCreditEl = item3.val;
        flowSubEl = document.createElement('span');
        flowSubEl.className = 'w-subtext';

        item3.row.style.cursor = 'pointer';
        item3.row.title = '클릭 시 Google One Flow 활동 페이지 열기';
        item3.row.addEventListener('click', () => {
            window.open('https://one.google.com/ai/activity?utm_source=flow', '_blank');
        });

        sec3.appendChild(item3.row);
        sec3.appendChild(flowSubEl);

        widget.appendChild(header);
        widget.appendChild(sec1);
        widget.appendChild(sec2);
        widget.appendChild(div);
        widget.appendChild(sec3);

        document.body.appendChild(widget);

        renderSavedData();
    }

    function renderSavedData() {
        // 제미나이 캐시 복원
        try {
            const raw = localStorage.getItem('gemini_quota_cache');
            if (raw) {
                const data = JSON.parse(raw);
                if (curValEl && data.curVal) {
                    curValEl.textContent = data.curVal;
                    const p = parseInt(data.curVal, 10);
                    curValEl.style.color = p >= 80 ? '#d93025' : '#1e8e3e';
                }
                if (curResetEl && data.curReset) curResetEl.textContent = data.curReset;
                if (weekValEl && data.weekVal) {
                    weekValEl.textContent = data.weekVal;
                    const p = parseInt(data.weekVal, 10);
                    weekValEl.style.color = p >= 80 ? '#d93025' : '#1e8e3e';
                }
                if (weekResetEl && data.weekReset) weekResetEl.textContent = data.weekReset;
            }
        } catch (e) { }

        // Flow 캐시 복원
        const flowData = GM_getValue('google_flow_cache', null);
        if (flowData && flowCreditEl) {
            flowCreditEl.textContent = flowData.flowCredit + ' C';
            if (flowSubEl) {
                const dailyText = flowData.dailyCredit ? `(일일 ${flowData.dailyCredit} 남음) ` : '';
                flowSubEl.textContent = `${dailyText}${flowData.updatedAt} 기준`;
            }
        } else if (flowCreditEl) {
            flowCreditEl.textContent = '미조회 (클릭)';
            flowCreditEl.style.cursor = 'pointer';
        }
    }

    function readGeminiPage() {
        if (!window.location.pathname.includes('/usage')) return;

        const text = document.body ? document.body.innerText : '';
        if (!text.includes('현재 사용량')) return;

        const currentPart = text.split('주간 한도')[0] || '';
        const curPct = currentPart.match(/(\d+%\s*사용됨|\d+%)/);
        const curRst = currentPart.match(/(오[전후]\s*\d+:\d+에\s*초기화|\d+:\d+에\s*초기화)/);

        const weeklyPart = text.split('주간 한도')[1] || '';
        const weekPct = weeklyPart.match(/(\d+%\s*사용됨|\d+%)/);
        const weekRst = weeklyPart.match(/(\d+월\s*\d+일[^\n\r]*초기화|오[전후]\s*\d+:\d+에\s*초기화)/);

        const cacheObj = {};

        if (curPct && curValEl) {
            curValEl.textContent = curPct[1];
            cacheObj.curVal = curPct[1];
            const p = parseInt(curPct[1], 10);
            curValEl.style.color = p >= 80 ? '#d93025' : '#1e8e3e';
        }
        if (curRst && curResetEl) {
            curResetEl.textContent = curRst[1];
            cacheObj.curReset = curRst[1];
        }
        if (weekPct && weekValEl) {
            weekValEl.textContent = weekPct[1];
            cacheObj.weekVal = weekPct[1];
            const p = parseInt(weekPct[1], 10);
            weekValEl.style.color = p >= 80 ? '#d93025' : '#1e8e3e';
        }
        if (weekRst && weekResetEl) {
            weekResetEl.textContent = weekRst[1].trim();
            cacheObj.weekReset = weekRst[1].trim();
        }

        if (cacheObj.curVal) {
            localStorage.setItem('gemini_quota_cache', JSON.stringify(cacheObj));
        }
    }

    setTimeout(buildUI, 500);

    if (window.location.pathname.includes('/usage')) {
        let attempts = 0;
        const scanTimer = setInterval(() => {
            attempts++;
            readGeminiPage();
            if (attempts >= 5) clearInterval(scanTimer);
        }, 1000);
    }
})();