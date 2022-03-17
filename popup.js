console = chrome.extension.getBackgroundPage().console;
let rowElements; // TODO brr
let rows;

const F_STATUS = 0;
const F_BRICKLINK_ITEM_NO = 1;
const F_ID = 2;
const F_DESC = 4;
const F_BRICKLINK_COLOR_ID = 5;
const F_COLOR = 7;
const F_QUANTITY = 9;

function getProgress() {
    return document.getElementById('progress');
}

function getProgressBar() {
    return document.getElementById('progressBar');
}

function setError(msg) {
    const errorElement = document.getElementById('error');
    if (msg) {
        errorElement.style.display = 'initial';
        errorElement.innerText = msg;
    } else {
        errorElement.style.display = 'none';
    }
}

function buyNext(index) {
    if (index < rows.length) {
        const fields = rows[index];
        const status = fields[F_STATUS];
        if (fields[F_ID] === '') {
            console.log('no part no, trying next');
            buyNext(index + 1);
        } else if (status.startsWith('bought')) {
            console.log('already bought, trying next');
            buyNext(index + 1);
        } else {
            console.log('buying next', fields);
            buy(fields[F_ID], fields[F_QUANTITY], index, true);
        }
    } else {
        console.log('done');
        setTimeout(() => {
            getProgress().style.display = 'none';
        }, 5000);
    }
}

function handleContentResponse(response) {
    console.log('received:', response);
    getProgressBar().style.width = (response.index * 100 / (rows.length - 1)) + '%';
    rowElements[response.index].firstChild.innerText = response.content;
    rows[response.index][F_STATUS] = response.content;
    chrome.storage.local.set({parts: rows});
    if (response.buyAll) {
        buyNext(response.index + 1);
    }
}

function createCell(index, text) {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.innerHTML = text;
    return cell;
}

function createRow(index, fields) {
    const row = document.createElement('tr');
    if (index > 0) {
        if (index % 2 === 0) {
            row.classList.add('even');
        } else {
            row.classList.add('odd');
        }
    }
    row.dataset['index'] = index;
    if (index === 0) {
        row.appendChild(createCell(index, 'Status'));
        row.appendChild(createCell(index, fields[F_ID]));
    } else {
        row.appendChild(createCell(index, fields[F_STATUS]));
        const link = createCell(index, '<a href="#">' + fields[F_ID] + '</a>');
        link.addEventListener('click', () => {
            chrome.tabs.update({ url: 'https://www.lego.com/page/static/pick-a-brick?query=' + fields[F_ID] });
        });
        row.appendChild(link);
    }
    row.appendChild(createCell(index, fields[F_DESC]));
    row.appendChild(createCell(index, fields[F_COLOR]));
    row.appendChild(createCell(index, fields[F_QUANTITY]));
    if (index === 0 && rows.length > 1) {
        row.appendChild(createButton(index, 'Buy All', () => {
            getProgress().style.display = 'block';
            getProgressBar().style.width = '0';
            buy(rows[1][F_ID], rows[1][F_QUANTITY], 1, true);
        }));
    } else if (index !== 0 && fields[F_ID]) {
        row.appendChild(createButton(index, 'Buy', () => buy(fields[F_ID], fields[F_QUANTITY], index, false)));
    } else {
        row.appendChild(createButton(index, 'Search', () => {
            chrome.tabs.update({ url: 'https://www.lego.com/page/static/pick-a-brick?query=' + fields[F_DESC] });
        }));
    }
    return row;
}

function createButton(index, label, handler) {
    const btn = document.createElement('button');
    btn.innerHTML = label;
    btn.addEventListener('click', handler);
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.appendChild(btn);
    return cell;
}

function downloadRestXml() {
    const xml = '<INVENTORY>' +
        rows.filter((fields, index) => !fields[F_STATUS].startsWith('bought') && index > 0)
            .map(fields => `<ITEM><ITEMTYPE>P</ITEMTYPE><ITEMID>${fields[F_BRICKLINK_ITEM_NO]}</ITEMID><COLOR>${fields[F_BRICKLINK_COLOR_ID]}</COLOR><MINQTY>${fields[F_QUANTITY]}</MINQTY></ITEM>`)
            .join('\n') +
        '</INVENTORY>';
    const url = 'data:application/xml,' + xml;
    chrome.downloads.download({ url: url, filename: 'bricklink-wanted.xml', conflictAction: 'uniquify', saveAs: false });
}

function downloadRestCsv() {
    const xml = rows.filter(fields => !fields[F_STATUS].startsWith('bought'))
            .map(fields => fields.filter((field, index) => index > 0).map(field => field.indexOf(',') === -1 ? field : '"' + field + '"').join(','))
            .join('\n');
    const url = 'data:text/csv,' + xml;
    chrome.downloads.download({ url: url, filename: 'parts.csv', conflictAction: 'uniquify', saveAs: false });
}

document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
    const fileElement = document.getElementById("file_upload");
    console.log('initialize');

    chrome.storage.local.get(['parts'], result => {
        console.log('got from storage', result);
        rows = result.parts;
        if (rows) {
            displayRows(rows);
            document.getElementById('progressBar').style.width = (300 / (rows.length - 1)) + '%';
        }
    });

    fileElement.addEventListener("change", (event) => {
        console.log('change detected', event);
        const file = fileElement.files[0];
        if (file.type === 'text/csv') {
            setError();
            console.log(file.name);
            file.text().then((content) => {
                rows = initStatusFields(csvToArray(content));
                rows.length -= 4;
                chrome.storage.local.set({parts: rows});
                displayRows(rows);
            });
        } else {
            setError('Only CSV files supported, this is ' + file.type);
            document.getElementById('form').reset();
        }
    });

    document.getElementById('downloadRest').addEventListener('click', downloadRestXml);
    document.getElementById('downloadRestCsv').addEventListener('click', downloadRestCsv);

    document.removeEventListener('DOMContentLoaded', initialize);
}

function buy(part, quantity, index, buyAll) {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
        const tab = tabs[0];

        let listener;
        listener = function (tabId, updated) {
            if (tabId === tab.id && updated.status === 'complete') {
                console.log('tab status complete', updated.status, updated.url);
                chrome.tabs.query({currentWindow: true, active: true}, function (reloadeds) {
                    const reloaded = reloadeds[0];
                    console.log('sending buy', reloaded);
                    const sent = chrome.tabs.sendMessage(reloaded.id, {text: 'buy', quantity, index, buyAll}, handleContentResponse);
                    console.log('sent', sent);
                    chrome.tabs.onUpdated.removeListener(listener);
                });
            }
        };

        chrome.tabs.onUpdated.addListener(listener);

        chrome.tabs.update(tab.id, { url: 'https://www.lego.com/page/static/pick-a-brick?query=' + part });
    });
}

function displayRows(rows) {
    const partsElement = document.getElementById('parts');

    rowElements = [];
    if (partsElement.firstChild) {
        partsElement.removeChild(partsElement.firstChild);
    }
    const table = document.createElement('table');
    rows.forEach((fields, index) => {
        const row = createRow(index, fields);
        table.appendChild(row);
        rowElements.push(row);
    });
    partsElement.appendChild(table);
}

function initStatusFields(rows) {
    return rows.map(row => [row[F_ID - 1] === '' ? 'ignored' : 'new', ...row]);
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
