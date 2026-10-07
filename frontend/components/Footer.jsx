import Icon from './ui/Icon';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand"><span className="brand-mark" aria-hidden="true"><span>K</span><i /></span><div><strong>KLE HACKATHON 2K26</strong><p>Build. Innovate. Transform.</p></div></div>
        <div className="footer-meta"><span>10 & 11 October 2026</span><span>KLE BCA College, Mahalingpur</span><a href="#hero">Back to top <Icon name="arrowUpRight" size={14} /></a></div>
      </div>
      <div className="footer-bottom"><span>Department of BCA · KLE BCA College</span><span>Ideas that make a difference.</span></div>
    </footer>
  );
}
