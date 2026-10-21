import { formatDateTime } from '../lib/datetime.js';

// Product footer, shared by the dashboard and Settings.
// Version comes from package.json and "Last updated" is when this build was made (both set at build time).
const VERSION = __APP_VERSION__.replace(/\.0$/, '');

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <img src="/logo-icon.svg" alt="" className="footer-icon logo-light" />
        <img src="/logo-icon-dark.svg" alt="" className="footer-icon logo-dark" />
        <span className="brand-wordmark footer-wordmark"><span className="brand-agile">Agile</span><span className="brand-metrix">Metrix</span></span>
        <span className="footer-copy">© {new Date().getFullYear()} AgileMetrix. All rights reserved.</span>
      </div>
      <ul className="footer-meta">
        <li>Version {VERSION}</li>
        <li title={formatDateTime(__BUILD_TIME__, { seconds: true })}>Last updated {formatDateTime(__BUILD_TIME__)}</li>
        <li>Powered by{"\u00A0"}<strong className="powered-by">Quadpact</strong></li>
      </ul>
    </footer>
  );
}
