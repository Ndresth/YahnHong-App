import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function Reportes() {
  const [cierres, setCierres] = useState([]);
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/cierres', { headers: { 'Authorization': `Bearer ${getToken()}` } })
    .then(res => res.json())
    .then(data => {
        // Formateamos fechas para el gráfico
        const formattedData = data.map(item => ({
            ...item,
            fechaCorta: new Date(item.fechaFin).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
        })).reverse(); // Revertimos para que el gráfico vaya de izquierda a derecha cronológicamente
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
              a.download = `Reporte_Historico_${cierreId}.xlsx`;
              document.body.appendChild(a);
              a.click();
              a.remove();
          }
      } catch(e) { console.error(e); alert("Error de descarga"); }
  };

  return (
    <div className="card shadow border-0 animate__animated animate__fadeIn">
      <div className="card-header bg-white fw-bold py-3 border-bottom">
          <i className="bi bi-graph-up-arrow me-2 text-primary"></i>Rendimiento Financiero
      </div>
      <div className="card-body">
        
        {/* GRÁFICO */}
        <div style={{ height: 300, width: '100%', marginBottom: '40px' }}>
            <h6 className="text-center text-muted mb-4 small text-uppercase">Ventas de los últimos turnos</h6>
            <ResponsiveContainer>
                <BarChart data={cierres}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fechaCorta" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} contentStyle={{borderRadius: '8px'}} />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="totalVentasSistema" fill="#FFC107" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* TABLA HISTÓRICA */}
        <h5 className="fw-bold mb-3 text-dark"><i className="bi bi-clock-history me-2"></i>Historial de Cierres</h5>
        <div className="table-responsive">
            <table className="table table-hover align-middle small">
                <thead className="table-light">
                    <tr><th>Fecha Cierre</th><th>Ventas</th><th>Gastos</th><th>Real (Caja)</th><th>Balance</th><th>Acción</th></tr>
                </thead>
                <tbody>
                    {[...cierres].reverse().map(cierre => (
                        <tr key={cierre._id}>
                            <td>
                                <strong>{new Date(cierre.fechaFin).toLocaleDateString()}</strong>
                                <br/><span className="text-muted">{new Date(cierre.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="fw-bold text-success">${cierre.totalVentasSistema.toLocaleString()}</td>
                            <td className="text-danger">-${cierre.totalGastos.toLocaleString()}</td>
                            <td className="fw-bold text-dark">${cierre.totalEfectivoReal.toLocaleString()}</td>
                            <td>
                                {cierre.diferencia === 0 ? <span className="badge bg-success rounded-pill px-3">Cuadrado</span> : 
                                 cierre.diferencia > 0 ? <span className="badge bg-info text-dark rounded-pill">Sobra ${cierre.diferencia.toLocaleString()}</span> : 
                                 <span className="badge bg-danger rounded-pill">Falta ${Math.abs(cierre.diferencia).toLocaleString()}</span>}
                            </td>
                            <td>
                                <button className="btn btn-sm btn-outline-success rounded-circle" onClick={() => handleDownloadHistorical(cierre._id)} title="Descargar Excel">
                                    <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {cierres.length === 0 && <tr><td colSpan="6" className="text-center py-4 text-muted">No hay historial de cierres aún.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}