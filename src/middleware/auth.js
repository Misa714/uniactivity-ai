const jwt = require('jsonwebtoken');

module.exports = (rolesPermitidos = []) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Si se exigen roles específicos y el usuario no lo tiene, se bloquea
            if (rolesPermitidos.length && !rolesPermitidos.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
            }

            next();
        } catch (error) {
            res.status(403).json({ message: 'Token inválido o expirado.' });
        }
    };
};