const { HttpError } = require('./util');

/** Colombia no tiene horario de verano: el desfase es fijo. */
const TZ = 'America/Bogota';
const OFFSET = '-05:00';
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_ANTICIPACION_MIN = 10; // piso; la web sugiere 15 min

/** Fecha AAAA-MM-DD en hora de Colombia. */
const diaBogota = (d = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });

/** Inicio (00:00 Colombia) del día AAAA-MM-DD como Date UTC. */
const inicioDia = (dia) => new Date(`${dia}T00:00:00${OFFSET}`);

/** Suma días a un AAAA-MM-DD. */
const sumarDias = (dia, n) => {
    const d = new Date(`${dia}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/** Valida un rango de días (inclusive) y devuelve los límites [desde, hastaExclusivo). */
const rangoDias = (desde, hasta, maxDias = 400) => {
    if (!DIA_RE.test(desde || '') || !DIA_RE.test(hasta || '')) throw new HttpError(400, 'Fechas inválidas (AAAA-MM-DD)');
    const ini = inicioDia(desde);
    const fin = inicioDia(sumarDias(hasta, 1));
    if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime()) || fin <= ini) throw new HttpError(400, 'Rango de fechas inválido');
    if ((fin - ini) / 86400000 > maxDias) throw new HttpError(400, `El rango máximo es de ${maxDias} días`);
    return { ini, fin };
};

/**
 * Convierte "HH:MM" (hoy, hora de Colombia) en Date. Vacío = lo antes posible (null).
 * Debe ser al menos MIN_ANTICIPACION_MIN minutos en el futuro.
 */
const parseHoraProgramada = (hhmm, ahora = new Date()) => {
    if (hhmm === undefined || hhmm === null || hhmm === '') return null;
    if (typeof hhmm !== 'string' || !HORA_RE.test(hhmm)) throw new HttpError(400, 'Hora inválida');
    const fecha = new Date(`${diaBogota(ahora)}T${hhmm}:00${OFFSET}`);
    if (fecha.getTime() < ahora.getTime() + MIN_ANTICIPACION_MIN * 60000) {
        throw new HttpError(400, `La hora debe ser hoy y al menos ${MIN_ANTICIPACION_MIN} minutos después de ahora`);
    }
    return fecha;
};

module.exports = { TZ, diaBogota, inicioDia, sumarDias, rangoDias, parseHoraProgramada, MIN_ANTICIPACION_MIN };
