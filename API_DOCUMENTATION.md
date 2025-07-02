# Calma Mi Alma - API Documentation

## Usuarios de Prueba Creados

### Usuario Básico (Gratuito)
- **Email**: test@calmamialma.com
- **Password**: password123
- **Tipo**: Usuario gratuito
- **Funcionalidades**: Tarot básico, ver servicios

### Usuario Premium
- **Email**: premium@calmamialma.com  
- **Password**: premium123
- **Tipo**: Usuario premium
- **Funcionalidades**: Tarot premium, carta astral, horóscopo, blog, videos, descuentos

## Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Login con email/password
- `POST /api/auth/google` - Login con Google OAuth (en desarrollo)
- `POST /api/auth/register` - Registro de nuevo usuario
- `GET /api/auth/me` - Obtener información del usuario actual

### Tarot
- `GET /api/tarot/daily` - Obtener lectura diaria (requiere autenticación)

### Carta Astral (Solo Premium)
- `POST /api/natal-chart` - Generar carta astral personalizada

### Horóscopo
- `POST /api/horoscope/daily` - Obtener horóscopo diario

### Suscripciones
- `POST /api/subscription/upgrade` - Actualizar a premium (simulado)
- `POST /api/subscription/create-payment-intent` - Crear intención de pago Stripe

### Utilidades
- `GET /api/health` - Estado de salud del sistema
- `GET /` - Información básica de la API

## URLs de la Aplicación

### Frontend
- **URL**: http://localhost:5173
- **Tecnología**: React + Vite + Tailwind CSS

### Backend
- **URL**: http://localhost:8001
- **Tecnología**: FastAPI + MongoDB
- **Documentación**: http://localhost:8001/docs (Swagger)

## Base de Datos
- **MongoDB**: localhost:27017
- **Database**: calmamialma
- **Collections**: users, tarot_readings, natal_charts

## Estado Actual - Fase 1 ✅

✅ Backend funcional con FastAPI + MongoDB
✅ Autenticación con JWT
✅ Sistema de usuarios (básico y premium)
✅ API de tarot con lecturas personalizadas
✅ API de carta astral (premium)
✅ API de horóscopo diario
✅ Frontend actualizado para usar backend real
✅ Sistema de autenticación integrado
✅ Diferenciación de funcionalidades por tipo de usuario

## Próximas Fases

**Fase 2**: Integración con APIs de IA (OpenAI/Gemini)
**Fase 3**: Sistema de pagos con Stripe
**Fase 4**: Google OAuth y optimizaciones

## Notas Técnicas

- El backend está configurado para usar OpenAI para generar contenido personalizado
- Las lecturas de tarot son generadas por IA cuando se configura OPENAI_API_KEY
- El sistema de pagos con Stripe está preparado pero requiere configuración de claves
- Google OAuth está preparado pero requiere configuración de cliente ID

## Configuración de Variables de Entorno

Para activar todas las funcionalidades, configura estas variables en `/app/backend/.env`:

```
OPENAI_API_KEY=tu_clave_openai_aqui
GOOGLE_CLIENT_ID=tu_google_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui
STRIPE_SECRET_KEY=tu_stripe_secret_key_aqui
```