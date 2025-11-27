export const printReceipt = (cart, total, client) => {
    // Abrimos una ventana pequeña invisible para preparar el recibo
    const receiptWindow = window.open('', '', 'width=300,height=600');
    const date = new Date().toLocaleString();
  
    // Generamos la lista de productos en HTML
    const itemsHtml = cart.map(item => `
      <div class="item">
        <div class="prod-name">
            ${item.quantity} x ${item.nombre} 
            <div class="size">(${item.selectedSize})</div>
        </div>
        <div class="price">$${(item.selectedPrice * item.quantity).toLocaleString()}</div>
      </div>
    `).join('');
  
    // Construimos el ticket completo
    const html = `
      <html>
        <head>
          <title>Comanda Punto Chino</title>
          <style>
            /* Estilos para impresora térmica (58mm / 80mm) */
            body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 100%; 
                max-width: 300px; /* Ancho estándar de ticket */
                margin: 0 auto; 
                padding: 5px; 
                color: black;
            }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 5px; }
            .header h2 { margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
            .info { font-size: 10px; margin-bottom: 5px; }
            
            .client-info { margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 5px; }
            .client-row { display: flex; font-size: 11px; margin-bottom: 2px; }
            .label { font-weight: bold; width: 50px; }
  
            .item { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: flex-start; }
            .prod-name { width: 70%; font-weight: bold; }
            .size { font-weight: normal; font-size: 10px; font-style: italic; }
            .price { width: 30%; text-align: right; }
  
            .total-section { border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; text-align: right; font-size: 14px; font-weight: bold; }
            
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PUNTO CHINO</h2>
            <div class="info">Calle 45 # 38-21 | Domicilios: 324 223 3760</div>
            <div class="info"> NIT: 1044604619-2
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
            TOTAL: $${total.toLocaleString()}
          </div>
          
          <div class="footer">
             *** Gracias por su compra ***
             <br>Vuelva pronto <3
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