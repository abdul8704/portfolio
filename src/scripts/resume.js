// Opens the résumé in a popup with a PDF viewer. Without JS, or where the browser cannot show
// PDFs inline (many phones), the link just opens the PDF in a new tab.
const dlg = document.getElementById('resume-modal');
if (dlg) {
  const frame = dlg.querySelector('iframe');
  let opener = null;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[data-resume-viewer]');
    if (!a || navigator.pdfViewerEnabled === false) return;
    e.preventDefault();
    opener = a;
    if (!frame.getAttribute('src')) frame.src = `${dlg.dataset.src}#navpanes=0&view=FitH`;
    dlg.showModal();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); // backdrop or Close button
  });
  dlg.addEventListener('close', () => opener?.focus());
}

// mailto fallback: with no mail app set up the browser does nothing on click. If the page is still
// in front shortly after the click, copy the address instead and say so on the link.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="mailto:"]');
  if (!a || e.defaultPrevented || e.button !== 0) return;
  const addr = decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]);
  setTimeout(() => {
    if (document.hidden || !document.hasFocus() || !navigator.clipboard) return;
    navigator.clipboard.writeText(addr).then(() => {
      const label = a.innerHTML;
      a.textContent = 'Email copied to clipboard';
      setTimeout(() => { a.innerHTML = label; }, 2200);
    }).catch(() => {});
  }, 700);
});
