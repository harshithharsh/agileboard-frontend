// Product footer, shared by the dashboard and Workspace Settings
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
      </div>
    </footer>
  );
}
