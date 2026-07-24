import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="app-footer">
      <p>&copy; 2026 BudgetHome. Tous droits réservés.</p>
      <p style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '0.85rem' }}>
        <Link to="/mentions-legales">Mentions légales</Link>
        <Link to="/confidentialite">Politique de confidentialité</Link>
      </p>
    </footer>
  );
}

export default Footer;