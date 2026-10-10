import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LoginPage from './components/LoginPage.jsx';
import { signIn, signInWithMicrosoft } from './lib/auth.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoginPage
      onSignIn={signIn}
      onMicrosoftSignIn={signInWithMicrosoft}
      // Preview settings. For production: intro="session" and remove reviewControls.
      intro="always"
      // Testing aid: add #webgl or #canvas to the URL to force a renderer.
      visualRenderer={{ '#webgl': 'webgl', '#canvas': 'canvas' }[window.location.hash] ?? 'auto'}
      reviewControls
    />
  </React.StrictMode>,
);
