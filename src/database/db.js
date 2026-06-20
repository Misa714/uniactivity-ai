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
            console.log('Tablas base creadas con éxito.');
        });
    }
});

module.exports = db;