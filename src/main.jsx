import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root.jsx';
import './index.css';
import { applyTheme, watchSystemTheme } from './lib/theme.js';

applyTheme();
watchSystemTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
