import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, guardarSesion, renovar, salir, sesion } from './api.js';
import Marco from './panel/Marco.jsx';
import Inicio from './panel/Inicio.jsx';
import Vidriera from './panel/Vidriera.jsx';
import Estadisticas from './panel/Estadisticas.jsx';
import Ventas from './panel/Ventas.jsx';
import Productos from './panel/Productos.jsx';
import FichaProducto from './panel/FichaProducto.jsx';
import Clientes from './panel/Clientes.jsx';
import Pedidos from './panel/Pedidos.jsx';
import Caja from './panel/Caja.jsx';
import Ajustes from './panel/Ajustes.jsx';
import WhatsappPage from './panel/Whatsapp.jsx';

export default function App() {
  const [usuario, setUsuario] = useState(sesion);

  function entrar(data) {
    guardarSesion(data);
    setUsuario(data.usuario || sesion());
  }

  function cerrar() {
    salir();
    setUsuario(null);
  }

  if (!usuario) {
    return (
      <Routes>
        <Route path="*" element={<Ingreso onEntrar={entrar} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/ingresar" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Shell usuario={usuario} onSalir={cerrar} />} />
    </Routes>
  );
}

function Shell({ usuario, onSalir }) {
  useEffect(() => { renovar().catch(() => {}); }, []);
  return (
    <Marco usuario={usuario} onSalir={onSalir}>
      <Routes>
        <Route index element={<Inicio />} />
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="vender" element={<Ventas />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/:id" element={<FichaProducto />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="whatsapp" element={<WhatsappPage />} />
        <Route path="caja" element={<Caja />} />
        <Route path="vidriera" element={<Vidriera />} />
        <Route path="ajustes" element={<Ajustes />} />
      </Routes>
    </Marco>
  );
}

function Ingreso({ onEntrar }) {
  const navigate = useNavigate();
  const [alta, setAlta] = useState(false);
  const [error, setError] = useState('');

  async function enviar(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const email = String(datos.get('email') || '').trim();
    const password = String(datos.get('password') || '');
    const body = alta
      ? {
          nombreComercio: String(datos.get('nombreComercio') || '').trim(),
          slug: String(datos.get('slug') || '').trim(),
          nombre: String(datos.get('nombre') || '').trim(),
          email,
          password,
        }
      : { email, password };
    setError('');
    try {
      const data = await api(alta ? '/api/auth/registro' : '/api/auth/login', { method: 'POST', body });
      onEntrar(data);
      navigate('/');
    } catch (err) {
      const red = err.message === 'Failed to fetch';
      setError(red ? 'No se pudo conectar con el servidor.' : (err.message || 'No se pudo ingresar'));
    }
  }

  return (
    <div className="auth">
      <form onSubmit={enviar}>
        <h1>GIRO</h1>
        <p>Tu negocio en el bolsillo.</p>
        {alta && <>
          <label>Comercio<input name="nombreComercio" required /></label>
          <label>Enlace de la vidriera<input name="slug" placeholder="mi-kiosco" required /></label>
          <label>Tu nombre<input name="nombre" required /></label>
        </>}
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Contraseña<input name="password" type="password" autoComplete={alta ? 'new-password' : 'current-password'} required minLength={alta ? 8 : undefined} /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">{alta ? 'Crear comercio' : 'Entrar'}</button>
        <button className="ghost" type="button" onClick={() => setAlta(!alta)}>
          {alta ? 'Ya tengo cuenta' : 'Crear mi comercio'}
        </button>
        <p>
          <a href="/privacidad.html">Privacidad</a>
          {' · '}
          <a href="/condiciones.html">Condiciones</a>
        </p>
      </form>
    </div>
  );
}

