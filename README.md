# SQL Console - Backend MySQL con Node.js y Express

## Descripción General

Este es un backend construido con **Node.js** y **Express** que proporciona una **Consola SQL** en el navegador para ejecutar queries personalizadas en una base de datos **MySQL**.

La aplicación permite:

1. **Ejecutar cualquier query SQL** directamente desde el navegador
2. **Ver resultados en tablas** formateadas de manera clara y legible
3. **Manejo automático de resultados** (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, etc.)

---

## Estructura del Proyecto

```
/
├── README.md                         # Este archivo
├── backend/
│   ├── .env                          # Variables de entorno (credenciales DB)
│   ├── package.json                  # Dependencias y scripts
│   ├── package-lock.json             # Lock file de npm
│   └── src/
│       ├── index.js                  # Servidor principal de Express
│       ├── db.js                     # Conexión a MySQL
│       └── routes/                   # (vacío - no hay CRUD)
└── frontend/
    ├── index.html                    # Página principal
    ├── css/
    │   └── styles.css                # Estilos CSS
    └── js/
        └── app.js                    # JavaScript del cliente
```

---

## Configuración Inicial

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar `.env`
Crea un archivo `backend/.env` con:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=metatron
DB_NAME=actividad
PORT=3000
```

### 3. Crear la tabla (si no existe)
Abre el cliente MySQL y ejecuta:
```sql
USE actividad;

CREATE TABLE IF NOT EXISTS items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT
);

-- Agregar datos de ejemplo (opcional)
INSERT INTO items (name, description) VALUES 
('Laptop', 'Computadora portátil'),
('Mouse', 'Periférico de entrada'),
('Teclado', 'Dispositivo de entrada');
```

### 4. Iniciar el servidor
```bash
# Desarrollo (con auto-recarga)
npm run dev

# Producción
npm start
```

Verás: `Server listening on port 3000`

### 5. Abrir en el navegador
```
http://localhost:3000/
```

---

## Archivos Detallados

### `backend/.env` - Variables de Entorno

Almacena datos sensibles sin exponerlos en el código:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=metatron
DB_NAME=actividad
PORT=3000
```

**Seguridad:** Este archivo debe estar en `.gitignore` (nunca se sube a Git)

---

### `backend/package.json` - Dependencias

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "mysql2": "^3.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

**Dependencias:**
- `express`: Framework web para rutas y middleware
- `mysql2`: Cliente MySQL con soporte para promesas
- `dotenv`: Carga variables del `.env`
- `cors`: Permite solicitudes desde el navegador
- `nodemon` (dev): Reinicia servidor automáticamente

**`"type": "module"`:** Indica uso de módulos ES6 (`import/export`)

---

### `backend/src/db.js` - Conexión MySQL

```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;
```

**¿Qué hace?**
- Crea un **pool de conexiones** (reutiliza conexiones)
- Lee credenciales del `.env`
- Permite máximo 10 conexiones simultáneas
- Se importa en otros archivos para ejecutar queries

---

### `backend/src/index.js` - Servidor Principal

```javascript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.join(__dirname, '../../frontend');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

// ✅ ÚNICA RUTA: Ejecutar SQL personalizado
app.post('/api/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query is required' });
    }
    
    const [result] = await pool.query(sql);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

**¿Qué hace?**

1. **Línea 1:** Carga variables del `.env` en `process.env`
2. **Línea 10:** Calcula ruta al folder frontend
3. **Middleware:**
   - `cors()`: Permite solicitudes desde navegador
   - `express.json()`: Convierte JSON en objetos JS
   - `express.static()`: Sirve archivos HTML, CSS, JS
4. **POST /api/query:** 
   - Recibe `{ sql: "tu query aquí" }`
   - Ejecuta la query en MySQL
   - Devuelve `{ success: true, data: [...] }`
   - Si error: devuelve `{ success: false, error: "..." }`
5. **Inicia servidor** en puerto 3000

**Rutas disponibles:**

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/` | Sirve index.html |
| GET | `/css/styles.css` | Hoja de estilos |
| GET | `/js/app.js` | JavaScript |
| POST | `/api/query` | Ejecuta SQL personalizado |

---

### `frontend/index.html` - Página Principal

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>SQL Console</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <div class="container">
    <h1>SQL Console</h1>
    
    <div id="sqlConsole">
      <h2>Ejecutar Query SQL</h2>
      <textarea id="sqlInput" placeholder="Escribe tu query SQL aquí..."></textarea>
      <div class="button-group">
        <button onclick="executeSql()">Ejecutar</button>
        <button onclick="clearInput()">Limpiar</button>
      </div>
      <div id="queryResult"></div>
    </div>
  </div>

  <script src="js/app.js"></script>
</body>
</html>
```

---

### `frontend/js/app.js` - Lógica del Cliente

**Función principal: `executeSql()`**

Obtiene SQL del textarea, valida entrada, envía POST a `/api/query` y muestra resultados formateados como tabla HTML.

**Función: `formatResultsAsTable(data)`**

Convierte array JSON en tabla HTML:
- **SELECT:** Tabla con headers y filas
- **INSERT/UPDATE/DELETE:** Info sobre filas afectadas
- Null values: Muestra "(null)"
- Headers en azul, filas alternadas en gris

**Función: `clearInput()`**

Limpia textarea y div de resultados

---

## Ejemplos de Uso

### Crear tabla
```sql
CREATE TABLE IF NOT EXISTS items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  description TEXT
);
```

### Insertar datos
```sql
INSERT INTO items (name, description) VALUES 
('Laptop', 'Computadora'),
('Mouse', 'Periférico'),
('Teclado', 'Entrada');
```

### Consultar datos
```sql
SELECT * FROM items;
```

**Resultado en pantalla:** Tabla con headers y filas formateadas

### Actualizar datos
```sql
UPDATE items SET description = 'Periférico de entrada' WHERE id = 2;
```

### Eliminar datos
```sql
DELETE FROM items WHERE id = 3;
```

---

## Flujo Completo de Ejecución

```
1. npm run dev
   └─> server/src/index.js inicia
       └─> Carga .env, Conecta con MySQL, Inicia servidor en puerto 3000

2. Usuario abre http://localhost:3000
   └─> Express sirve frontend/index.html
       OAuth tokens cargan en navegador

3. Usuario escribe SQL y da click en "Ejecutar"
   └─> JavaScript ejecuta fetch('/api/query', { POST })
       └─> Request llega a src/index.js
           └─> Handler ejecuta pool.query(sql)
               └─> MySQL ejecuta el SQL
                   └─> Resultado vuelve como JSON
                       └─> formatResultsAsTable() lo convierte a tabla
                           └─> Se muestra en el navegador
```

---

## Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:3306"
- MySQL no está corriendo
- Solución: Inicia MySQL con `mysql.server start` (macOS) o desde XAMPP

### Error: "Access denied for user 'root'@'localhost'"
- Credenciales equivocadas en `.env`
- Solución: Verifica DB_USER y DB_PASSWORD

### Error: "Unknown database 'actividad'"
- Database no existe
- Solución: Crea en MySQL: `CREATE DATABASE actividad;`

### Error: "Table 'actividad.items' doesn't exist"
- Tabla no creada
- Solución: Usa SQL Console para ejecutar CREATE TABLE

### Frontend no carga
- Verifica que frontend/ contenga index.html, css/, js/
- Verifica path en src/index.js: `path.join(__dirname, '../../frontend')`

---

## Información de Seguridad

⚠️ **IMPORTANTE:** Este proyecto es para aprendizaje local.

**Para producción:**
1. ❌ No expongas credenciales de BD en .env público
2. ❌ No permitas SQL arbitrario sin validación
3. ✅ Usa queries parametrizadas
4. ✅ Implementa autenticación/autorización
5. ✅ Valida y sanitiza entrada del usuario

---

## Mejoras Futuras

- [ ] Agregar autenticación de usuarios
- [ ] Validar y limitar tipos de SQL permitido
- [ ] Mostrar historial de queries ejecutadas
- [ ] Exportar resultados a CSV/Excel
- [ ] Syntax highlighting para SQL input
- [ ] Paginación para resultados grandes
- [ ] Tema oscuro/claro

---

**¿Preguntas?** Revisa los archivos fuente - están bien documentados.
