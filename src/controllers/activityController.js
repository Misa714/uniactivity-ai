const db = require('../database/db');

// Crear Actividad
exports.createActivity = (req, res) => {
    const { title, description, date } = req.body;
    if (!title || !description || !date) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    db.run(
        `INSERT INTO activities (title, description, date) VALUES (?, ?, ?)`,
        [title, description, date],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Error al crear la actividad.' });
            }
            res.status(201).json({ message: 'Actividad creada con éxito.', activityId: this.lastID });
        }
    );
};

// Consultar todas las Actividades
exports.getAllActivities = (req, res) => {
    db.all(`SELECT * FROM activities`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Error al obtener las actividades.' });
        }
        res.json(rows);
    });
};

// Modificar Actividad
exports.updateActivity = (req, res) => {
    const { id } = req.params;
    const { title, description, date } = req.body;

    db.run(
        `UPDATE activities SET title = ?, description = ?, date = ? WHERE id = ?`,
        [title, description, date, id],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Error al actualizar la actividad.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Actividad no encontrada.' });
            }
            res.json({ message: 'Actividad modificada con éxito.' });
        }
    );
};

// Eliminar Actividad
exports.deleteActivity = (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM activities WHERE id = ?`, [id], function (err) {
        if (err) {
            return res.status(500).json({ message: 'Error al eliminar la actividad.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Actividad no encontrada.' });
        }
        res.json({ message: 'Actividad eliminada con éxito.' });
    });
};