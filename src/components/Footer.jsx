// Product footer, shared by the dashboard and Workspace Settings
// Version from package.json and the build time, both set at build time:
// 'AgileMetrix-1.0 - Last Updated On 18/10/2026 5:30:47 PM'
const VERSION = __APP_VERSION__.replace(/\.0$/, '');
const UPDATED = new Date(__BUILD_TIME__).toLocaleString('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
}).replace(',', '').replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <img src="/logo-icon.svg" alt="" className="footer-icon logo-light" />
        <img src="/logo-icon-dark.svg" alt="" className="footer-icon logo-dark" />
        <span className="brand-wordmark footer-wordmark"><span className="brand-agile">Agile</span><span className="brand-metrix">Metrix</span></span>
      </div>
      <div className="footer-meta">
        <span>© {new Date().getFullYear()} AgileMetrix · Powered by <strong className="powered-by">Quadpact</strong></span>
        <span className="app-version">AgileMetrix-{VERSION} - Last Updated On {UPDATED}</span>
      </div>
    </footer>
  );
}
