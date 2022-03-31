chrome.runtime.onInstalled.addListener(() => {
    // default state goes here
    // this runs ONE TIME ONLY (unless the user reinstalls your extension)

    // chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    //     if (changeInfo.status === 'complete' && /^https:\/\/www.lego.com\//.test(tab.url)) {
    //         chrome.scripting.executeScript({
    //             target: { tabId: tabId },
    //             files: ["./content.js"]
    //         })
    //             .then(() => {
    //                 console.log("INJECTED THE CONTENT SCRIPT.");
    //             })
    //             .catch(err => console.log(err));
    //     }
    // });
});
