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

function clickPlus(iteration, times, sendResponse) {
    const plusBtn = getPlusBtn();
    if (plusBtn) {
        for (let i = 0; i < times; i++) {
            plusBtn.click();
        }
        sendResponse('bought ' + getQuantity().value);
    } else if (iteration < 10) {
        setTimeout(() => clickPlus(iteration + 1, times, sendResponse), 300);
    } else {
        sendResponse('no plus button');
    }
}

function clickBuy(iteration, quantity, sendResponse) {
    console.log('buying');
    const buyBtn = getBuyBtn();
    const plusBtn = getPlusBtn();
    console.log('buying', buyBtn);
    if (buyBtn) {
        buyBtn.click();
        if (quantity > 1) {
            setTimeout(() => {
                clickPlus(1, quantity - 1, sendResponse);
            }, 300);
        } else if (getQuantity()) {
            sendResponse('bought ' + getQuantity().value);
        } else {
            sendResponse('bought 1');
        }
    } else if (plusBtn) {
        clickPlus(1, quantity, sendResponse);
    } else if (iteration < 10) {
        setTimeout(() => clickBuy(iteration + 1, quantity, sendResponse), 300);
    } else {
        sendResponse('not found');
    }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    console.log('got msg', msg);
    if (msg.text === 'buy') {
        clickBuy(1, msg.quantity, function(content) { sendResponse({content, index: msg.index, buyAll: msg.buyAll}) });
    } else if (msg.text === 'loggedin') {
        sendResponse({loggedin: !!getLoggedInLink()});
    }
    return true;
});
