import { useState, useEffect } from 'react';
import '../style/app.css';

function DocumentLegal({ titre, cheminMarkdown }) {
  const [contenu, setContenu] = useState('');
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      try {
        const reponse = await fetch(cheminMarkdown);
        const texte = await reponse.text();
        setContenu(texte);
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, [cheminMarkdown]);

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app" style={{ maxWidth: '800px', textAlign: 'left' }}>
      <h1>{titre}</h1>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', lineHeight: '1.7' }}>
        {contenu}
      </pre>
    </div>
  );
}

export default DocumentLegal;