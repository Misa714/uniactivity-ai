const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'uniactivity.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');

        db.serialize(() => {
            // 1. Tabla de Usuarios con Roles
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT
            )`);

            // 2. Tabla de Actividades Universitarias (Esquema final con rango de fechas y estado)
            db.run(`CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                start_date TEXT,
                end_date TEXT,
                status TEXT DEFAULT 'En curso'
            )`);

            // Parches de migración en caliente por si la base de datos ya existía en el contenedor
            db.run("ALTER TABLE activities ADD COLUMN start_date TEXT", () => { });
            db.run("ALTER TABLE activities ADD COLUMN end_date TEXT", () => { });
            db.run("ALTER TABLE activities ADD COLUMN status TEXT DEFAULT 'En curso'", () => { });

            // 3. Tabla de Inscripciones (Gestión de Participantes, Asistencia y Seguimiento)
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

            console.log('Estructura de datos relacional inicializada correctamente.');
        });
    }
});

module.exports = db;