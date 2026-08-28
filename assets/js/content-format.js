(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function link(value) {
    try {
      const url = new URL(value, location.origin);
      return (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === location.protocol) || url.protocol === 'mailto:') ? url.href : '';
    } catch (_) { return ''; }
  }
  function inline(value) {
    return escape(value).replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, (match, label, target) => {
      const url = link(target.replaceAll('&amp;', '&'));
      return url ? `<a href="${escape(url)}" rel="noopener">${label}</a>` : label;
    }).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  }
  function format(value) {
    return String(value || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(Boolean).map(block => {
      const lines = block.trim().split('\n');
      if (lines.length > 1 && lines.every(line => /^\|.*\|$/.test(line.trim())) && /^\|[\s:|\-]+\|$/.test(lines[1])) {
        const rows = lines.map(line => line.trim().slice(1, -1).split('|').map(cell => cell.trim()));
        return `<div class="table-wrap"><table><thead><tr>${rows[0].map(cell => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(2).map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      if (lines.every(line => /^[-*] /.test(line))) return `<ul>${lines.map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
      if (lines.every(line => /^\d+\. /.test(line))) return `<ol>${lines.map(line => `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
      if (/^### /.test(block)) return `<h3>${inline(block.slice(4))}</h3>`;
      if (/^## /.test(block)) return `<h2>${inline(block.slice(3))}</h2>`;
      if (/^> /.test(block)) return `<blockquote><p>${inline(block.slice(2))}</p></blockquote>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }
  window.CHIATECH_CONTENT = Object.freeze({ escape, format });
})();
