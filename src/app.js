require('dotenv').config();
const express = require('express');

// Validación de variables de entorno críticas al arranque
if (!process.env.JWT_SECRET) {
    console.error('⛔ FATAL: JWT_SECRET no está definido en el entorno. El servidor no puede arrancar de forma segura.');
    process.exit(1);
}
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Enlace de endpoints de la API
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor UniActivity AI levantado.' });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en: http://localhost:${PORT}`);
    });
}

module.exports = app;