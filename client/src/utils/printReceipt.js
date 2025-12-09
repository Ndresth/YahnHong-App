/**
 * Utilidad de generación de tickets para impresoras térmicas.
 */
export const printReceipt = (cart, total, client, type = 'cliente', ordenInfo = {}) => {
    // Configuración de ventana
    const receiptWindow = window.open('', '', 'width=360,height=600');
    const date = new Date().toLocaleString('es-CO');
    
    // --- ESTILOS ---
    const styles = `
        <style>
            @page { margin: 0; }
            body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 10px; 
                color: #000;
                width: 100%;
                max-width: 300px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .fw-bold { font-weight: bold; }
            .fs-sm { font-size: 12px; }
            .fs-md { font-size: 14px; }
            .fs-lg { font-size: 18px; }
            .fs-xl { font-size: 22px; }
            
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .divider-solid { border-bottom: 2px solid #000; margin: 8px 0; }
            
            .item-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
            .col-qty { width: 15%; font-weight: bold; }
            .col-desc { width: 60%; }
            .col-price { width: 25%; text-align: right; }
            
            /* COCINA */
            .kitchen-item { font-size: 20px; font-weight: bold; line-height: 1.1; margin-bottom: 15px; }
            .kitchen-note { display: block; font-size: 16px; margin-top: 4px; background: #000; color: #fff; padding: 2px 6px; }
            .order-type-box { border: 2px solid #000; padding: 8px; font-size: 24px; font-weight: 900; margin: 15px 0; text-transform: uppercase; }
            .delivery-info { border: 1px solid #000; padding: 5px; margin-top: 5px; font-size: 14px; }
        </style>
    `;

    // LÓGICA DE TÍTULO PARA COCINA
    let tituloComanda = "DOMICILIO";
    if (ordenInfo.tipo === 'Mesa') tituloComanda = `MESA ${ordenInfo.numero}`;
    if (ordenInfo.tipo === 'Llevar') tituloComanda = "PARA LLEVAR";

    // --- PLANTILLA CLIENTE (FACTURA) ---
    const customerTemplate = `
        <div class="text-center">
            <div class="fs-lg fw-bold">YAHN HONG</div>
            <div class="fs-sm">NIT: 22504696-1</div>
            <div class="fs-sm">Calle 45 # 2B - 09</div>
            <div class="fs-sm">Tel: 3022297929</div>
            <div class="divider"></div>
            <div class="text-left fs-sm">
                FECHA: ${date}<br/>
                CLIENTE: ${client.nombre}<br/>
                DIR: ${client.direccion || 'Local'}
            </div>
            <div class="divider"></div>
        </div>

        <div>
            ${cart.map(item => `
                <div class="item-row">
                    <div class="col-qty">${item.quantity}</div>
                    <div class="col-desc">${item.nombre} <br/><span class="fs-sm fw-normal">(${item.selectedSize})</span></div>
                    <div class="col-price">$${(item.selectedPrice * item.quantity).toLocaleString()}</div>
                </div>
            `).join('')}
        </div>

        <div class="divider-solid"></div>
        
        <div class="text-right fs-xl fw-bold">
            TOTAL: $${Number(total).toLocaleString()}
        </div>

        ${ordenInfo.tipo === 'Domicilio' ? `
            <div class="text-center fw-bold fs-md" style="margin-top: 10px;">
                * Valor del domicilio pendiente
            </div>
        ` : ''}
        
        <div class="text-center fs-sm" style="margin-top: 20px;">Gracias por su compra.</div>
    `;

    // --- PLANTILLA COCINA (COMANDA) ---
    const kitchenTemplate = `
        <div class="text-center">
            <div class="fs-sm">${date}</div>
            
            <div class="order-type-box">${tituloComanda}</div>
            
            <div class="text-left fw-bold fs-lg">CLIENTE: ${client.nombre}</div>

            ${ordenInfo.tipo === 'Domicilio' ? `
                <div class="delivery-info text-left">
                    <div>DIR: ${client.direccion || 'N/A'}</div>
                    <div>TEL: ${client.telefono || 'N/A'}</div>
                    <div>PAGO: ${client.metodoPago || 'Efectivo'}</div>
                </div>
            ` : ''}

            <div class="divider-solid"></div>
        </div>

        <div style="margin-top: 15px;">
            ${cart.map(item => `
                <div class="kitchen-item">
                    ${item.quantity} X ${item.nombre} 
                    <span style="font-size: 16px; font-weight: normal;">(${item.selectedSize})</span>
                    ${item.nota ? `<span class="kitchen-note">NOTA: ${item.nota.toUpperCase()}</span>` : ''}
                </div>
                <div class="divider" style="opacity: 0.5;"></div>
            `).join('')}
        </div>
        
        <div class="text-center fw-bold fs-lg" style="margin-top: 20px; border-top: 3px double #000;">FIN COMANDA</div>
    `;

    const bodyContent = type === 'cocina' ? kitchenTemplate : customerTemplate;
    const html = `<html><head><title>Imprimir</title>${styles}</head><body>${bodyContent}</body></html>`;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
    
    setTimeout(() => { receiptWindow.focus(); receiptWindow.print(); }, 500);
};