import { Link } from 'react-router-dom';
import '../style/landing.css';

function Accueil() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div>
          <h1>Faites les comptes, <span>à deux</span>.</h1>
          <p>
            BudgetHome centralise vos comptes, vos dépenses et votre épargne pour votre foyer.
            Répartition automatique du compte commun, budgets par compte, objectifs d'épargne partagés :
            une vision claire de votre équilibre financier, ensemble.
          </p>
          <Link to="/inscription" className="btn-primary">Créer votre espace</Link>
        </div>
        <div className="landing-signature">
          <svg viewBox="0 0 240 240" width="100%" height="100%">
            <path d="M 40 140 Q 120 40 200 140" fill="none" stroke="#C9A227" strokeWidth="2" opacity="0.6" />
            <path d="M 40 170 Q 120 90 200 170" fill="none" stroke="#6B8F87" strokeWidth="2" opacity="0.6" />
            <circle cx="40" cy="140" r="4" fill="#C9A227" />
            <circle cx="200" cy="140" r="4" fill="#C9A227" />
            <circle cx="40" cy="170" r="4" fill="#6B8F87" />
            <circle cx="200" cy="170" r="4" fill="#6B8F87" />
          </svg>
        </div>
      </section>

      <section className="landing-section">
        <h2><span className="landing-eyebrow"></span>Fonctionnalités principales</h2>
        <ul className="landing-features">
          <li><strong>Répartition automatique</strong> du compte commun, au prorata des revenus de chacun.</li>
          <li><strong>Budgets par compte et par catégorie</strong>, avec suivi visuel du dépassement.</li>
          <li><strong>Objectifs d'épargne</strong> avec progression calculée automatiquement selon vos versements.</li>
        </ul>
      </section>

      <section className="landing-section">
        <h2><span className="landing-eyebrow"></span>Comment ça marche ?</h2>
        <ol className="landing-steps">
          <li><span className="landing-step-num">01</span><span><strong>Créez votre espace</strong> — un compte pour chacun, réunis dans un même foyer.</span></li>
          <li><span className="landing-step-num">02</span><span><strong>Ajoutez vos comptes</strong> — courants, livrets, épargne, tout ce que vous suivez déjà.</span></li>
          <li><span className="landing-step-num">03</span><span><strong>Saisissez vos transactions</strong> — dépenses et revenus, classés par catégorie.</span></li>
          <li><span className="landing-step-num">04</span><span><strong>Consultez votre équilibre</strong> — reste à vivre, cashflow, progression de vos objectifs.</span></li>
        </ol>
      </section>

      <div className="landing-cta">
        <h2>Prêt à faire les comptes ensemble ?</h2>
        <p>Gratuit. Pensé pour votre foyer.</p>
        <Link to="/inscription" className="btn-primary">Créer votre espace</Link>
      </div>
    </div>
  );
}

export default Accueil;