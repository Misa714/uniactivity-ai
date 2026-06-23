const db = require('../database/db');

// ==========================================
// CRUD DE ACTIVIDADES UNIVERSITARIAS
// ==========================================

// Crear Actividad (Docente)
exports.createActivity = (req, res) => {
    const { title, description, start_date, end_date } = req.body;
    if (!title || !description || !start_date || !end_date) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    db.run(
        `INSERT INTO activities (title, description, start_date, end_date, status) VALUES (?, ?, ?, ?, 'En curso')`,
        [title, description, start_date, end_date],
        function (err) {
            if (err) {
                console.error("ERROR EN createActivity:", err.message);
                return res.status(500).json({ message: 'Error al crear la actividad.', error: err.message });
            }
            res.status(201).json({ message: 'Actividad creada con éxito.', activityId: this.lastID });
        }
    );
};

// Consultar todas las Actividades (Estudiantes y Docentes)
exports.getAllActivities = (req, res) => {
    db.all(`SELECT * FROM activities`, [], (err, rows) => {
        if (err) {
            console.error("ERROR EN getAllActivities:", err.message);
            return res.status(500).json({ message: 'Error al obtener las actividades.', error: err.message });
        }
        res.json(rows);
    });
};

// Modificar Actividad por ID (Docente)
exports.updateActivity = (req, res) => {
    const { id } = req.params;
    const { title, description, start_date, end_date, status } = req.body;

    if (!title || !description || !start_date || !end_date || !status) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios para actualizar.' });
    }

    db.run(
        `UPDATE activities SET title = ?, description = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?`,
        [title, description, start_date, end_date, status, id],
        function (err) {
            if (err) {
                console.error("ERROR EN updateActivity:", err.message);
                return res.status(500).json({ message: 'Error al actualizar la actividad.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Actividad no encontrada.' });
            }
            res.json({ message: 'Actividad modified con éxito.' });
        }
    );
};

// Eliminar Actividad (Docente)
exports.deleteActivity = (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM activities WHERE id = ?`, [id], function (err) {
        if (err) {
            console.error("ERROR EN deleteActivity:", err.message);
            return res.status(500).json({ message: 'Error al eliminar la actividad.', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Actividad no encontrada.' });
        }
        res.json({ message: 'Actividad eliminada con éxito.' });
    });
};

// ==========================================
// GESTIÓN DE PARTICIPANTES (INSCRIPCIONES)
// ==========================================

// Inscribir Estudiante a una Actividad Activa
exports.inscribeStudent = (req, res) => {
    const { activity_id } = req.body;
    const estudiante_id = req.user ? (req.user.id || req.user.userId) : null;

    if (!activity_id || !estudiante_id) {
        return res.status(400).json({ message: 'ID de actividad o estudiante faltante.' });
    }

    db.run(
        `INSERT INTO inscriptions (activity_id, estudiante_id, asistencia, seguimiento) VALUES (?, ?, 'Pendiente', 'En Progreso')`,
        [activity_id, estudiante_id],
        function (err) {
            if (err) {
                console.error("ERROR EN inscribeStudent:", err.message);
                return res.status(500).json({ message: 'Error al inscribirse a la actividad o ya estás inscrito.', error: err.message });
            }
            res.status(201).json({ message: 'Inscripción realizada con éxito.', inscriptionId: this.lastID });
        }
    );
};

// Consultar Participantes de una Actividad (Docente - Para el Modal)
exports.getParticipants = (req, res) => {
    const { id } = req.params;

    db.all(
        `SELECT i.id, u.username, i.asistencia, i.seguimiento 
         FROM inscriptions i 
         JOIN users u ON i.estudiante_id = u.id 
         WHERE i.activity_id = ?`,
        [id],
        (err, rows) => {
            if (err) {
                console.error("ERROR EN getParticipants:", err.message);
                return res.status(500).json({ message: 'Error al obtener la lista de participantes.', error: err.message });
            }
            res.json(rows);
        }
    );
};

// Control de Asistencia y Seguimiento (Docente)
exports.updateAttendanceAndProgress = (req, res) => {
    const { inscriptionId } = req.params;
    const { asistencia, seguimiento } = req.body;

    if (!asistencia || !seguimiento) {
        return res.status(400).json({ message: 'Asistencia y seguimiento son obligatorios.' });
    }

    db.run(
        `UPDATE inscriptions SET asistencia = ?, seguimiento = ? WHERE id = ?`,
        [asistencia, seguimiento, inscriptionId],
        function (err) {
            if (err) {
                console.error("ERROR EN updateAttendanceAndProgress:", err.message);
                return res.status(500).json({ message: 'Error al actualizar el control de participantes.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Registro de participación no encontrado.' });
            }
            res.json({ message: 'Control de asistencia y seguimiento actualizado con éxito.' });
        }
    );
};