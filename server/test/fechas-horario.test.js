const test = require('node:test');
const assert = require('node:assert/strict');
const { rangoDias, parseHoraProgramada, diaBogota, sumarDias } = require('../lib/fechas');
const horario = require('../lib/horario');

test('rangoDias usa medianoche de Colombia y es inclusivo', () => {
    const { ini, fin } = rangoDias('2026-09-21', '2026-09-27');
    assert.equal(ini.toISOString(), '2026-09-21T05:00:00.000Z');
    assert.equal(fin.toISOString(), '2026-09-28T05:00:00.000Z');
    assert.throws(() => rangoDias('x', '2026-01-01'), /Fechas inválidas/);
    assert.throws(() => rangoDias('2026-02-01', '2026-01-01'), /Rango/);
    assert.throws(() => rangoDias('2024-01-01', '2026-01-01'), /máximo/);
});

test('diaBogota y sumarDias', () => {
    assert.equal(diaBogota(new Date('2026-09-24T03:00:00Z')), '2026-09-23'); // 10 p. m. en Colombia
    assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
});

test('parseHoraProgramada: hoy, formato HH:MM y al menos 10 min adelante', () => {
    const ahora = new Date('2026-09-23T20:00:00Z'); // 3:00 p. m. Colombia
    assert.equal(parseHoraProgramada('', ahora), null);
    assert.equal(parseHoraProgramada('16:00', ahora).toISOString(), '2026-09-23T21:00:00.000Z');
    assert.throws(() => parseHoraProgramada('15:05', ahora), /al menos 10 minutos/);
    assert.throws(() => parseHoraProgramada('25:00', ahora), /Hora inválida/);
    assert.throws(() => parseHoraProgramada(1500, ahora), /Hora inválida/);
});

test('festivos de Colombia 2025 y 2026 (Ley Emiliani y Pascua)', () => {
    assert.deepEqual([...horario.festivosDe(2026).keys()], [
        '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08',
        '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16',
        '2026-12-08', '2026-12-25'
    ]);
    const f2025 = [...horario.festivosDe(2025).keys()];
    for (const d of ['2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18', '2025-06-02', '2025-06-23', '2025-06-30', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17']) {
        assert.ok(f2025.includes(d), d);
    }
});

test('estado: todos los días 11:30–20:00 (domingos y festivos incluidos)', () => {
    const e = (iso, cerrados) => horario.estado(new Date(iso), cerrados);
    assert.equal(e('2026-09-23T16:00:00Z').abierto, false); // mié 11:00
    assert.equal(e('2026-09-23T16:00:00Z').proxima.dia, '2026-09-23'); // abre hoy
    assert.equal(e('2026-09-23T17:00:00Z').abierto, true); // mié 12:00
    assert.equal(e('2026-09-24T00:59:00Z').abierto, true); // mié 19:59
    assert.equal(e('2026-09-24T01:00:00Z').abierto, false); // mié 20:00
    assert.equal(e('2026-09-24T01:00:00Z').proxima.dia, '2026-09-24'); // abre mañana
    assert.equal(e('2026-09-27T23:00:00Z').abierto, true); // dom 18:00
    assert.equal(e('2026-09-28T01:01:00Z').abierto, false); // dom 20:01
    assert.equal(e('2026-10-12T21:00:00Z').abierto, true); // festivo 16:00
    assert.equal(e('2026-10-12T21:00:00Z').hoy.festivo, 'Día de la Raza');
    assert.equal(e('2026-10-12T16:00:00Z').abierto, false); // festivo 11:00
});

test('estado: días cerrados especiales', () => {
    const cerrados = new Map([['2026-09-23', 'Evento'], ['2026-09-24', 'Mantenimiento']]);
    const e = horario.estado(new Date('2026-09-23T17:00:00Z'), cerrados);
    assert.equal(e.abierto, false);
    assert.equal(e.hoy.cerrado, 'Evento');
    assert.equal(e.proxima.dia, '2026-09-25'); // salta el 24
});
