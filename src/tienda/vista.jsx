import { createRoot } from 'react-dom/client';
import RenderTienda from './RenderTienda.jsx';

const root = createRoot(document.getElementById('root'));

window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.origin !== window.location.origin) return;
  if (event.data?.tipo !== 'giro-vista-tienda' || !event.data.tienda) return;
  root.render(<RenderTienda data={event.data.tienda} persistir={false} />);
});
