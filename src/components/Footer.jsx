// Product footer, shared by the dashboard and Workspace Settings
// Version from package.json (set at build time): '1.0.0' -> 'v1.0'
const VERSION = `v${__APP_VERSION__.replace(/\.0$/, '')}`;
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
        <span className="app-version" title={`AgileMetrix version ${__APP_VERSION__}`}>{VERSION}</span>
      </div>
    </footer>
  );
}
