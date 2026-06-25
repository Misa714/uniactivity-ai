const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// Cualquier usuario con login válido puede usar el asistente de IA
router.post('/generate', auth(), aiController.generateDescription);

module.exports = router;
