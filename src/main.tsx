import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { installNativeApiBridge } from './lib/api.ts';
import './index.css';

installNativeApiBridge();

createRoot(document.getElementById('root')!).render(<App />);
