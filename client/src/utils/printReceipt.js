export const printReceipt = (cart, total, client, type = 'cliente', ordenInfo = {}) => {
    const receiptWindow = window.open('', '', 'width=400,height=600');
    const date = new Date().toLocaleString('es-CO');
  
    // Título dinámico para cocina
    let headerInfo = "";
    if (type === 'cocina') {
        let titulo = "DOMICILIO";
        if (ordenInfo.tipo === 'Mesa') titulo = `MESA ${ordenInfo.numero}`;
        if (ordenInfo.tipo === 'Llevar') titulo = "PARA LLEVAR";
        headerInfo = `<div style="font-size: 24px; border: 2px solid black; padding: 5px; margin: 10px 0;">${titulo}</div>`;
    }

    // Estilos Base
    const styles = `
        <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', monospace; font-size: 14px; width: 280px; margin: 0 auto; padding: 10px; color: black; font-weight: 700; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .divider { border-bottom: 2px dashed black; margin: 8px 0; }
            .item { display: flex; margin-bottom: 5px; align-items: flex-start; }
            .qty { width: 30px; font-size: 16px; font-weight: 900; }
            .prod-name { flex-grow: 1; font-size: 14px; line-height: 1.1; }
            .size { font-weight: normal; font-size: 11px; }
            .price { text-align: right; white-space: nowrap; font-size: 14px; }
            .total-section { border-top: 2px dashed black; margin-top: 10px; padding-top: 10px; text-align: right; font-size: 20px; font-weight: 900; }
            .kitchen-note { background: #000; color: #fff; padding: 2px; font-size: 12px; display: block; margin-top: 2px; }
        </style>
    `;

    // CONTENIDO FACTURA CLIENTE (DATOS YAHN HONG)
    const customerContent = `
        <div class="text-center">
            <div style="font-size: 20px; font-weight:900">YAHN HONG</div>
            <div style="font-size: 12px;">Comida China Auténtica</div>
            <div class="divider"></div>
            <div style="font-size: 12px; text-align: left;">
                FECHA: ${date}<br/>
                CLIENTE: ${client.nombre}<br/>
                ${client.direccion ? `DIR: ${client.direccion}` : ''}
            </div>
            <div class="divider"></div>
        </div>
        <div class="items">
            ${cart.map(item => `
                <div class="item">
                    <div class="qty">${item.quantity}</div>
                    <div class="prod-name">${item.nombre} <div class="size">(${item.selectedSize})</div></div>
                    <div class="price">$${Number(item.selectedPrice * item.quantity).toLocaleString('es-CO')}</div>
                </div>
            `).join('')}
        </div>
        <div class="total-section">TOTAL: $${Number(total).toLocaleString('es-CO')}</div>
        <div class="text-center" style="margin-top:20px; font-size:12px;">¡Gracias por su compra!</div>
    `;

    // CONTENIDO COCINA (SIN PRECIOS, LETRA GRANDE)
    const kitchenContent = `
        <div class="text-center">
            <div style="font-size: 12px;">${date}</div>
            ${headerInfo}
            <div style="text-align: left; font-size: 16px; margin-bottom: 10px;">CLIENTE: ${client.nombre}</div>
            ${ordenInfo.tipo === 'Domicilio' ? `<div style="border:1px solid black; padding:5px; text-align:left; font-size:12px; margin-bottom:10px;">DIR: ${client.direccion}<br>TEL: ${client.telefono}<br>PAGO: ${client.metodoPago}</div>` : ''}
            <div class="divider"></div>
        </div>
        <div>
            ${cart.map(item => `
                <div style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
                    <strong>${item.quantity}</strong> X ${item.nombre} 
                    <br><span style="font-size: 14px; font-weight: normal;">(${item.selectedSize})</span>
                    ${item.nota ? `<span class="kitchen-note">NOTA: ${item.nota}</span>` : ''}
                </div>
            `).join('')}
        </div>
        <div class="text-center" style="margin-top: 20px; border-top: 4px double black; font-size: 18px;">FIN COMANDA</div>
    `;

    const html = `<html><head><title>Imprimir</title>${styles}</head><body>${type === 'cocina' ? kitchenContent : customerContent}</body></html>`;
  
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    setTimeout(() => { receiptWindow.focus(); receiptWindow.print(); receiptWindow.close(); }, 500);
};