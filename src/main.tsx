import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccessGate } from './components/layout/AccessGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessGate />
  </StrictMode>,
);
