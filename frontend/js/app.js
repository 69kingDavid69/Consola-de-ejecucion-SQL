// SQL Console con Historial

// Key para localStorage
const HISTORY_KEY = 'sql_console_history';

// Estructura de historial
let queryHistory = [];

// Cargar historial al iniciar
function loadHistory() {
  const saved = localStorage.getItem(HISTORY_KEY);
  queryHistory = saved ? JSON.parse(saved) : [];
  renderHistory();
}

// Guardar query en historial
function saveToHistory(sql, success, data, error) {
  const entry = {
    id: Date.now(),
    sql: sql,
    timestamp: new Date().toLocaleString('es-ES'),
    success: success,
    data: data,
    error: error,
    rowCount: Array.isArray(data) ? data.length : 0
  };
  
  queryHistory.unshift(entry); // Agregar al inicio
  
  // Limitar a 50 queries en historial
  if (queryHistory.length > 50) {
    queryHistory = queryHistory.slice(0, 50);
  }
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(queryHistory));
  renderHistory();
}

// Renderizar historial
function renderHistory() {
  const historyList = document.getElementById('historyList');
  
  if (queryHistory.length === 0) {
    historyList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay queries ejecutadas</p>';
    return;
  }
  
  let html = '';
  queryHistory.forEach(item => {
    const statusClass = item.success ? 'success' : 'error';
    const statusText = item.success ? `✓ ${item.rowCount} filas` : `✗ Error`;
    
    html += `
      <div class="history-item">
        <div class="history-time">${item.timestamp}</div>
        <div class="history-sql">${escapeHtml(item.sql.substring(0, 100))}${item.sql.length > 100 ? '...' : ''}</div>
        <div class="history-status ${statusClass}">${statusText}</div>
        <div class="history-actions">
          <button onclick="useFromHistory(${item.id})">Reutilizar</button>
          <button onclick="viewHistoryDetails(${item.id})">Ver</button>
          <button class="delete" onclick="deleteFromHistory(${item.id})">Eliminar</button>
        </div>
      </div>
    `;
  });
  
  historyList.innerHTML = html;
}

// Reutilizar query del historial
function useFromHistory(id) {
  const item = queryHistory.find(h => h.id === id);
  if (item) {
    document.getElementById('sqlInput').value = item.sql;
    document.getElementById('sqlInput').focus();
  }
}

// Ver detalles del historial
function viewHistoryDetails(id) {
  const item = queryHistory.find(h => h.id === id);
  if (!item) return;
  
  const resultEl = document.getElementById('queryResult');
  
  let html = `<div style="margin-bottom: 10px;">
    <strong>Ejecutado:</strong> ${item.timestamp}<br>
    <strong>Query:</strong><br>
    <pre style="background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto;">${escapeHtml(item.sql)}</pre>
  </div>`;
  
  if (item.success) {
    html += '<span class="result-success">✓ Éxito</span>';
    if (Array.isArray(item.data) && item.data.length > 0) {
      html += formatResultsAsTable(item.data);
    } else {
      html += '<p class="result-info">(Sin resultados o bien ejecutado)</p>';
    }
  } else {
    html += `<span class="result-error">✗ Error: ${escapeHtml(item.error)}</span>`;
  }
  
  resultEl.innerHTML = html;
}

// Eliminar del historial
function deleteFromHistory(id) {
  if (!confirm('¿Eliminar este query del historial?')) return;
  queryHistory = queryHistory.filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(queryHistory));
  renderHistory();
}

// Limpiar todo el historial
function clearHistory() {
  if (!confirm('¿Eliminar TODO el historial? Esta acción no se puede deshacer.')) return;
  queryHistory = [];
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

// Ejecutar SQL
async function executeSql() {
  const sql = document.getElementById('sqlInput').value.trim();
  const resultEl = document.getElementById('queryResult');
  
  if (!sql) {
    resultEl.innerHTML = '<span class="result-error">Error: Ingresa una query SQL</span>';
    return;
  }

  resultEl.innerHTML = 'Ejecutando...';
  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    const data = await res.json();
    
    if (data.success) {
      const formattedResult = formatResultsAsTable(data.data);
      resultEl.innerHTML = '<span class="result-success">✓ Éxito</span>' + formattedResult;
      saveToHistory(sql, true, data.data, null);
    } else {
      resultEl.innerHTML = '<span class="result-error">✗ Error:</span> ' + data.error;
      saveToHistory(sql, false, null, data.error);
    }
  } catch (err) {
    resultEl.innerHTML = '<span class="result-error">✗ Error de conexión:</span> ' + err.message;
    saveToHistory(sql, false, null, err.message);
  }
}

// Formatear resultados como tabla
function formatResultsAsTable(data) {
  // Si no hay datos
  if (!data) {
    return '<p class="result-info">(Sin resultados o bien ejecutado)</p>';
  }

  // Si es un array (típico de SELECT)
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '<p class="result-info">(Sin resultados)</p>';
    }

    if (typeof data[0] === 'object') {
      const firstItem = data[0];
      const headers = Object.keys(firstItem);
      
      let html = '<div class="table-wrapper"><table class="result-table"><thead><tr>';
      
      // Headers
      headers.forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
      });
      html += '</tr></thead><tbody>';
      
      // Rows
      data.forEach((item, idx) => {
        const bgClass = idx % 2 === 0 ? 'even' : 'odd';
        html += `<tr class="${bgClass}">`;
        headers.forEach(header => {
          const val = item[header];
          const display = val === null ? '(null)' : escapeHtml(String(val));
          html += `<td>${display}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</tbody></table></div>';
      return html;
    }
  }

  // Detectar respuesta de INSERT/UPDATE/DELETE/CREATE (objeto de MySQL)
  if (typeof data === 'object' && !Array.isArray(data)) {
    // Si tiene las propiedades típicas de una respuesta de MySQL
    if (data.hasOwnProperty('affectedRows') || data.hasOwnProperty('insertId')) {
      let html = '<div class="result-details">';
      
      // Determinar tipo de operación basado en lo disponible
      if (data.affectedRows > 0) {
        html += `<p class="result-success-text">✓ <strong>${data.affectedRows}</strong> fila(s) afectada(s)</p>`;
      } else if (data.affectedRows === 0 && !data.insertId) {
        html += `<p class="result-info-text">✓ Operación completada</p>`;
      }
      
      if (data.insertId && data.insertId > 0) {
        html += `<p class="result-success-text">✓ ID insertado: <strong>${data.insertId}</strong></p>`;
      }
      
      if (data.changedRows !== undefined && data.changedRows > 0) {
        html += `<p class="result-success-text">✓ Filas modificadas: <strong>${data.changedRows}</strong></p>`;
      }
      
      if (data.info && data.info.trim()) {
        html += `<p class="result-info-text">📊 ${escapeHtml(data.info)}</p>`;
      }
      
      html += '</div>';
      return html;
    }
    
    // Si solo es un objeto genérico, mostrarlo de forma legible
    let html = '<div class="result-details">';
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        const value = typeof data[key] === 'object' 
          ? JSON.stringify(data[key]) 
          : escapeHtml(String(data[key]));
        html += `<p><strong>${escapeHtml(key)}:</strong> ${value}</p>`;
      }
    }
    html += '</div>';
    return html;
  }

  // Fallback: mostrar como JSON formateado
  return '<pre style="background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto;">' + 
         escapeHtml(JSON.stringify(data, null, 2)) + 
         '</pre>';
}

// Limpiar entrada
function clearInput() {
  document.getElementById('sqlInput').value = '';
  document.getElementById('queryResult').innerHTML = '';
}

// Escape HTML para evitar XSS
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

// Cargar historial al iniciar
document.addEventListener('DOMContentLoaded', loadHistory);
