const { diaBogota, sumarDias } = require('./fechas');
const config = require('../../shared/config.json');

/**
 * Horario de atención (hora de Colombia), definido en shared/config.json.
 * Yahn Hong: todos los días 11:30–20:00 (domingos y festivos incluidos).
 */
const HORARIO = { normal: config.horario.normal, domingoFestivo: config.horario.domingoFestivo };
const OFFSET = '-05:00';

const dow = (dia) => new Date(`${dia}T00:00:00Z`).getUTCDay(); // 0 = domingo

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
const pascua = (anio) => {
    const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

/** Ley Emiliani: si no cae lunes, se pasa al lunes siguiente. */
const alLunes = (dia) => sumarDias(dia, (8 - dow(dia)) % 7);

const cacheFestivos = new Map();

/** Festivos de Colombia (Ley 51 de 1983) de un año: Map AAAA-MM-DD -> nombre. */
const festivosDe = (anio) => {
    if (cacheFestivos.has(anio)) return cacheFestivos.get(anio);
    const f = (mmdd) => `${anio}-${mmdd}`;
    const p = pascua(anio);
    const lista = [
        [f('01-01'), 'Año Nuevo'],
        [alLunes(f('01-06')), 'Reyes Magos'],
        [alLunes(f('03-19')), 'San José'],
        [sumarDias(p, -3), 'Jueves Santo'],
        [sumarDias(p, -2), 'Viernes Santo'],
        [f('05-01'), 'Día del Trabajo'],
        [alLunes(sumarDias(p, 39)), 'Ascensión del Señor'],
        [alLunes(sumarDias(p, 60)), 'Corpus Christi'],
        [alLunes(sumarDias(p, 68)), 'Sagrado Corazón'],
        [alLunes(f('06-29')), 'San Pedro y San Pablo'],
        [f('07-20'), 'Día de la Independencia'],
        [f('08-07'), 'Batalla de Boyacá'],
        [alLunes(f('08-15')), 'Asunción de la Virgen'],
        [alLunes(f('10-12')), 'Día de la Raza'],
        [alLunes(f('11-01')), 'Todos los Santos'],
        [alLunes(f('11-11')), 'Independencia de Cartagena'],
        [f('12-08'), 'Inmaculada Concepción'],
        [f('12-25'), 'Navidad']
    ];
    const mapa = new Map(lista);
    cacheFestivos.set(anio, mapa);
    return mapa;
};

const festivo = (dia) => festivosDe(Number(dia.slice(0, 4))).get(dia) || null;

/**
 * Franja de atención de un día: { dia, abre: Date, cierra: Date, festivo, cerrado }.
 * `cerrados` (Map dia -> motivo) marca días especiales sin atención.
 */
const franjaDe = (dia, cerrados = new Map()) => {
    const fest = festivo(dia);
    const h = fest || dow(dia) === 0 ? HORARIO.domingoFestivo : HORARIO.normal;
    return {
        dia,
        festivo: fest,
        cerrado: cerrados.has(dia) ? cerrados.get(dia) || 'Cerrado' : null,
        abre: new Date(`${dia}T${h.abre}:00${OFFSET}`),
        cierra: new Date(`${dia}T${h.cierra}:00${OFFSET}`)
    };
};

/**
 * Estado del local en `ahora`:
 * abierto, la franja de hoy, y la próxima apertura (hoy más tarde o un día siguiente que no esté cerrado).
 */
const estado = (ahora = new Date(), cerrados = new Map()) => {
    const hoy = franjaDe(diaBogota(ahora), cerrados);
    const t = ahora.getTime();
    const abierto = !hoy.cerrado && t >= hoy.abre.getTime() && t < hoy.cierra.getTime();
    let proxima = !hoy.cerrado && t < hoy.abre.getTime() ? hoy : null;
    for (let i = 1; !proxima && i <= 60; i++) {
        const f = franjaDe(sumarDias(hoy.dia, i), cerrados);
        if (!f.cerrado) proxima = f;
    }
    return { ahora, abierto, hoy, proxima };
};

module.exports = { HORARIO, estado, franjaDe, festivo, festivosDe, pascua };
