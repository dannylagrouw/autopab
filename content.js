(function () {
    function getQuantity() {
        return document.querySelector('input[data-test=pab-item-quantity]');
    }

    function getBuyBtn() {
        return document.querySelector('button[data-test=pab-item-btn-pick]');
    }

    function getPlusBtn() {
        return document.querySelector('button[data-test=quantity-increase-cta]');
    }

    function getLoggedInLink() {
        return document.querySelector('a[data-test=header-account-cta]');
    }

    function getNoResults() {
        return document.querySelector('div[data-test=no-search-results]')
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function clickPlus(iteration, times, sendResponse) {
        const plusBtn = getPlusBtn();
        if (plusBtn) {
            console.log('plus', times, 'times; plus button found on iteration', iteration);
            for (let i = 0; i < times; i++) {
                plusBtn.click();
            }
            await sleep(2000);
            if (!getQuantity()) {
                await sleep(2000);
            }
            sendResponse('bought ' + getQuantity().value);
        } else if (iteration < 40) {
            await sleep(300);
            await clickPlus(iteration + 1, times, sendResponse);
        } else {
            sendResponse('no plus button');
        }
    }

    async function clickBuy(iteration, quantity, sendResponse) {
        const buyBtn = getBuyBtn();
        const plusBtn = getPlusBtn();
        if (buyBtn) {
            console.log('buying; buy button found on iteration', iteration);
            buyBtn.click();
            if (quantity > 1) {
                await sleep(300);
                await clickPlus(1, quantity - 1, sendResponse);
            } else if (getQuantity()) {
                sendResponse('bought ' + getQuantity().value);
            } else {
                sendResponse('bought 1');
            }
        } else if (plusBtn) {
            await clickPlus(1, quantity, sendResponse);
        } else if (getNoResults() || iteration >= 20) {
            sendResponse('not found');
        } else {
            await sleep(300);
            await clickBuy(iteration + 1, quantity, sendResponse);
        }
    }

    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        console.log('got msg', msg);
        if (msg.text === 'buy') {
            clickBuy(1, msg.quantity, function (content) {
                console.log('>>sendResponse', content);
                sendResponse({content, index: msg.index, buyAll: msg.buyAll})
            });
        } else if (msg.text === 'loggedin') {
            sendResponse({loggedin: !!getLoggedInLink()});
        }
        return true;
    });
})();
