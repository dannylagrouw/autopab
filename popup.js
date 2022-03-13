console = chrome.extension.getBackgroundPage().console;
let rowElements; // TODO brr
let rows;

const F_STATUS = 0;
const F_ID = 2;
const F_DESC = 4;
const F_COLOR = 7;
const F_QUANTITY = 9;

function setError(msg) {
    document.getElementById('error').innerText = msg;
}

function handleContentResponse(response) {
    console.log('received: ' + response.content + ' for ' + response.index);
    rowElements[response.index].firstChild.innerText = response.content;
    rows[response.index + 1][F_STATUS] = response.content;
    chrome.storage.local.set({parts: rows});
    window.localStorage.setItem('nl.vollo.autopab.parts', JSON.stringify(rows));
    const next = document.querySelector('#parts table tr:nth-child(' + (response.index + 3) + ') td:nth-child(2) a');
    if (next) {
        console.log('buying next', next.innerHTML);
        next.click();
    } else {
        // done
    }
}

function createCell(index, text) {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.innerHTML = text;
    return cell;
}

function createRow(index, fields) {
    const row = document.createElement('tr');
    if (index === 0) {
        row.appendChild(createCell(index, 'Status'));
        row.appendChild(createCell(index, fields[F_ID]));
    } else {
        row.appendChild(createCell(index, fields[F_STATUS]));
        const link = createCell(index, '<a href="#">' + fields[F_ID] + '</a>');
        link.addEventListener('click', () => buy(fields[F_ID], fields[F_QUANTITY], index - 1));
        row.appendChild(link);
    }
    row.appendChild(createCell(index, fields[F_DESC]));
    row.appendChild(createCell(index, fields[F_COLOR]));
    row.appendChild(createCell(index, fields[F_QUANTITY]));
    return row;
}

document.removeEventListener('DOMContentLoaded', initialize2);

document.addEventListener('DOMContentLoaded', initialize2);

function initialize2(event) {
    console.log('initialize2', event);
    document.removeEventListener('DOMContentLoaded', initialize2);
}

function initialize() {
    const buyAllButton = document.getElementById('buyAll');
    const fileElement = document.getElementById("file_upload");

    console.log('initialize');

    const rows2 = window.localStorage.getItem('nl.vollo.autopab.parts');
    console.log('rows2', rows2);
    chrome.storage.local.get(['parts'], result => {
        console.log('got from storage', result);
        rows = result.parts;
        if (rows) {
            displayRows(rows);
        }
    });

    fileElement.addEventListener("change", (event) => {
        console.log('change detected', event);
        const file = fileElement.files[0];
        if (file.type === 'text/csv') {
            console.log(file.name);
            file.text().then((content) => {
                rows = initStatusFields(csvToArray(content));
                rows.length -= 4;
                chrome.storage.local.set({parts: rows});
                window.localStorage.setItem('nl.vollo.autopab.parts', JSON.stringify(rows));
                displayRows(rows);
            });
        } else {
            setError('Only CSV files supported, this is ' + file.type);
            document.getElementById('form').reset();
        }
    });

    buyAllButton.addEventListener('click', function() {
        buy('6328180', 3, 0);
    }, false);

    document.removeEventListener('DOMContentLoaded', initialize);
}

function buy(part, quantity, index) {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
        const tab = tabs[0];

        let listener;
        listener = function (tabId, updated) {
            if (tabId === tab.id && updated.status === 'complete') {
                console.log('tab status complete', updated.status, updated.url);
                chrome.tabs.query({currentWindow: true, active: true}, function (reloadeds) {
                    const reloaded = reloadeds[0];
                    console.log('sending buy', reloaded);
                    const sent = chrome.tabs.sendMessage(reloaded.id, {text: 'buy', quantity, index}, handleContentResponse);
                    console.log('sent', sent);
                    chrome.tabs.onUpdated.removeListener(listener);
                });
            }
        };

        chrome.tabs.onUpdated.addListener(listener);

        chrome.tabs.update(tab.id, { url: 'https://www.lego.com/nl-nl/page/static/pick-a-brick?query=' + part });
    });
}

function displayRows(rows) {
    const buyAllButton = document.getElementById('buyAll');
    const partsElement = document.getElementById('parts');

    rowElements = [];
    if (partsElement.firstChild) {
        partsElement.removeChild(partsElement.firstChild);
    }
    const table = document.createElement('table')
    rows.forEach((fields, index) => {
        const row = createRow(index, fields);
        table.appendChild(row);
        if (index > 0) {
            rowElements.push(row);
        }
    });
    partsElement.appendChild(table);
    buyAllButton.style.display = 'block';
}

function initStatusFields(rows) {
    return rows.map(row => ['new', ...row]);
}

function csvToArray(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
};
