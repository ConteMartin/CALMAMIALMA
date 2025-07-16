// Datos de las 40 cartas del tarot
// Estructura: cada carta tiene un id, título, descripción básica, y descripción premium
export const tarotCardsData = [
  {
    id: 1,
    title: "ERES SUFICIENTE, TAL COMO ERES",
    description: "Esta carta te invita a recordarte una verdad esencial: no necesitas demostrar nada. Tu valor no depende de tus logros, tu apariencia o de la aprobación externa. Eres suficiente desde el primer latido de tu corazón.",
    premiumDescription: "Mírate con ternura, con esa mirada compasiva que tanto ofreces a los demás. Abre espacio para aceptar tus imperfecciones, porque incluso ellas forman parte de tu magia. Hoy es un día perfecto para practicar la autocompasión y recordar que tu esencia es pura luz.",
    practiceText: "✨ Práctica sugerida: Párate frente al espejo, mírate a los ojos y repite tres veces: 'Soy suficiente. Me amo tal como soy. Hoy me honro.' Respira hondo y permite que ese mensaje llegue a tu corazón.",
    imageUrl: "/tarot1.png"
  },
  {
    id: 2,
    title: "NUEVA ESPERANZA RENACE",
    description: "Los ciclos terminan para dar paso a nuevos comienzos. Esta carta anuncia que después de un período de pausa o dificultad, llega la renovación y las oportunidades frescas.",
    premiumDescription: "El universo está conspirando a tu favor. Las semillas que plantaste en silencio están germinando. Es momento de confiar en el proceso y abrirte a recibir las bendiciones que están por llegar. Tu fe será recompensada.",
    practiceText: "✨ Práctica sugerida: Escribe en un papel tres cosas que quieres manifestar en tu vida. Luego, siéntate en silencio, cierra los ojos y visualiza cada una de ellas ya cumplida. Siente la gratitud en tu corazón.",
    imageUrl: "/tarot2.png"
  },
  {
    id: 3,
    title: "EL CAMINO SE ACLARA",
    description: "La confusión se disipa y la claridad mental llega a tu vida. Las decisiones que has estado posponiendo encontrarán su respuesta natural.",
    premiumDescription: "Tu intuición está especialmente activa hoy. Confía en esas corazonadas que surgen sin explicación lógica. Los sincronismos y las señales del universo te guiarán hacia la dirección correcta. Mantén los ojos abiertos a los mensajes sutiles.",
    practiceText: "✨ Práctica sugerida: Dedica 10 minutos a meditar en silencio. Pregúntale a tu corazón: '¿Qué necesito saber hoy?' Escucha sin juzgar las primeras impresiones que lleguen a tu mente.",
    imageUrl: "/tarot3.png"
  },
  // AQUÍ PUEDES AGREGAR LAS CARTAS 4-40 CON LA MISMA ESTRUCTURA
  // Ejemplo de cómo agregar más cartas:
  {
    id: 4,
    title: "TÍTULO DE LA CARTA 4",
    description: "Descripción básica de la carta 4 que verán todos los usuarios...",
    premiumDescription: "Descripción extendida y detallada solo para usuarios premium...",
    practiceText: "✨ Práctica sugerida: Instrucciones específicas para la práctica espiritual...",
    imageUrl: "/tarot4.png"
  },
  {
    id: 5,
    title: "TÍTULO DE LA CARTA 5",
    description: "Descripción básica de la carta 5 que verán todos los usuarios...",
    premiumDescription: "Descripción extendida y detallada solo para usuarios premium...",
    practiceText: "✨ Práctica sugerida: Instrucciones específicas para la práctica espiritual...",
    imageUrl: "/tarot5.png"
  },
  // ... continúa hasta la carta 40
  {
    id: 40,
    title: "TÍTULO DE LA CARTA 40",
    description: "Descripción básica de la carta 40 que verán todos los usuarios...",
    premiumDescription: "Descripción extendida y detallada solo para usuarios premium...",
    practiceText: "✨ Práctica sugerida: Instrucciones específicas para la práctica espiritual...",
    imageUrl: "/tarot40.png"
  }
];

// Función para obtener una carta aleatoria diferente a la anterior
export const getRandomCard = (excludeId = null) => {
  let availableCards = tarotCardsData;
  
  // Si hay una carta a excluir, filtrarla
  if (excludeId !== null) {
    availableCards = tarotCardsData.filter(card => card.id !== excludeId);
  }
  
  // Seleccionar una carta aleatoria
  const randomIndex = Math.floor(Math.random() * availableCards.length);
  return availableCards[randomIndex];
};

// Función para obtener una carta por ID
export const getCardById = (id) => {
  return tarotCardsData.find(card => card.id === id);
};

// Función para obtener todas las cartas en orden aleatorio para mostrar en el abanico
export const getShuffledCards = () => {
  const shuffled = [...tarotCardsData];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};