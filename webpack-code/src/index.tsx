import './style.css';
import './wdyr';
import { createRoot } from 'react-dom/client';
import App from './pages/App';

const container = document.getElementById('app');

if (!container) {
  throw new Error('No container found');
}
createRoot(container).render(<App />);
