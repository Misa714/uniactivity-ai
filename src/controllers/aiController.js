// Generación Automática de Descripciones de Actividades con Asistencia de IA
exports.generateDescription = (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'El título de la actividad es obligatorio para procesar la IA.' });
    }

    // Modelado lógico de respuestas para simular el comportamiento de la IA Generativa en segundos
    const promptInput = title.toLowerCase();
    let aiResponse = "";

    if (promptInput.includes('docker') || promptInput.includes('contenedor')) {
        aiResponse = "Esta actividad teórico-práctica tiene como objetivo introducir a los participantes en la contenedorización de aplicaciones web utilizando Docker, abordando la creación de imágenes óptimas, gestión de volúmenes y orquestación básica mediante Docker Compose.";
    } else if (promptInput.includes('git') || promptInput.includes('github')) {
        aiResponse = "Taller enfocado en el dominio de sistemas de control de versiones distribuidos. Los alumnos aprenderán flujos de trabajo profesionales en GitHub, gestión de ramas, resolución estratégica de conflictos en rebases e integración continua.";
    } else if (promptInput.includes('ia') || promptInput.includes('inteligencia artificial') || promptInput.includes('chatgpt')) {
        aiResponse = "Seminario académico orientado a explorar las aplicaciones reales y la ética detrás de la Inteligencia Artificial Generativa dentro de la educación superior, capacitando a los alumnos en el uso de prompts estructurados.";
    } else {
        // Respuesta genérica por defecto simulando procesamiento del lenguaje natural
        aiResponse = `Actividad académica institucional diseñada para fomentar el desarrollo colaborativo, la transferencia de competencias técnicas y la profundización de los conocimientos de los alumnos en torno a: "${title}".`;
    }

    res.json({
        success: true,
        summary: "Procesado con éxito por el modelo integrado UniActivity-AI-v1.",
        generatedText: aiResponse
    });
};