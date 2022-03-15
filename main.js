function escapeCsv(str) {
  return `"${`${str}`.replace(/"/g, '""')}"`
}

function flatten_(prefix, out, json) {
  if (typeof json === 'object') {
    if (Array.isArray(json)) {
      for (let i = 0; i < json.length; ++i) {
        flatten_(`${prefix}[${i}]`, out, json[i]);
      }
    }
    else {
      for (let k in json) {
        flatten_(`${prefix}[${JSON.stringify(k)}]`, out, json[k]);
      }
    }
  }
  else {
    out[prefix] = json;
  }
}

function flatten(json) {
  const out = {};
  flatten_('', out, json);
  return out;
}

function toStructuredCsv(flattens) {
  const keys = Array.from(new Set(flattens.flatMap((x) => Object.keys(x))));
  const rows = [];
  for (const x of flattens) {
    const row = [];
    for (const k of keys) {
      const v = x[k];
      row.push(typeof v === 'undefined' ? '' : v);
    }
    rows.push(row);
  }
  return { keys, rows };
}

function csvToString(csv) {
  return `${csv.keys.map(escapeCsv).join(',')}\n${
    csv.rows.map((r) => r.map(escapeCsv).join(',')).join('\n')}`;
}

/**
 * @param {File[]} files
 */
async function handleFiles(files) {
  const flattens = await Promise.all(files.map(async (f) => {
    try {
      const txt = await f.text();
      return flatten(JSON.parse(txt));
    }
    catch (e) {
      console.error(f.name, e);
      return [];
    }
  }));
  const csv = toStructuredCsv(flattens);
  renderTable(csv);
  csvString = csvToString(csv);
}

function renderTable(csv) {
  let html = '<table><tr>';
  for (const k of csv.keys) {
    html += `<th>${k}</th>`;
  }
  html += '</tr>';
  for (const r of csv.rows) {
    html += '<tr>';
    for (const c of r) {
      html += `<td>${c}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  document.getElementById('preview').innerHTML = html;
}

let csvString = '';

window.onload = function () {
  const dropEle = document.getElementById('upload');
  dropEle.addEventListener('dragover', (evt) => {
    evt.preventDefault();
  });
  dropEle.addEventListener('dragenter', (evt) => {
    dropEle.classList.add('dragging');
  });
  dropEle.addEventListener('dragleave', (evt) => {
    dropEle.classList.remove('dragging');
  });
  dropEle.addEventListener('drop', (evt) => {
    dropEle.classList.remove('dragging');
    handleFiles(Array.from(evt.dataTransfer.files));
    evt.preventDefault();
  });

  const downloadLink = document.getElementById('download-link');

  const downloadButton = document.getElementById('download');
  downloadButton.addEventListener('click', () => {
    
    const blob = new Blob([csvString], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = 'json-to-csv.csv';
    downloadLink.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  const copyButton = document.getElementById('copy');
  copyButton.addEventListener('click', () => {
    window.navigator.clipboard.writeText(csvString);
  });
};
