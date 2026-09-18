import React from 'react';
export class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main className="nr-login"><section className="nr-login-card" role="alert"><h1 className="nr-brand">Connection interrupted</h1><p className="nr-muted my-5">The interface could not start. Your saved data has not been deleted.</p><button className="nr-primary" onClick={() => window.location.reload()}>Reload interface</button><p className="mt-5"><a className="underline text-cyan-400" href="https://meow.neurospace.tech">Open CAT TERRITORY directly</a></p></section></main> : this.props.children;
  }
}
