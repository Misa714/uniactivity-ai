const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middleware/auth');

// Cualquier usuario logueado puede consultar las actividades
router.get('/', auth(), activityController.getAllActivities);

// Solo el rol 'Admin' (Docente/Administrador) puede alterar las actividades
router.post('/', auth(['Admin']), activityController.createActivity);
router.put('/:id', auth(['Admin']), activityController.updateActivity);
router.delete('/:id', auth(['Admin']), activityController.deleteActivity);

// --- GESTIÓN DE PARTICIPANTES (ESTUDIANTES & DOCENTES) ---

// Inscribirse a una actividad (Cualquier estudiante logueado)
router.post('/inscribe', auth(), activityController.inscribeStudent);

// Consultar participantes inscritos, asistencia y seguimiento
router.get('/:id/participants', auth(), activityController.getParticipants);

// Control de asistencia y seguimiento (Solo el rol 'Admin' puede modificarlo)
router.put('/participants/:inscriptionId', auth(['Admin']), activityController.updateAttendanceAndProgress);

module.exports = router;