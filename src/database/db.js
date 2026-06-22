const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'uniactivity.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');

        db.serialize(() => {
            // Tabla de Usuarios con Roles (Admin y Estudiante)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT
            )`);

            // Tabla de Actividades Universitarias
            db.run(`CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                date TEXT
            )`);

            // NUEVA: Tabla de Inscripciones (Gestión de Participantes, Asistencia y Seguimiento)
            db.run(`CREATE TABLE IF NOT EXISTS inscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id INTEGER,
                estudiante_id INTEGER,
                asistencia TEXT DEFAULT 'Pendiente',
                seguimiento TEXT DEFAULT 'En Progreso',
                FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                FOREIGN KEY(estudiante_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(activity_id, estudiante_id)
            )`);

            console.log('Tablas base e inscripciones creadas con éxito.');
        });
    }
});

module.exports = db;