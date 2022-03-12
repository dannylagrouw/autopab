console = chrome.extension.getBackgroundPage().console;

function setError(msg) {
    document.getElementById('error').innerText = msg;
}

function doStuffWithDom(content) {
    console.log('I received the following DOM content:\n' + content);
}

function createCell(index, text) {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.innerHTML = text;
    return cell;
}

function goToPart(part) {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
        const tab = tabs[0];
        chrome.tabs.update(tab.id, {url: 'https://www.lego.com/nl-nl/page/static/pick-a-brick?query=' + part});
    });
}

function createRow(index, fields) {
    const row = document.createElement('tr');
    if (index === 0) {
        row.appendChild(createCell(index, 'Status'));
        row.appendChild(createCell(index, fields[1]));
    } else {
        row.appendChild(createCell(index, '-'));
        const link = createCell(index, '<a href="#">' + fields[1] + '</a>');
        link.addEventListener('click', () => goToPart(fields[1]));
        row.appendChild(link);
    }
    row.appendChild(createCell(index, fields[3]));
    row.appendChild(createCell(index, fields[6]));
    row.appendChild(createCell(index, fields[8]));
    return row;
}

document.addEventListener('DOMContentLoaded', function() {
    const buyAllButton = document.getElementById('buyAll');
    let rowElements;
    const fileElement = document.getElementById("file_upload");
    const partsElement = document.getElementById('parts');

    fileElement.addEventListener("change", (event) => {
        const file = fileElement.files[0];
        if (file.type === 'text/csv') {
            console.log(file.name);
            file.text().then((content) => {
                rowElements = [];
                if (partsElement.firstChild) {
                    partsElement.removeChild(partsElement.firstChild);
                }
                const table = document.createElement('table')
                const rows = csvToArray(content);
                rows.length -= 4;
                rows.forEach((fields, index) => {
                    const row = createRow(index, fields);
                    table.appendChild(row);
                    if (index > 0) {
                        rowElements.push(row);
                    }
                });
                partsElement.appendChild(table);
                buyAllButton.style.display = 'block';
            });
        } else {
            setError('Only CSV files supported, this is ' + file.type);
            document.getElementById('form').reset();
        }
    });

    buyAllButton.addEventListener('click', function() {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
            console.log('buy all clicked');
            const tab = tabs[0];

            chrome.tabs.onUpdated.addListener(function (tabId, updated) {
                console.log('on updated', updated);
                if (tabId === tab.id && updated.status === 'complete') {
                    console.log('tab status complete', updated.status, updated.url);
                    chrome.tabs.query({currentWindow: true, active: true}, function (reloadeds) {
                        const reloaded = reloadeds[0];
                        console.log('sending buy', reloaded);
                        const sent = chrome.tabs.sendMessage(reloaded.id, {text: 'buy', quantity: 6}, doStuffWithDom);
                        console.log('sent', sent);
                    });
                }
            });

            chrome.tabs.update(tab.id, { url: 'https://www.lego.com/nl-nl/page/static/pick-a-brick?query=6328180' });
        });
    }, false);
}, false);

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
