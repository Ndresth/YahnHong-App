/**
 * Impresión de tickets para impresoras térmicas (58mm / 80mm).
 *
 * Problemas que corrige respecto a la versión anterior:
 *  - Usa un iframe oculto en vez de ventana emergente (no lo bloquea el navegador).
 *  - Ancho en milímetros según el papel: antes el ticket medía ~320px y se cortaba en 58mm.
 *  - Las notas de cocina ya no usan fondo negro (la mayoría de drivers no imprimen fondos
 *    y la nota salía en blanco).
 *  - Todo el texto se escapa (antes un nombre con HTML se ejecutaba en el equipo de caja).
 *  - Imprime la fecha y número real de la orden, no la hora de impresión.
 */
import { NEGOCIO, TAMANO_LABEL } from '../config';
import { textoPago } from './pagos';

const SETTINGS_KEY = 'printSettings';
const DEFAULTS = { ancho: 80, autoComandaPos: false, autoComandaCocina: false, copiasCocina: 1 };

export const getPrintSettings = () => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
};

export const setPrintSettings = (partial) => {
    const next = { ...getPrintSettings(), ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;
const fecha = (d) => new Date(d || Date.now()).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
const tamano = (t) => TAMANO_LABEL[t] || t || '';

const tituloTipo = (o) => {
    if (o.tipo === 'Mesa') return `MESA ${esc(o.numeroMesa)}`;
    if (o.tipo === 'Llevar') return o.origen === 'Web' ? 'RECOGER EN LOCAL' : 'PARA LLEVAR';
    return 'DOMICILIO';
};

const horaProg = (o) => new Date(o.horaProgramada).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

const styles = (ancho) => {
    const contenido = ancho === 58 ? 48 : 72; // Área imprimible real de cada rollo
    return `
    @page { size: ${ancho}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
        width: ${contenido}mm; margin: 0 auto; padding: 2mm 0 6mm;
        font-family: 'Courier New', Courier, monospace; color: #000;
        font-size: ${ancho === 58 ? 11 : 13}px; line-height: 1.25;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .c { text-align: center; } .r { text-align: right; } .b { font-weight: bold; }
    .sm { font-size: 0.85em; } .lg { font-size: 1.3em; } .xl { font-size: 1.6em; }
    .hr { border-top: 1px dashed #000; margin: 2mm 0; }
    .hr2 { border-top: 2px solid #000; margin: 2mm 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 0.6mm 0; }
    td.q { width: 9%; font-weight: bold; } td.p { width: 30%; text-align: right; white-space: nowrap; }
    .box { border: 2px solid #000; padding: 1.5mm; margin: 2mm 0; font-size: 1.7em; font-weight: 900; text-align: center; }
    .item { font-size: 1.35em; font-weight: bold; margin: 2mm 0 1mm; word-wrap: break-word; }
    .nota { border: 1.5px solid #000; border-left-width: 5px; padding: 1mm 1.5mm; font-size: 0.8em; margin-top: 1mm; }
    .row { display: flex; justify-content: space-between; gap: 2mm; }
    `;
};

const facturaHtml = (o) => `
    <div class="c">
        <div class="lg b">${esc(NEGOCIO.nombre)}</div>
        <div class="sm">NIT: ${esc(NEGOCIO.nit)}</div>
        <div class="sm">${esc(NEGOCIO.direccion)}</div>
        <div class="sm">Tel: ${esc(NEGOCIO.telefono)}</div>
    </div>
    <div class="hr"></div>
    <div class="row b"><span>ORDEN ${o.numero ? `#${esc(o.numero)}` : ''}</span><span>${tituloTipo(o)}</span></div>
    <div class="sm">FECHA: ${esc(fecha(o.fecha))}</div>
    <div class="sm">CLIENTE: ${esc(o.cliente?.nombre)}</div>
    ${o.tipo !== 'Mesa' && o.cliente?.telefono ? `<div class="sm">TEL: ${esc(o.cliente.telefono)}</div>` : ''}
    ${o.tipo === 'Domicilio' ? `<div class="sm">DIR: ${esc(o.cliente?.direccion)}</div>` : ''}
    ${o.horaProgramada ? `<div class="b">PROGRAMADO: ${esc(horaProg(o))}</div>` : ''}
    <div class="hr"></div>
    <table>
        ${(o.items || []).map(i => `
            <tr>
                <td class="q">${esc(i.cantidad)}</td>
                <td>${esc(i.nombre)}<div class="sm">${i.extra ? (i.precio ? money(i.precio) : 'Sin costo') : `${esc(tamano(i.tamaño))} · ${money(i.precio)}`}</div></td>
                <td class="p">${money(i.precio * i.cantidad)}</td>
            </tr>`).join('')}
    </table>
    <div class="hr2"></div>
    <div class="row xl b"><span>TOTAL</span><span>${money(o.total)}</span></div>
    <div class="sm">PAGO: ${esc(textoPago(o))}</div>
    ${o.tipo === 'Domicilio' ? '<div class="c b" style="margin-top:2mm">* Valor del domicilio no incluido</div>' : ''}
    <div class="c sm" style="margin-top:4mm">¡Gracias por su compra!</div>
`;

const comandaHtml = (o) => `
    <div class="row sm"><span>${esc(fecha(o.fecha))}</span><span>${o.numero ? `#${esc(o.numero)}` : ''}</span></div>
    ${o.adicion ? '<div class="box">*** ADICIÓN ***</div>' : ''}
    <div class="box">${tituloTipo(o)}</div>
    ${o.horaProgramada ? `<div class="box">PARA LAS ${esc(horaProg(o))}</div>` : ''}
    ${o.tipo !== 'Mesa' ? `<div class="lg b">${esc(o.cliente?.nombre)}</div>` : ''}
    ${o.tipo === 'Domicilio' ? `
        <div class="sm" style="border:1px solid #000;padding:1mm;margin-top:1mm">
            DIR: ${esc(o.cliente?.direccion)}<br/>TEL: ${esc(o.cliente?.telefono)}<br/>PAGO: ${esc(textoPago(o))}
        </div>` : ''}
    ${o.tipo === 'Llevar' && o.cliente?.telefono ? `<div class="sm">TEL: ${esc(o.cliente.telefono)}</div>` : ''}
    <div class="hr2"></div>
    ${(o.items || []).map(i => `
        <div class="item">${esc(i.cantidad)} x ${esc(i.nombre)} ${i.extra ? '' : `<span class="sm" style="font-weight:normal">(${esc(tamano(i.tamaño))})</span>`}
            ${i.nota ? `<div class="nota">NOTA: ${esc(i.nota.toUpperCase())}</div>` : ''}
        </div>
        <div class="hr"></div>`).join('')}
    ${o.usuario ? `<div class="sm">Tomó: ${esc(o.usuario)}</div>` : ''}
    <div class="c b" style="margin-top:3mm;border-top:3px double #000;padding-top:1mm">FIN COMANDA</div>
`;

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Imprime un documento HTML sin abrir ventanas nuevas (iframe oculto). */
const printHtml = (html) => {
    // En celulares/tablets el iframe no siempre imprime su propio contenido: usamos ventana nueva.
    if (isMobile()) {
        const w = window.open('', '_blank');
        if (w) {
            w.document.open(); w.document.write(html); w.document.close();
            w.addEventListener('afterprint', () => w.close());
            setTimeout(() => { w.focus(); w.print(); }, 250);
            return;
        }
    }

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
    document.body.appendChild(frame);

    const cleanup = () => setTimeout(() => frame.remove(), 500);
    const doc = frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();

    // Espera a que el navegador maquete el documento antes de imprimir
    setTimeout(() => {
        try {
            frame.contentWindow.addEventListener('afterprint', cleanup);
            frame.contentWindow.focus();
            frame.contentWindow.print();
        } finally {
            setTimeout(cleanup, 60000); // Respaldo por si 'afterprint' no se dispara
        }
    }, 150);
};

/**
 * Imprime una orden tal como la devuelve el servidor.
 * @param {Object} orden - Documento de la orden (items con cantidad, precio, tamaño, nota)
 * @param {'cliente'|'cocina'} modo
 */
export const printOrder = (orden, modo = 'cliente') => {
    const { ancho, copiasCocina } = getPrintSettings();
    const body = modo === 'cocina'
        ? Array.from({ length: Math.max(1, copiasCocina) }, () => comandaHtml(orden)).join('<div style="break-after:page"></div>')
        : facturaHtml(orden);
    const titulo = `${modo === 'cocina' ? 'Comanda' : 'Factura'} ${orden.numero ? '#' + orden.numero : ''}`;
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${styles(Number(ancho))}</style></head><body>${body}</body></html>`);
};

/** Imprime el resumen del cierre de caja (reporte Z) en la térmica. */
export const printCierre = (cierre) => {
    const { ancho } = getPrintSettings();
    const metodos = Object.entries(cierre.ventasPorMetodo || {});
    const d = cierre.diferencia || 0;
    const body = `
        <div class="c"><div class="lg b">${esc(NEGOCIO.nombre)}</div><div class="b">CIERRE DE CAJA</div></div>
        <div class="hr"></div>
        <div class="sm">INICIO: ${esc(fecha(cierre.fechaInicio))}</div>
        <div class="sm">CIERRE: ${esc(fecha(cierre.fechaFin))}</div>
        <div class="sm">CERRÓ: ${esc(cierre.usuario)}</div>
        <div class="hr"></div>
        ${metodos.map(([m, v]) => `<div class="row"><span>${esc(m)}</span><span>${money(v)}</span></div>`).join('')}
        <div class="hr"></div>
        <div class="row b"><span>TOTAL VENTAS</span><span>${money(cierre.totalVentasSistema)}</span></div>
        <div class="row"><span>Pedidos</span><span>${esc(cierre.cantidadPedidos)}</span></div>
        ${cierre.cantidadCancelados ? `<div class="row"><span>Anulados</span><span>${esc(cierre.cantidadCancelados)}</span></div>` : ''}
        <div class="row"><span>Gastos</span><span>-${money(cierre.totalGastos)}</span></div>
        <div class="hr2"></div>
        <div class="row b"><span>EFECTIVO ESPERADO</span><span>${money(cierre.totalCajaTeorico)}</span></div>
        <div class="row b"><span>EFECTIVO CONTADO</span><span>${money(cierre.totalEfectivoReal)}</span></div>
        <div class="box" style="font-size:1.2em">${d === 0 ? 'CUADRA' : d > 0 ? `SOBRANTE ${money(d)}` : `FALTANTE ${money(-d)}`}</div>
        <div class="c sm" style="margin-top:6mm">Firma: ______________________</div>
    `;
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Cierre de caja</title><style>${styles(Number(ancho))}</style></head><body>${body}</body></html>`);
};
