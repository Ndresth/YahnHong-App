export const printReceipt = (cart, total, client, tipo = 'Mesa', numeroMesa = '') => {
    const receiptWindow = window.open('', '', 'width=400,height=600');
    const date = new Date().toLocaleString('es-CO');
  
    // Encabezado dinámico
    let headerInfo = "";
    if (tipo === 'Llevar') {
        headerInfo = `<h1 style="font-size: 24px; margin: 10px 0; border: 2px solid black; padding: 5px;">PARA LLEVAR</h1>`;
    } else {
        headerInfo = `<h1 style="font-size: 30px; margin: 10px 0;">MESA ${numeroMesa || '?'}</h1>`;
    }

    const itemsHtml = cart.map(item => `
      <div class="item">
        <div class="qty">${item.cantidad || item.quantity}</div>
        <div class="prod-name">
            ${item.nombre} 
            <div class="size">(${item.selectedSize || item.tamaño})</div>
        </div>
        <div class="price">
           $${Number((item.selectedPrice || item.precio) * (item.quantity || item.cantidad)).toLocaleString('es-CO')}
        </div>
      </div>
    `).join('');
  
    const html = `
      <html>
        <head>
          <title>Comanda</title>
          <style>
            @page { margin: 0; }
            body { 
                font-family: 'Courier New', monospace; 
                font-size: 14px; 
                width: 280px; 
                margin: 0 auto; 
                padding: 10px; 
                color: black;
                font-weight: 700;
            }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px dashed black; padding-bottom: 10px; }
            .info { font-size: 12px; }
            
            .client-info { margin-bottom: 15px; border-bottom: 2px dashed black; padding-bottom: 10px; }
            
            .item { display: flex; margin-bottom: 5px; align-items: flex-start; }
            .qty { width: 30px; font-size: 16px; font-weight: 900; }
            .prod-name { flex-grow: 1; font-size: 14px; line-height: 1.1; }
            .size { font-weight: normal; font-size: 11px; }
            .price { text-align: right; white-space: nowrap; font-size: 14px; }
  
            .total-section { 
                border-top: 2px dashed black; 
                margin-top: 10px; 
                padding-top: 10px; 
                text-align: right; 
                font-size: 20px; 
                font-weight: 900; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 18px; font-weight:900">YAHN HONG</div>
            <div class="info">${date}</div>
            ${headerInfo}
          </div>
          
          <div class="client-info">
            Cliente: ${client.nombre}<br/>
            ${client.telefono ? `Tel: ${client.telefono}<br/>` : ''}
            ${client.direccion && client.direccion !== 'En Local' ? `Dir: ${client.direccion}<br/>` : ''}
          </div>
  
          <div class="items">
            ${itemsHtml}
          </div>
  
          <div class="total-section">
            TOTAL: $${Number(total).toLocaleString('es-CO')}
          </div>
          
          <br/><br/>.
        </body>
      </html>
    `;
  
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    
    setTimeout(() => {
      receiptWindow.focus();
      receiptWindow.print();
      receiptWindow.close();
    }, 500);
};