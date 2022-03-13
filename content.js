function clickPlus(iteration, times, sendResponse) {
    const plus = document.querySelector('button[data-test=quantity-increase-cta]');
    if (plus) {
        for (let i = 0; i < times; i++) {
            plus.click();
        }
        sendResponse('bought ' + (times + 1));
    } else if (iteration < 10) {
        setTimeout(() => clickPlus(iteration + 1, times, sendResponse), 300);
    } else {
        sendResponse('no plus button');
    }
}

function clickBuy(iteration, quantity, sendResponse) {
    console.log('buying');
    const btn = document.querySelector('button[data-test=pab-item-btn-pick]');
    console.log('buying', btn);
    if (btn) {
        btn.click();
        if (quantity > 1) {
            setTimeout(() => {
                clickPlus(1, quantity - 1, sendResponse);
            }, 300);
        } else {
            sendResponse('bought 1');
        }
    } else if (iteration < 10) {
        setTimeout(() => clickBuy(iteration + 1, quantity, sendResponse), 300);
    } else {
        sendResponse('no buy button');
    }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    console.log('got msg', msg);
    if (msg.text === 'buy') {
        clickBuy(1, msg.quantity, function(content) { sendResponse({content, index: msg.index}) });
    }
    return true;
});
