import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Rectangle } from 'recharts';

export default function Reportes() {
  const [cierres, setCierres] = useState([]);
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/cierres', { headers: { 'Authorization': `Bearer ${getToken()}` } })
    .then(res => res.json())
    .then(data => {
        // No necesitamos crear 'fechaCorta' aquí, lo haremos al vuelo en el gráfico
        const dataOrdenada = [...data].reverse();
        setCierres(dataOrdenada);
    });
  }, []);

  const handleDownloadHistorical = async (cierreId) => {
      try {
          const res = await fetch(`/api/ventas/excel/${cierreId}`, {
              headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          if(res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Reporte_${cierreId}.xlsx`;
              document.body.appendChild(a);
              a.click();
              a.remove();
          }
      } catch(e) { console.error(e); alert("Error de descarga"); }
  };

  return (
    <div className="card shadow border-0">
      <div className="card-header bg-white fw-bold py-3"><i className="bi bi-graph-up-arrow me-2"></i>Rendimiento Financiero</div>
      <div className="card-body">
        
        <div style={{ height: 300, width: '100%', marginBottom: '40px' }}>
            <ResponsiveContainer>
                <BarChart data={cierres}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    
                    {/* SOLUCIÓN AQUÍ: 
                        1. dataKey="fechaFin": Usamos el dato único (ISO string) para diferenciar barras.
                        2. tickFormatter: Convertimos ese dato feo en "mar 9" solo para mostrarlo.
                    */}
                    <XAxis 
                        dataKey="fechaFin" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
                    />
                    
                    <YAxis />
                    
                    <Tooltip 
                        cursor={{ fill: 'transparent' }} // Fondo transparente al pasar el mouse
                        wrapperStyle={{ zIndex: 1000 }}
                        contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '8px', 
                            border: '1px solid #dee2e6',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', // Sombra más elegante
                            color: '#333'
                        }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Venta Total']}
                        labelFormatter={(label) => {
                            // Convertimos la etiqueta (que ahora es la fecha larga única) a un formato legible para el título del tooltip
                            return new Date(label).toLocaleDateString('es-CO', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }}
                    />
                    
                    <ReferenceLine y={0} stroke="#000" />
                    
                    <Bar 
                        dataKey="totalVentasSistema" 
                        fill="#198754" 
                        name="Ventas" 
                        radius={[4, 4, 0, 0]}
                        // Efecto visual: Borde amarillo y verde oscuro al seleccionar
                        activeBar={<Rectangle fill="#145c32" stroke="#FFC107" strokeWidth={3} />}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>

        <h5 className="fw-bold mb-3"><i className="bi bi-clock-history me-2"></i>Historial de Auditoría</h5>
        <div className="table-responsive">
            <table className="table table-hover align-middle small">
                <thead className="table-light">
                    <tr><th>Fecha Cierre</th><th>Ventas</th><th>Gastos</th><th>Real</th><th>Balance</th><th>Acción</th></tr>
                </thead>
                <tbody>
                    {[...cierres].reverse().map(cierre => (
                        <tr key={cierre._id}>
                            <td>
                                {new Date(cierre.fechaFin).toLocaleDateString()} 
                                <br/>
                                <span className="text-muted">{new Date(cierre.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="fw-bold">${cierre.totalVentasSistema.toLocaleString()}</td>
                            <td className="text-danger">-${cierre.totalGastos.toLocaleString()}</td>
                            <td className="fw-bold text-primary">${cierre.totalEfectivoReal.toLocaleString()}</td>
                            <td>
                                {cierre.diferencia === 0 ? <span className="badge bg-success">OK</span> : 
                                 cierre.diferencia > 0 ? <span className="badge bg-info text-dark">+${cierre.diferencia.toLocaleString()}</span> : 
                                 <span className="badge bg-danger">-${Math.abs(cierre.diferencia).toLocaleString()}</span>}
                            </td>
                            <td>
                                <button className="btn btn-sm btn-outline-success" onClick={() => handleDownloadHistorical(cierre._id)} title="Descargar Excel">
                                    <i className="bi bi-download"></i>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}