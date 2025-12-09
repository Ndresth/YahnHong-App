import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Rectangle } from 'recharts';

export default function Reportes() {
  const [cierres, setCierres] = useState([]);
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/cierres', { headers: { 'Authorization': `Bearer ${getToken()}` } })
    .then(res => res.json())
    .then(data => {
        const formattedData = data.map(item => ({
            ...item,
            fechaCorta: new Date(item.fechaFin).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
        })).reverse();
        setCierres(formattedData);
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
                    <XAxis dataKey="fechaCorta" />
                    <YAxis />
                    
                    <Tooltip 
                        // 1. Ponemos 'transparent' para quitar el cuadro gris de fondo que confunde
                        cursor={{ fill: 'transparent' }}
                        wrapperStyle={{ zIndex: 1000 }}
                        contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '8px', 
                            border: '1px solid #dee2e6',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            color: '#333'
                        }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Venta Total']}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                const dataOriginal = payload[0].payload;
                                return new Date(dataOriginal.fechaFin).toLocaleDateString('es-CO', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            }
                            return label;
                        }}
                    />
                    
                    <ReferenceLine y={0} stroke="#000" />
                    
                    {/* 2. AGREGAMOS 'activeBar': Esto hace que la barra se ilumine/cambie al pasar el mouse */}
                    <Bar 
                        dataKey="totalVentasSistema" 
                        fill="#198754" 
                        name="Ventas" 
                        radius={[4, 4, 0, 0]}
                        // Al pasar el mouse, la barra se pone verde oscuro y borde amarillo (Tus colores de marca)
                        activeBar={<Rectangle fill="#145c32" stroke="#FFC107" strokeWidth={2} />}
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
                            <td>{new Date(cierre.fechaFin).toLocaleDateString()} <br/><span className="text-muted">{new Date(cierre.fechaFin).toLocaleTimeString()}</span></td>
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