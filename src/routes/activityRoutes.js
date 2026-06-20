const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middleware/auth');

// Cualquier usuario logueado puede consultar las actividades
router.get('/', auth(), activityController.getAllActivities);

// Solo el rol 'Admin' puede alterar las actividades
router.post('/', auth(['Admin']), activityController.createActivity);
router.put('/:id', auth(['Admin']), activityController.updateActivity);
router.delete('/:id', auth(['Admin']), activityController.deleteActivity);

module.exports = router;