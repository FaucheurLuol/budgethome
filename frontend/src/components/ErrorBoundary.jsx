import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { aUneErreur: false };
  }

  static getDerivedStateFromError() {
    return { aUneErreur: true };
  }

  componentDidCatch(erreur, info) {
    console.error('Erreur capturée par ErrorBoundary :', erreur, info);
  }

  render() {
    if (this.state.aUneErreur) {
      return (
        <div className="page-app" style={{ textAlign: 'center', paddingTop: '80px' }}>
          <h1>Une erreur est survenue</h1>
          <p className="page-sous-titre">
            Quelque chose s'est mal passé. Essayez de recharger la page.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;