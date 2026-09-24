/**
 * Bus de eventos en memoria + Server-Sent Events (SSE).
 * Permite que cocina, POS y caja reciban las órdenes al instante sin hacer polling.
 * Nota: funciona con una sola instancia del servidor (plan gratuito de Render).
 */
const clients = new Set();

const subscribe = (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    const client = { res };
    clients.add(client);

    // Latido para que el proxy de Render no cierre la conexión por inactividad
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(client);
    });
};

const publish = (type, data = {}) => {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const { res } of clients) res.write(payload);
};

module.exports = { subscribe, publish };
