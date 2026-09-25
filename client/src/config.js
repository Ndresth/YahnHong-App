import COMPARTIDA from '../../shared/config.json';

/** Datos del negocio y parámetros de operación. Edite aquí, no en los componentes. */
export const NEGOCIO = {
  nombre: 'YAHN HONG',
  subtitulo: 'Restaurante Oriental',
  nit: '22504696-1',
  direccion: 'Calle 45 # 2B - 09',
  telefono: '302 229 7929',
  whatsapp: '573022297929'
};

export const CATEGORIAS = [
  'Arroz Frito', 'Chop Suey', 'Espaguetes', 'Agridulce',
  'Platos Especiales', 'Comidas Corrientes', 'Porciones', 'Bebidas', 'Combos', 'Cajas'
];

/** Categorías que se venden en el POS pero no salen en el menú web (shared/config.json). */
export const CATEGORIAS_SOLO_POS = COMPARTIDA.categoriasSoloPos;

export const TOTAL_MESAS = 20;

const h12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
const { normal, domingoFestivo } = COMPARTIDA.horario;

/** Texto informativo del horario (shared/config.json). El servidor lo valida. */
export const HORARIO_TEXTO = normal.abre === domingoFestivo.abre && normal.cierra === domingoFestivo.cierra
  ? `Todos los días ${h12(normal.abre)} – ${h12(normal.cierra)}`
  : `Lun a sáb ${h12(normal.abre)} – ${h12(normal.cierra)} · Domingos y festivos ${h12(domingoFestivo.abre)} – ${h12(domingoFestivo.cierra)}`;

export const METODOS_PAGO = [
  { id: 'Efectivo', icon: 'bi-cash-coin' },
  { id: 'Nequi', icon: 'bi-phone' },
  { id: 'Transferencia', icon: 'bi-bank' },
  { id: 'Tarjeta', icon: 'bi-credit-card' }
];

export const TAMANO_LABEL = { familiar: 'Familiar', mediano: 'Mediano', personal: 'Personal', unico: 'Único' };
export const TAMANO_CORTO = { familiar: 'F', mediano: 'M', personal: 'P', unico: '' };

export const PLACEHOLDER_IMG = '/images/placeholder.svg';

/** Pantalla de inicio de cada rol después del login. */
export const HOME_BY_ROLE = { admin: '/admin', cajero: '/admin', mesera: '/pos', cocina: '/cocina' };

/** Colores fijos por método de pago (validados para daltonismo; siempre van con etiqueta). */
export const COLOR_METODO = { Efectivo: '#2a78d6', Nequi: '#eb6834', Transferencia: '#1baf7a', Tarjeta: '#eda100' };


/** Desechables por pedido (shared/config.json). El servidor valida precio y límites. */
export const DESECHABLES = COMPARTIDA.desechables;

/** Categoría que habilita los vasos. */
export const CATEGORIA_BEBIDAS = COMPARTIDA.categoriaBebidas;
