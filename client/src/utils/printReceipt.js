export const printReceipt = (cart, total, client) => {
    // Aumentamos un poco el ancho de la ventana para evitar cortes
    const receiptWindow = window.open('', '', 'width=400,height=600');
    const date = new Date().toLocaleString('es-CO');
  
    // Generamos la lista de productos en HTML
    const itemsHtml = cart.map(item => `
      <div class="item">
        <div class="prod-name">
            ${item.quantity} x ${item.nombre} 
            <div class="size">(${item.selectedSize})</div>
        </div>
        <div class="price">
           $${Number(item.selectedPrice * item.quantity).toLocaleString('es-CO')}
        </div>
      </div>
    `).join('');
  
    // Construimos el ticket completo
    const html = `
      <html>
        <head>
          <title>Comanda Punto Chino</title>
          <style>
            /* Estilos para impresora térmica (58mm / 80mm) */
            @page { margin: 0; }
            body { 
                font-family: 'Courier New', monospace; 
                /* Aumentamos la fuente base para que se lea mejor */
                font-size: 14px; 
                width: 100%; 
                /* Ajustamos el ancho máximo para 80mm, si usas 58mm cámbialo a 58mm */
                max-width: 280px; 
                margin: 0; 
                padding: 10px; 
                color: black;
                font-weight: 600; /* Negrita suave para mejor impresión */
            }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed black; padding-bottom: 10px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
            .info { font-size: 12px; margin-bottom: 5px; }
            
            .client-info { margin-bottom: 15px; border-bottom: 2px dashed black; padding-bottom: 10px; }
            .client-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .label { font-weight: 800; margin-right: 5px; }
  
            .item { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-start; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .prod-name { width: 65%; font-weight: bold; font-size: 13px; line-height: 1.2; }
            .size { font-weight: normal; font-size: 11px; font-style: italic; margin-top: 2px; }
            .price { width: 35%; text-align: right; font-size: 13px; white-space: nowrap; }
  
            .total-section { 
                border-top: 2px dashed black; 
                margin-top: 15px; 
                padding-top: 10px; 
                text-align: right; 
                font-size: 18px; 
                font-weight: 900; 
            }
            
            .footer { text-align: center; margin-top: 30px; font-size: 12px; font-style: italic;}
            
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>YAHN HONG</h2>
            <div class="info">Calle 45 # 2B - 09 | Domicilios: 302 229 7929</div>
            <div class="info">NIT: 22504696-1</div>
            <div class="info">Fecha: ${date}</div>
          </div>
          
          <div class="client-info">
            <div class="client-row"><span class="label">Cliente:</span> <span>${client.nombre || 'Mostrador'}</span></div>
            <div class="client-row"><span class="label">Tel:</span> <span>${client.telefono || '-'}</span></div>
            <div class="client-row"><span class="label">Dir:</span> <span>${client.direccion || 'En sitio'}</span></div>
            <div class="client-row"><span class="label">Pago:</span> <span>${client.metodoPago}</span></div>
          </div>
  
          <div class="items">
            ${itemsHtml}
          </div>
  
          <div class="total-section">
            TOTAL: $${Number(total).toLocaleString('es-CO')}
          </div>
          
          <div class="footer">
             *** Gracias por su compra ***
             <br>Vuelva pronto &lt;3
          </div>
        </body>
      </html>
    `;
  
    // Escribimos y mandamos a imprimir
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    
    // Esperamos un poco para que carguen estilos y lanzamos print
    setTimeout(() => {
      receiptWindow.focus();
      receiptWindow.print();
      // Opcional: cerrar la ventana automáticamente después de imprimir
      // receiptWindow.close(); 
    }, 500);
};