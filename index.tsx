import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { performLegacyMigration } from './utils/migration';
import { bootstrapTelegram } from './utils/telegramBootstrap';
import './styles.css';

performLegacyMigration();
void bootstrapTelegram();
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
ReactDOM.createRoot(rootElement).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);
