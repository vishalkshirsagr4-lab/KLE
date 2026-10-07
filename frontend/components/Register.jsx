import Button from './ui/Button';
import Icon from './ui/Icon';

const STEPS = [['01', 'Create account'], ['02', 'Verify email'], ['03', 'Register team'], ['04', 'Start building']];

export default function Register() {
  return (
    <section id="register" className="register-section section">
      <div className="register-panel">
        <div className="register-copy"><p className="section-eyebrow">Your next build starts here</p><h2>Bring the idea.<br /><em>We’ll bring the arena.</em></h2><p>Sign up, build your crew, choose a track, and get ready to turn classroom skills into something real.</p><div className="register-actions"><Button href="/portal">Sign up and register</Button><a href="/portal" className="text-cta">Already have an account? Log in <Icon name="arrowRight" size={16} /></a></div></div>
        <div className="register-steps" aria-label="Registration steps">{STEPS.map(([number, label], index) => <div className="register-step" key={label}><span>{number}</span><p>{label}</p>{index < STEPS.length - 1 && <i />}</div>)}</div>
      </div>
    </section>
  );
}
