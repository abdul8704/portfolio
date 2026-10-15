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
