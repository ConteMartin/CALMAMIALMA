from fastapi import FastAPI, HTTPException, Depends, status, Request, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.security.utils import get_authorization_scheme_param
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import uuid
import asyncio
import json
import requests
import openai
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import stripe
from decouple import config
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de variables de entorno
SECRET_KEY = config("SECRET_KEY", default="your-secret-key-here")
ALGORITHM = config("ALGORITHM", default="HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30))
MONGO_URL = config("MONGO_URL", default="mongodb://localhost:27017/calmamialma")
GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = config("GOOGLE_CLIENT_SECRET", default="")
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173") # Asegúrate de que esta línea carga correctamente

# Configuración de servicios externos
openai.api_key = OPENAI_API_KEY
stripe.api_key = STRIPE_SECRET_KEY

# Configuración de seguridad
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Instancia de FastAPI
app = FastAPI(
    title="Calma Mi Alma API",
    description="API para la plataforma de bienestar Calma Mi Alma",
    version="1.0.0"
)

# Configuración de CORS - ¡Esta sección es crucial!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"], # Asegúrate de que FRONTEND_URL sea correcto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión a MongoDB
client = None
database = None

# Modelos Pydantic
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: Optional[str] = None
    google_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_premium: bool = False
    is_admin: bool = False
    created_at: datetime
    subscription_expires: Optional[datetime] = None
    last_tarot_reading: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TarotCard(BaseModel):
    id: str
    title: str
    description: str
    meaning: str
    image_url: Optional[str] = None
    practice_text: Optional[str] = None

class TarotReading(BaseModel):
    id: str
    user_id: str
    card: TarotCard
    reading_date: datetime
    is_premium: bool = False

class HoroscopeRequest(BaseModel):
    birth_date: str

class HoroscopeResponse(BaseModel):
    zodiac_sign: str
    birth_date: str
    date: datetime
    daily_horoscope: str
    is_premium: bool = False

class GoogleAuthRequest(BaseModel):
    token: str

# Nuevos modelos para videos
class VideoResponse(BaseModel):
    id: str
    title: str
    description: str
    youtube_url: str
    category: str  # MEDITACION, YOGA, COMUNIDAD
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None
    is_premium: bool = False

# Nuevos modelos para cursos
class CourseResponse(BaseModel):
    id: str
    title: str
    description: str
    price: float
    discounted_price: Optional[float] = None
    duration: str
    level: str
    image_url: Optional[str] = None

# Nuevos modelos para blog
class BlogPostRequest(BaseModel):
    title: str
    content: str
    excerpt: str
    image_url: Optional[str] = None

class BlogPostResponse(BaseModel):
    id: str
    title: str
    content: str
    excerpt: str
    image_url: Optional[str] = None
    published_date: datetime
    author: str

class BlogPostSummary(BaseModel):
    id: str
    title: str
    excerpt: str
    image_url: Optional[str] = None
    published_date: datetime
    author: str

# Modelos para cursos comprados
class PurchasedCourseRequest(BaseModel):
    course_id: str
    payment_method: str = "stripe"

class PurchasedCourseResponse(BaseModel):
    id: str
    course_id: str
    user_id: str
    purchase_date: datetime
    payment_status: str
    access_granted: bool = True

# Modelos para administración
class AdminVideoRequest(BaseModel):
    title: str
    description: str
    youtube_url: str
    category: str  # MEDITACION, YOGA, COMUNIDAD
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None
    is_premium: bool = False

class AdminCourseRequest(BaseModel):
    title: str
    description: str
    price: float
    duration: str
    level: str
    image_url: Optional[str] = None
    youtube_url: Optional[str] = None
    program: Optional[str] = None

# Modelos para calendario
class CalendarRoutineRequest(BaseModel):
    weekly_routine: Dict[str, List[str]]  # {"monday": ["yoga", "meditation"], "tuesday": ["breathing"]}
    
class CalendarRoutineResponse(BaseModel):
    id: str
    user_id: str
    weekly_routine: Dict[str, List[str]]
    created_at: datetime
    updated_at: datetime

class GoogleCalendarSyncRequest(BaseModel):
    access_token: str
    sync_enabled: bool = True

# Modelo para suscripción
class SubscriptionRequest(BaseModel):
    payment_method_id: str

class SubscriptionResponse(BaseModel):
    status: str
    subscription_id: Optional[str] = None
    client_secret: Optional[str] = None

# Funciones de utilidad
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def calculate_zodiac_sign(birth_date: datetime) -> str:
    """Calcula el signo zodiacal basado en la fecha de nacimiento"""
    month = birth_date.month
    day = birth_date.day
    
    if (month == 3 and day >= 21) or (month == 4 and day <= 19):
        return "Aries"
    elif (month == 4 and day >= 20) or (month == 5 and day <= 20):
        return "Tauro"
    elif (month == 5 and day >= 21) or (month == 6 and day <= 20):
        return "Géminis"
    elif (month == 6 and day >= 21) or (month == 7 and day <= 22):
        return "Cáncer"
    elif (month == 7 and day >= 23) or (month == 8 and day <= 22):
        return "Leo"
    elif (month == 8 and day >= 23) or (month == 9 and day <= 22):
        return "Virgo"
    elif (month == 9 and day >= 23) or (month == 10 and day <= 22):
        return "Libra"
    elif (month == 10 and day >= 23) or (month == 11 and day <= 21):
        return "Escorpio"
    elif (month == 11 and day >= 22) or (month == 12 and day <= 21):
        return "Sagitario"
    elif (month == 12 and day >= 22) or (month == 1 and day <= 19):
        return "Capricornio"
    elif (month == 1 and day >= 20) or (month == 2 and day <= 18):
        return "Acuario"
    else:
        return "Piscis"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await database.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        is_premium=user.get("is_premium", False),
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"],
        subscription_expires=user.get("subscription_expires"),
        last_tarot_reading=user.get("last_tarot_reading")
    )

async def get_current_admin_user(current_user: UserResponse = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return current_user

async def get_current_user_optional(request: Request):
    """Función para obtener el usuario actual, pero permite continuar sin autenticación"""
    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    
    if not authorization or scheme.lower() != "bearer":
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    
    user = await database.users.find_one({"email": email})
    if user is None:
        return None
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        is_premium=user.get("is_premium", False),
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"],
        subscription_expires=user.get("subscription_expires"),
        last_tarot_reading=user.get("last_tarot_reading")
    )

async def generate_tarot_reading(card_data: dict, is_premium: bool = False) -> str:
    """Genera una lectura de tarot usando OpenAI"""
    try:
        if not OPENAI_API_KEY:
            return "Lectura básica de tarot. Configure OPENAI_API_KEY para lecturas personalizadas."
        
        prompt = f"""
        Eres un experto en tarot y espiritualidad. Proporciona una lectura para la carta '{card_data['title']}'.
        
        {'Proporciona una lectura PREMIUM detallada con insights profundos, consejos específicos y afirmaciones.' if is_premium else 'Proporciona una lectura básica y general.'}
        
        Incluye:
        - Significado de la carta
        - Mensaje para hoy
        {'- Insights específicos y consejos detallados' if is_premium else ''}
        {'- Afirmación poderosa para el día' if is_premium else ''}
        
        Mantén un tono cálido, espiritual y alentador.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300 if is_premium else 150
        )
        
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating tarot reading: {e}")
        return f"El universo te envía energías positivas hoy. La carta {card_data['title']} te invita a la reflexión y el crecimiento personal."



async def generate_daily_horoscope(zodiac_sign: str) -> str:
    """Genera horóscopo diario usando OpenAI"""
    try:
        if not OPENAI_API_KEY:
            return f"Horóscopo básico para {zodiac_sign}. Configure OPENAI_API_KEY para predicciones personalizadas."
        
        prompt = f"""
        Como astrólogo profesional, crea un horóscopo diario detallado para {zodiac_sign} para hoy.
        
        Incluye:
        - Energía general del día
        - Amor y relaciones
        - Trabajo y finanzas
        - Salud y bienestar
        - Consejo del día
        - Número de la suerte
        
        Mantén un tono positivo y alentador.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400
        )
        
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating horoscope: {e}")
        return f"Los astros te sonríen hoy, {zodiac_sign}. Es un día propicio para nuevos comienzos y reflexión interior."

# Eventos de inicio y cierre
@app.on_event("startup")
async def startup_db_client():
    global client, database
    client = AsyncIOMotorClient(MONGO_URL)
    database = client.get_database("calmamialma")
    
    # Crear índices
    await database.users.create_index("email", unique=True)
    await database.tarot_readings.create_index([("user_id", 1), ("reading_date", -1)])
    await database.blog_posts.create_index([("published_date", -1)])
    await database.blog_posts.create_index("author")
    await database.purchased_courses.create_index([("user_id", 1), ("course_id", 1)])
    await database.calendar_routines.create_index("user_id", unique=True)
    await database.videos.create_index([("category", 1), ("created_at", -1)])
    await database.courses.create_index([("price", 1), ("created_at", -1)])
    
    logger.info("Conectado a MongoDB")

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
        logger.info("Desconectado de MongoDB")

# Rutas de salud
@app.get("/")
async def root():
    return {"message": "Calma Mi Alma API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    try:
        # Verificar conexión a MongoDB
        await database.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# Rutas de autenticación
# Rutas de autenticación
@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    try:
        # Verificar si el usuario ya existe
        existing_user = await database.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="El usuario ya existe")
        
        # Crear nuevo usuario
        user_doc = {
            "_id": str(uuid.uuid4()),
            "email": user_data.email,
            "name": user_data.name,
            "is_premium": False,
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "subscription_expires": None
        }
        
        # Agregar password solo si se proporciona
        if user_data.password:
            user_doc["password"] = get_password_hash(user_data.password)
        
        # Agregar google_id solo si se proporciona
        if user_data.google_id:
            user_doc["google_id"] = user_data.google_id
        
        await database.users.insert_one(user_doc)
        
        # Crear token de acceso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_doc["email"]}, expires_delta=access_token_expires
        )
        
        user_response = UserResponse(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            name=user_doc["name"],
            is_premium=user_doc.get("is_premium", False),
            is_admin=user_doc.get("is_admin", False),
            created_at=user_doc["created_at"],
            subscription_expires=user_doc.get("subscription_expires")
        )
        
        return Token(access_token=access_token, token_type="bearer", user=user_response)
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 400 for duplicate user)
        raise
    except Exception as e:
        logger.error(f"Error in user registration: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.post("/api/auth/google", response_model=Token)
async def google_auth(auth_request: GoogleAuthRequest):
    try:
        # Verificar token de Google
        idinfo = id_token.verify_oauth2_token(
            auth_request.token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        name = idinfo['name']
        google_id = idinfo['sub']
        
        # Buscar o crear usuario
        user = await database.users.find_one({"email": email})
        
        if not user:
            user_data = {
                "_id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "google_id": google_id,
                "is_premium": False,
                "is_admin": False,
                "created_at": datetime.utcnow(),
                "subscription_expires": None
            }
            await database.users.insert_one(user_data)
            user = user_data
        
        # Crear token de acceso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        
        user_response = UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            is_premium=user.get("is_premium", False),
            is_admin=user.get("is_admin", False),
            created_at=user["created_at"],
            subscription_expires=user.get("subscription_expires")
        )
        
        return Token(access_token=access_token, token_type="bearer", user=user_response)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Token de Google inválido")
    except Exception as e:
        logger.error(f"Error in Google auth: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Buscar usuario por email
    user = await database.users.find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        is_premium=user.get("is_premium", False),
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"],
        subscription_expires=user.get("subscription_expires")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

# Rutas de Videos
@app.get("/api/videos", response_model=List[VideoResponse])
async def get_videos(current_user: Optional[UserResponse] = Depends(get_current_user_optional)):
    # Videos de ejemplo organizados por categorías
    videos_data = [
        # COMUNIDAD - Accesible para todos
        {
            "id": "1",
            "title": "Introducción a la Meditación",
            "description": "Descubre los fundamentos de la meditación y cómo comenzar tu práctica diaria",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "COMUNIDAD",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "duration": "15:32",
            "is_premium": False
        },
        {
            "id": "2",
            "title": "Técnicas de Relajación",
            "description": "Aprende técnicas simples para relajarte en cualquier momento del día",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "COMUNIDAD",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "duration": "12:45",
            "is_premium": False
        },
        # MEDITACION - Solo Premium
        {
            "id": "3",
            "title": "Meditación para Principiantes",
            "description": "Una guía completa para comenzar tu práctica de meditación",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "MEDITACION",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "duration": "20:15",
            "is_premium": True
        },
        {
            "id": "4",
            "title": "Meditación Mindfulness",
            "description": "Desarrolla la atención plena con esta práctica guiada",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "MEDITACION",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "duration": "25:30",
            "is_premium": True
        },
        # YOGA - Solo Premium
        {
            "id": "5",
            "title": "Yoga Matutino",
            "description": "Secuencia de yoga para energizar tu mañana",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "YOGA",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "duration": "30:00",
            "is_premium": True
        },
        {
            "id": "6",
            "title": "Yoga para Relajación",
            "description": "Posturas suaves para relajar cuerpo y mente",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "YOGA",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "duration": "35:20",
            "is_premium": True
        }
    ]
    
    videos = []
    for video_data in videos_data:
        # Si es contenido premium y el usuario no es premium, ocultar URL
        if video_data["is_premium"] and (not current_user or not current_user.is_premium):
            video_data["youtube_url"] = ""
        
        videos.append(VideoResponse(**video_data))
    
    return videos

# Rutas de Cursos
@app.get("/api/courses", response_model=List[CourseResponse])
async def get_courses(current_user: Optional[UserResponse] = Depends(get_current_user_optional)):
    # Cursos con precios diferenciados
    courses_data = [
        {
            "id": "1",
            "title": "Reiki Nivel 1",
            "description": "Aprende los fundamentos del Reiki y cómo canalizar la energía sanadora",
            "price": 150.0,
            "duration": "4 semanas",
            "level": "Principiante",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Reiki+Nivel+1"
        },
        {
            "id": "2",
            "title": "Reiki Nivel 2",
            "description": "Profundiza en las técnicas avanzadas de Reiki y símbolos sagrados",
            "price": 200.0,
            "duration": "6 semanas",
            "level": "Intermedio",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Reiki+Nivel+2"
        },
        {
            "id": "3",
            "title": "Yoga 0",
            "description": "Introducción al yoga para principiantes absolutos",
            "price": 80.0,
            "duration": "3 semanas",
            "level": "Principiante",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Yoga+0"
        },
        {
            "id": "4",
            "title": "Yoga Prenatal",
            "description": "Yoga especializado para mujeres embarazadas",
            "price": 120.0,
            "duration": "8 semanas",
            "level": "Todos los niveles",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Yoga+Prenatal"
        },
        {
            "id": "5",
            "title": "Introducción a la Meditación",
            "description": "Curso gratuito para aprender los fundamentos de la meditación",
            "price": 0.0,
            "duration": "2 semanas",
            "level": "Principiante",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Meditación+Gratis"
        }
    ]
    
    courses = []
    for course_data in courses_data:
        # Aplicar descuento del 30% para usuarios premium
        if current_user and current_user.is_premium and course_data["price"] > 0:
            course_data["discounted_price"] = course_data["price"] * 0.7
        
        courses.append(CourseResponse(**course_data))
    
    return courses

# Ruta para obtener detalles de un curso específico (incluyendo video)
@app.get("/api/courses/{course_id}/details")
async def get_course_details(
    course_id: str,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
):
    """Obtener detalles completos de un curso incluyendo video de YouTube"""
    courses_data = [
        {
            "id": "1",
            "title": "Reiki Nivel 1",
            "description": "Aprende los fundamentos del Reiki y cómo canalizar la energía sanadora",
            "price": 150.0,
            "duration": "4 semanas",
            "level": "Principiante",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Reiki+Nivel+1",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "program": "Semana 1: Introducción al Reiki y su historia\nSemana 2: Los chakras y el sistema energético\nSemana 3: Técnicas básicas de canalización\nSemana 4: Práctica y autosanación"
        },
        {
            "id": "2",
            "title": "Reiki Nivel 2",
            "description": "Profundiza en las técnicas avanzadas de Reiki y símbolos sagrados",
            "price": 200.0,
            "duration": "6 semanas",
            "level": "Intermedio",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Reiki+Nivel+2",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "program": "Semana 1-2: Símbolos del Reiki Nivel 2\nSemana 3-4: Sanación a distancia\nSemana 5-6: Técnicas avanzadas y maestría"
        },
        {
            "id": "3",
            "title": "Yoga 0",
            "description": "Introducción al yoga para principiantes absolutos",
            "price": 80.0,
            "duration": "3 semanas",
            "level": "Principiante",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Yoga+0",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "program": "Semana 1: Posturas básicas y respiración\nSemana 2: Secuencias simples y flexibilidad\nSemana 3: Meditación y relajación"
        },
        {
            "id": "4",
            "title": "Yoga Prenatal",
            "description": "Yoga especializado para mujeres embarazadas",
            "price": 120.0,
            "duration": "8 semanas",
            "level": "Todos los niveles",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Yoga+Prenatal",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "program": "Semana 1-2: Adaptaciones para el embarazo\nSemana 3-4: Fortalecimiento y flexibilidad\nSemana 5-6: Preparación para el parto\nSemana 7-8: Relajación y conexión madre-bebé"
        },
        {
            "id": "5",
            "title": "Introducción a la Meditación",
            "description": "Curso gratuito para aprender los fundamentos de la meditación",
            "price": 0.0,
            "duration": "2 semanas",
            "level": "Principiante",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Meditación+Gratis",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "program": "Semana 1: Fundamentos de la meditación\nSemana 2: Técnicas de relajación"
        }
    ]
    
    course = next((c for c in courses_data if c["id"] == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    # Aplicar descuento del 30% para usuarios premium
    if current_user and current_user.is_premium and course["price"] > 0:
        course["discounted_price"] = course["price"] * 0.7
    
    return course

# Rutas de Blog
@app.get("/api/blog/posts", response_model=List[BlogPostSummary])
async def get_blog_posts(current_user: Optional[UserResponse] = Depends(get_current_user_optional)):
    # Posts de ejemplo
    posts = await database.blog_posts.find().sort("published_date", -1).to_list(length=10)
    
    if not posts:
        # Crear posts de ejemplo si no existen
        example_posts = [
            {
                "_id": str(uuid.uuid4()),
                "title": "Los Beneficios de la Meditación Diaria",
                "content": "La meditación diaria puede transformar tu vida de maneras profundas. En este artículo exploramos cómo una práctica constante puede reducir el estrés, mejorar la concentración y aumentar tu bienestar general. La investigación científica ha demostrado que meditar regularmente puede cambiar la estructura del cerebro, fortalecer el sistema inmunológico y mejorar la calidad del sueño.",
                "excerpt": "Descubre cómo la meditación diaria puede transformar tu vida y bienestar...",
                "published_date": datetime.utcnow() - timedelta(days=1),
                "author": "Calma Mi Alma",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Meditación"
            },
            {
                "_id": str(uuid.uuid4()),
                "title": "Cristales para la Sanación Emocional",
                "content": "Los cristales han sido utilizados durante milenios para la sanación emocional y espiritual. En este artículo completo, exploraremos los cristales más efectivos para diferentes estados emocionales. La amatista, por ejemplo, es conocida por sus propiedades calmantes y puede ayudar a reducir la ansiedad y promover un sueño reparador.",
                "excerpt": "Aprende sobre los cristales más poderosos para la sanación emocional...",
                "published_date": datetime.utcnow() - timedelta(days=3),
                "author": "Calma Mi Alma",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Cristales"
            },
            {
                "_id": str(uuid.uuid4()),
                "title": "El Arte del Tarot: Guía para Principiantes",
                "content": "El tarot es una herramienta poderosa para la introspección y el autoconocimiento. En esta guía completa para principiantes, aprenderás sobre la historia del tarot, los diferentes tipos de mazos disponibles, y cómo realizar tus primeras lecturas. También exploraremos el significado de los Arcanos Mayores y cómo interpretar las cartas en diferentes contextos.",
                "excerpt": "Una guía completa para comenzar tu viaje con el tarot...",
                "published_date": datetime.utcnow() - timedelta(days=5),
                "author": "Calma Mi Alma",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Tarot"
            }
        ]
        
        await database.blog_posts.insert_many(example_posts)
        posts = example_posts
    
    blog_posts = []
    for post in posts:
        # Para usuarios gratuitos, mostrar solo las primeras 3 líneas
        if not current_user or not current_user.is_premium:
            content_lines = post["content"].split('\n')
            limited_content = '\n'.join(content_lines[:3])
            if len(content_lines) > 3:
                limited_content += "..."
            post["excerpt"] = limited_content
        
        blog_posts.append(BlogPostSummary(
            id=post["_id"],
            title=post["title"],
            excerpt=post["excerpt"],
            image_url=post.get("image_url"),
            published_date=post["published_date"],
            author=post["author"]
        ))
    
    return blog_posts

@app.get("/api/blog/posts/{post_id}", response_model=BlogPostResponse)
async def get_blog_post(post_id: str, current_user: Optional[UserResponse] = Depends(get_current_user_optional)):
    post = await database.blog_posts.find_one({"_id": post_id})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    # Para usuarios gratuitos, mostrar solo las primeras 3 líneas
    if not current_user or not current_user.is_premium:
        content_lines = post["content"].split('\n')
        limited_content = '\n'.join(content_lines[:3])
        if len(content_lines) > 3:
            limited_content += "\n\n[Actualiza a Premium para leer el artículo completo]"
        post["content"] = limited_content
    
    return BlogPostResponse(
        id=post["_id"],
        title=post["title"],
        content=post["content"],
        excerpt=post["excerpt"],
        image_url=post.get("image_url"),
        published_date=post["published_date"],
        author=post["author"]
    )

@app.post("/api/blog/posts", response_model=BlogPostResponse)
async def create_blog_post(
    post_request: BlogPostRequest,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    # Solo admin puede crear posts
    post_data = {
        "_id": str(uuid.uuid4()),
        "title": post_request.title,
        "content": post_request.content,
        "excerpt": post_request.excerpt,
        "image_url": post_request.image_url,
        "published_date": datetime.utcnow(),
        "author": current_admin.name
    }
    
    await database.blog_posts.insert_one(post_data)
    
    # Create response with correct field mapping
    response_data = {
        "id": post_data["_id"],
        "title": post_data["title"],
        "content": post_data["content"],
        "excerpt": post_data["excerpt"],
        "image_url": post_data["image_url"],
        "published_date": post_data["published_date"],
        "author": post_data["author"]
    }
    
    return BlogPostResponse(**response_data)

# Rutas para cursos comprados
@app.post("/api/courses/purchase", response_model=PurchasedCourseResponse)
async def purchase_course(
    purchase_request: PurchasedCourseRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Procesar compra de curso"""
    try:
        # Verificar si el curso existe
        courses_data = [
            {"id": "1", "title": "Reiki Nivel 1", "price": 150.0},
            {"id": "2", "title": "Reiki Nivel 2", "price": 200.0},
            {"id": "3", "title": "Yoga 0", "price": 80.0},
            {"id": "4", "title": "Yoga Prenatal", "price": 120.0}
        ]
        
        course = next((c for c in courses_data if c["id"] == purchase_request.course_id), None)
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # Verificar si ya compró el curso
        existing_purchase = await database.purchased_courses.find_one({
            "user_id": current_user.id,
            "course_id": purchase_request.course_id
        })
        
        if existing_purchase:
            return PurchasedCourseResponse(
                id=existing_purchase["_id"],
                course_id=existing_purchase["course_id"],
                user_id=existing_purchase["user_id"],
                purchase_date=existing_purchase["purchase_date"],
                payment_status=existing_purchase["payment_status"],
                access_granted=existing_purchase["access_granted"]
            )
        
        # Crear nueva compra
        purchase_data = {
            "_id": str(uuid.uuid4()),
            "course_id": purchase_request.course_id,
            "user_id": current_user.id,
            "purchase_date": datetime.utcnow(),
            "payment_status": "completed",  # En desarrollo, asumimos pago exitoso
            "access_granted": True
        }
        
        await database.purchased_courses.insert_one(purchase_data)
        
        return PurchasedCourseResponse(
            id=purchase_data["_id"],
            course_id=purchase_data["course_id"],
            user_id=purchase_data["user_id"],
            purchase_date=purchase_data["purchase_date"],
            payment_status=purchase_data["payment_status"],
            access_granted=purchase_data["access_granted"]
        )
        
    except Exception as e:
        logger.error(f"Error purchasing course: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar compra")

@app.get("/api/courses/purchased", response_model=List[CourseResponse])
async def get_purchased_courses(current_user: UserResponse = Depends(get_current_user)):
    """Obtener cursos comprados por el usuario + cursos gratuitos automáticamente"""
    try:
        # Obtener cursos comprados
        purchased = await database.purchased_courses.find({"user_id": current_user.id}).to_list(length=None)
        
        # Datos de cursos
        courses_data = [
            {
                "id": "1",
                "title": "Reiki Nivel 1",
                "description": "Aprende los fundamentos del Reiki y cómo canalizar la energía sanadora",
                "price": 150.0,
                "duration": "4 semanas",
                "level": "Principiante",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Reiki+Nivel+1"
            },
            {
                "id": "2",
                "title": "Reiki Nivel 2",
                "description": "Profundiza en las técnicas avanzadas de Reiki y símbolos sagrados",
                "price": 200.0,
                "duration": "6 semanas",
                "level": "Intermedio",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Reiki+Nivel+2"
            },
            {
                "id": "3",
                "title": "Yoga 0",
                "description": "Introducción al yoga para principiantes absolutos",
                "price": 80.0,
                "duration": "3 semanas",
                "level": "Principiante",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Yoga+0"
            },
            {
                "id": "4",
                "title": "Yoga Prenatal",
                "description": "Yoga especializado para mujeres embarazadas",
                "price": 120.0,
                "duration": "8 semanas",
                "level": "Todos los niveles",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Yoga+Prenatal"
            },
            {
                "id": "5",
                "title": "Introducción a la Meditación",
                "description": "Curso gratuito para aprender los fundamentos de la meditación",
                "price": 0.0,
                "duration": "2 semanas",
                "level": "Principiante",
                "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Meditación+Gratis"
            }
        ]
        
        available_courses = []
        
        # Agregar cursos gratuitos automáticamente para todos los usuarios registrados
        for course_data in courses_data:
            if course_data["price"] == 0:
                available_courses.append(CourseResponse(**course_data))
        
        # Agregar cursos comprados
        for purchase in purchased:
            course_data = next((c for c in courses_data if c["id"] == purchase["course_id"]), None)
            if course_data and course_data["price"] > 0:  # Solo agregar si no es gratuito (ya está agregado arriba)
                available_courses.append(CourseResponse(**course_data))
        
        return available_courses
        
    except Exception as e:
        logger.error(f"Error getting purchased courses: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener cursos comprados")

# Rutas para calendario
@app.get("/api/calendar/routine", response_model=CalendarRoutineResponse)
async def get_calendar_routine(current_user: UserResponse = Depends(get_current_user)):
    """Obtener rutina semanal del usuario"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="El calendario está disponible solo para usuarios premium"
        )
    
    try:
        routine = await database.calendar_routines.find_one({"user_id": current_user.id})
        
        if not routine:
            # Crear rutina por defecto
            default_routine = {
                "_id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "weekly_routine": {
                    "lunes": ["yoga", "meditacion"],
                    "martes": ["respiracion"],
                    "miercoles": ["yoga"],
                    "jueves": ["meditacion"],
                    "viernes": ["yoga", "respiracion"],
                    "sabado": ["meditacion"],
                    "domingo": ["yoga", "meditacion"]
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await database.calendar_routines.insert_one(default_routine)
            routine = default_routine
        
        return CalendarRoutineResponse(
            id=routine["_id"],
            user_id=routine["user_id"],
            weekly_routine=routine["weekly_routine"],
            created_at=routine["created_at"],
            updated_at=routine["updated_at"]
        )
        
    except Exception as e:
        logger.error(f"Error getting calendar routine: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener rutina")

@app.put("/api/calendar/routine", response_model=CalendarRoutineResponse)
async def update_calendar_routine(
    routine_request: CalendarRoutineRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Actualizar rutina semanal del usuario"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="El calendario está disponible solo para usuarios premium"
        )
    
    try:
        # Actualizar rutina existente o crear nueva
        routine_data = {
            "user_id": current_user.id,
            "weekly_routine": routine_request.weekly_routine,
            "updated_at": datetime.utcnow()
        }
        
        result = await database.calendar_routines.update_one(
            {"user_id": current_user.id},
            {"$set": routine_data, "$setOnInsert": {
                "_id": str(uuid.uuid4()),
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )
        
        # Obtener rutina actualizada
        routine = await database.calendar_routines.find_one({"user_id": current_user.id})
        
        return CalendarRoutineResponse(
            id=routine["_id"],
            user_id=routine["user_id"],
            weekly_routine=routine["weekly_routine"],
            created_at=routine["created_at"],
            updated_at=routine["updated_at"]
        )
        
    except Exception as e:
        logger.error(f"Error updating calendar routine: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar rutina")

@app.post("/api/calendar/sync-google")
async def sync_google_calendar(
    sync_request: GoogleCalendarSyncRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Sincronizar con Google Calendar"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="La sincronización con Google Calendar está disponible solo para usuarios premium"
        )
    
    try:
        # En un entorno real, aquí implementarías la integración con Google Calendar API
        # Por ahora, simulamos la sincronización
        return {
            "message": "Sincronización con Google Calendar configurada",
            "status": "success",
            "sync_enabled": sync_request.sync_enabled,
            "note": "Funcionalidad de Google Calendar en desarrollo"
        }
        
    except Exception as e:
        logger.error(f"Error syncing Google Calendar: {e}")
        raise HTTPException(status_code=500, detail="Error al sincronizar con Google Calendar")

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Ruta para crear usuario de prueba (solo para desarrollo)
@app.post("/api/auth/create-test-user")
async def create_test_user():
    try:
        # Verificar si ya existe un usuario de prueba
        existing_user = await database.users.find_one({"email": "test@calmamialma.com"})
        if existing_user:
            return {"message": "Usuario de prueba ya existe", "email": "test@calmamialma.com"}
        
        # Crear usuario de prueba
        test_user = {
            "_id": str(uuid.uuid4()),
            "email": "test@calmamialma.com",
            "name": "Usuario de Prueba",
            "password": get_password_hash("password123"),
            "is_premium": False,
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "subscription_expires": None
        }
        
        await database.users.insert_one(test_user)
        
        return {
            "message": "Usuario de prueba creado exitosamente",
            "email": "test@calmamialma.com",
            "password": "password123",
            "note": "Úsalo para probar la aplicación"
        }
        
    except Exception as e:
        logger.error(f"Error creating test user: {e}")
        raise HTTPException(status_code=500, detail="Error al crear usuario de prueba")

@app.post("/api/auth/create-admin-user")
async def create_admin_user():
    try:
        # Crear usuario admin específico
        existing_user = await database.users.find_one({"email": "admin@calmamialma.com"})
        if existing_user:
            return {"message": "Usuario admin ya existe", "email": "admin@calmamialma.com"}
        
        # Crear usuario ADMIN
        admin_user = {
            "_id": str(uuid.uuid4()),
            "email": "admin@calmamialma.com",
            "name": "Administrador",
            "password": get_password_hash("admin123"),
            "is_premium": True,
            "is_admin": True,  # Esta línea es la clave para que sea administrador
            "created_at": datetime.utcnow(),
            "subscription_expires": datetime.utcnow() + timedelta(days=36500)  # 100 años
        }
        
        await database.users.insert_one(admin_user)
        
        return {
            "message": "Usuario administrador creado exitosamente",
            "email": "admin@calmamialma.com",
            "password": "admin123",
            "note": "Usuario admin listo para gestionar contenido"
        }
        
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
        raise HTTPException(status_code=500, detail="Error al crear usuario administrador")

@app.post("/api/auth/create-premium-user")
async def create_premium_user():
    try:
        # Crear usuario premium específico como solicitado
        existing_user = await database.users.find_one({"email": "premium@calmamialma.com"})
        if existing_user:
            return {"message": "Usuario premium ya existe", "email": "premium@calmamialma.com"}
        
        # Crear usuario PREMIUM Vane
        premium_user = {
            "_id": str(uuid.uuid4()),
            "email": "premium@calmamialma.com",
            "name": "PREMIUM Vane",
            "password": get_password_hash("asd123"),
            "is_premium": True,
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "subscription_expires": datetime.utcnow() + timedelta(days=365)  # 1 año
        }
        
        await database.users.insert_one(premium_user)
        
        return {
            "message": "Usuario premium PREMIUM Vane creado exitosamente",
            "email": "premium@calmamialma.com",
            "password": "asd123",
            "note": "Usuario premium listo para probar funcionalidades"
        }
        
    except Exception as e:
        logger.error(f"Error creating premium user: {e}")
        raise HTTPException(status_code=500, detail="Error al crear usuario premium")

# Rutas de Tarot
@app.get("/api/tarot/daily", response_model=TarotReading)
async def get_daily_tarot(current_user: UserResponse = Depends(get_current_user)):
    now = datetime.utcnow()
    
    # Verificar restricciones según el tipo de membresía
    if current_user.is_premium:
        # Premium: 1 lectura diaria
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        existing_reading = await database.tarot_readings.find_one({
            "user_id": current_user.id,
            "reading_date": {"$gte": today}
        })
        
        if existing_reading:
            # Retornar la lectura existente del día
            return TarotReading(
                id=existing_reading["_id"],
                user_id=existing_reading["user_id"],
                card=TarotCard(**existing_reading["card"]),
                reading_date=existing_reading["reading_date"],
                is_premium=existing_reading["is_premium"]
            )
    else:
        # Gratuita: 1 lectura cada 3 días - Solo UNA carta permitida
        three_days_ago = now - timedelta(days=3)
        recent_reading = await database.tarot_readings.find_one({
            "user_id": current_user.id,
            "reading_date": {"$gte": three_days_ago}
        })
        
        if recent_reading:
            # Retornar la lectura existente si está dentro del período de 3 días
            return TarotReading(
                id=recent_reading["_id"],
                user_id=recent_reading["user_id"],
                card=TarotCard(**recent_reading["card"]),
                reading_date=recent_reading["reading_date"],
                is_premium=recent_reading["is_premium"]
            )
    
    # Generar nueva lectura
    import random
    
    # Datos de las cartas del tarot usando los textos editables
    tarot_cards = [
        {
            "id": "1",
            "title": "ERES SUFICIENTE, TAL COMO ERES",
            "description": "A veces el mundo insiste en que debemos hacer más, tener más, lograr más… pero esta carta te invita a recordarte una verdad esencial: no necesitas demostrar nada. Tu valor no depende de tus logros, tu apariencia o de la aprobación externa. Eres suficiente desde el primer latido de tu corazón.",
            "premium_description": "A veces el mundo insiste en que debemos hacer más, tener más, lograr más… pero esta carta te invita a recordarte una verdad esencial: no necesitas demostrar nada. Tu valor no depende de tus logros, tu apariencia o de la aprobación externa. Eres suficiente desde el primer latido de tu corazón.\n\nMírate con ternura, con esa mirada compasiva que tanto ofreces a los demás. Abre espacio para aceptar tus imperfecciones, porque incluso ellas forman parte de tu magia.",
            "practice_text": "✨ Práctica sugerida:\n Párate frente al espejo, mírate a los ojos y repite tres veces:\n \"Soy suficiente. Me amo tal como soy. Hoy me honro.\"\n Respira hondo y permite que ese mensaje llegue a tu corazón.",
            "image_url": "/tarot1.png"
        },
        {
            "id": "2",
            "title": "TU PAZ POR ENCIMA DE TODO",
            "description": "Hay momentos en que el ruido exterior intenta arrastrarme hacia la prisa, la ansiedad o el caos. Esta carta te invita a hacer una elección consciente: elegir tu paz, incluso si eso significa decir \"no\", poner límites, o retirarte a tu propio espacio interior.",
            "premium_description": "Hay momentos en que el ruido exterior intenta arrastrarme hacia la prisa, la ansiedad o el caos. Esta carta te invita a hacer una elección consciente: elegir tu paz, incluso si eso significa decir \"no\", poner límites, o retirarte a tu propio espacio interior.\n\nLa paz no siempre está en lo que ocurre fuera, esperando que todo se tranquilice, para poder estar en calma con nosotros mismos. La paz está en cómo decides recibir las situaciones que te brinda la vida. Hoy puedes hacer de tu energía un santuario.",
            "practice_text": "✨ Práctica sugerida:\n Cierra los ojos, respira profundo tres veces y visualiza una burbuja de luz blanca suave envolviendote. Dentro de esa esfera hay silencio, calma, seguridad. Quédate ahí unos instantes. Luego, abre los ojos y lleva esa paz contigo.",
            "image_url": "/tarot2.png"
        },
        {
            "id": "3",
            "title": "TU CORAZÓN ES EL GUÍA DE TU CAMINO",
            "description": "En medio de las dudas, el miedo o la confusión, siempre hay una voz silenciosa dentro de ti que sabe la respuesta. Tu corazón guarda una sabiduría ancestral, profunda, intuitiva. Tu corazón guarda tu más preciado tesoro, tu verdadera esencia.",
            "premium_description": "En medio de las dudas, el miedo o la confusión, siempre hay una voz silenciosa dentro de ti que sabe la respuesta. Tu corazón guarda una sabiduría ancestral, profunda, intuitiva. Tu corazón guarda tu más preciado tesoro, tu verdadera esencia.\n\nEscuchar el corazón requiere valentía: implica soltar lo que \"deberías\" y honrar lo que \"sientes\". No siempre será fácil, pero siempre será verdadero.",
            "practice_text": "✨ Práctica sugerida:\n Lleva ambas manos al centro de tu pecho. Cierra los ojos y pregúntate:\n \"¿Qué me está pidiendo mi corazón hoy?\"\n Quédate en silencio unos minutos. No fuerces la respuesta. Solo escucha. Confía.",
            "image_url": "/tarot3.png"
        },
        {
            "id": "4",
            "title": "HONRA TU CUERPO. ES EL TEMPLO DE TU ALMA",
            "description": "Tu cuerpo ha sido casa, refugio y camino. Cada marca, cada curva, cada cicatriz guarda una historia. Honrar tu cuerpo es también un acto de amor propio.",
            "premium_description": "Tu cuerpo ha sido casa, refugio y camino. Cada marca, cada curva, cada cicatriz guarda una historia. Honrar tu cuerpo es también un acto de amor propio.\n\nNo importa cómo se vea a los ojos del mundo. Lo importante es cómo lo tratas, cómo lo escuchas, cómo le hablas, y cómo lo cuidas. Este mensaje es una invitación a reconectar con él no desde la exigencia, sino desde el respeto y la gratitud.",
            "practice_text": "✨ Práctica sugerida:\n Hoy, acaricia suavemente cada parte de tu cuerpo al despertar, como un ritual. Agradece en voz alta:\n \"Gracias, cuerpo, por sostenerme. Hoy te cuido, hoy te escucho.\"\n Muévete, estírate, y regálate una sonrisa, que nutra profundamente tu belleza.",
            "image_url": "/tarot4.png"
        },
        {
            "id": "5",
            "title": "SUELTA LO QUE YA NO VIBRA CONTIGO",
            "description": "No todo lo que forma parte de tu vida hoy necesita permanecer. A veces, crecer implica soltar, despedirse, abrir espacio. Esta carta llega para ayudarte a reconocer aquello que te pesa, te agota o ya no se alinea con tu nueva energía.",
            "premium_description": "No todo lo que forma parte de tu vida hoy necesita permanecer. A veces, crecer implica soltar, despedirse, abrir espacio. Esta carta llega para ayudarte a reconocer aquello que te pesa, te agota o ya no se alinea con tu nueva energía.\n\nSuelta con amor, sin resentimiento. Agradece lo vivido, y libérate. Solo así podrás vaciar,y dar espacio, para poder llenar tu vida con la energía que hoy eliges vibrar.",
            "practice_text": "✨ Práctica sugerida:\n Toma papel y lápiz. Escribe todo lo que deseas soltar: pensamientos, relaciones, miedos, hábitos.Solo escribe, aunque sean palabras sueltas. Luego, quema el papel con cuidado, observando cómo el humo se lo lleva. Mientras lo haces, repite:\n \"Confío en el proceso. Hoy libero lo que ya cumplió su ciclo.\"",
            "image_url": "/tarot5.png"
        },
        {
            "id": "6",
            "title": "ABRAZA TU CICLO Y TU RITMO",
            "description": "Tu energía es cíclica como la luna, cambiante, fuerte y sabia. Honrar cada fase de ti —actividad, descanso, introspección— te devuelve a tu centro. Escuchar tu ritmo es sinónimo de libertad y compasión.",
            "premium_description": "Tu energía es cíclica como la luna, cambiante, fuerte y sabia. Honrar cada fase de ti —actividad, descanso, introspección— te devuelve a tu centro. Escuchar tu ritmo es sinónimo de libertad y compasión. No lo olvides, dar tiempo a cada fase, es permitir que el universo te brinde sus mensajes completos.",
            "practice_text": "✨ Práctica sugerida:\n Observa en qué fase lunar estás. Luego pregúntate: \"¿Qué necesito hoy según mi fase interior?\" Luego, permítete actuar desde esa respuesta: quizás descanso, inspiración artística, movimiento suave o silencio. Acomódate en tu propio compás sin culpa.",
            "image_url": "/tarot6.png"
        },
        {
            "id": "7",
            "title": "EL SILENCIO DEL VACÍO",
            "description": "A veces, la luz nace del silencio. Este espacio de misterio y calma, a veces llamado \"el vacío\", te invita a soltar controles, a confiar en lo oculto y permitir que las semillas de lo nuevo germinen, dando luz en la oscuridad.",
            "premium_description": "A veces, la luz nace del silencio. Este espacio de misterio y calma, a veces llamado \"el vacío\", te invita a soltar controles, a confiar en lo oculto y permitir que las semillas de lo nuevo germinen, dando luz en la oscuridad.\n\nEstar en este silencio no es inacción, sino una danza sagrada: dejar que lo imperceptible se haga visible, y que lo por venir moldee tu nuevo camino. Este es un espacio de creación interna, de renovación profunda y de preparación consciente.",
            "practice_text": "✨ Práctica sugerida:\n Siéntate en un lugar tranquilo durante 10 minutos. Cierra los ojos y no busques respuesta: solo observa el silencio. Si surge una imagen o palabra, no la empujes. Permite que repose. Luego, abre los ojos y sumérgete en la emoción que aflora. Confía: ahí está la semilla de lo próximo.",
            "image_url": "/tarot7.png"
        },
        {
            "id": "8",
            "title": "ERES TU PROPIO HOGAR",
            "description": "Has pasado mucho tiempo buscando afuera lo que ya habita en ti. El reconocimiento, el amor, la validación, la contención… todo eso existe dentro de ti, aguardando tu permiso para ser vivido.",
            "premium_description": "Has pasado mucho tiempo buscando afuera lo que ya habita en ti. El reconocimiento, el amor, la validación, la contención… todo eso existe dentro de ti, aguardando tu permiso para ser vivido. Hoy esta carta te recuerda que no necesitas encajar en moldes ajenos. Puedes regresar a ti, a tu verdad, y descansar allí.\n\nTu cuerpo es tu casa. Tu alma es tu refugio. Cuando eliges habitarte con presencia, ya no necesitas ser aceptada por nadie más para sentirte completa.",
            "practice_text": "✨ Práctica sugerida:\n Siéntate en silencio y lleva las manos al corazón. Respira profundo. Di en voz alta: \"Hoy vuelvo a mí. Soy mi hogar, mi raíz, mi sostén\". Quédate unos minutos sintiendo cómo estas palabras toman forma en tu interior.",
            "image_url": "/tarot8.png"
        },
        {
            "id": "9",
            "title": "LA RESPONSABILIDAD NO ES CARGA, ES PODER",
            "description": "Ser responsable de ti misma no significa cargar con todo, ni controlar lo que escapa a tus manos. Es darte cuenta de que eres la única dueña de tus decisiones, de tus emociones, de tus límites.",
            "premium_description": "Ser responsable de ti misma no significa cargar con todo, ni controlar lo que escapa a tus manos. Es darte cuenta de que eres la única dueña de tus decisiones, de tus emociones, de tus límites. Dejar de culpar al afuera y comenzar a preguntarte: ¿Qué puedo hacer con esto que siento?\n\nLa responsabilidad auténtica no pesa: empodera. Te devuelve el timón de tu vida.",
            "practice_text": "✨ Práctica sugerida:\n Escribe una situación que estés viviendo hoy. Luego pregúntate: \"¿Qué puedo hacer con esto que siento?\" No te exijas. Solo reconoce tu lugar en la historia.",
            "image_url": "/tarot9.png"
        },
        {
            "id": "10",
            "title": "EL MIEDO NO ES ENEMIGO, ES MENSAJERO",
            "description": "Sentir miedo no es señal de debilidad. Es una brújula que te invita a mirar con atención. El miedo te muestra dónde hay algo por sanar, por atravesar o por dejar atrás.",
            "premium_description": "Sentir miedo no es señal de debilidad. Es una brújula que te invita a mirar con atención. El miedo te muestra dónde hay algo por sanar, por atravesar o por dejar atrás. No se trata de eliminarlo, sino de escucharlo con compasión… y caminar igual.\n\nEl coraje no es ausencia de miedo, es avanzar con él de la mano.",
            "practice_text": "✨ Práctica sugerida:\n Piensa en algo que hoy te dé miedo. Escríbelo y completa esta frase: \"Gracias miedo, por mostrarme que…\" Luego respira profundo y visualízate atravesando eso con valentía. Siéntete acompañada por ti misma.",
            "image_url": "/tarot10.png"
        },
        {
            "id": "11",
            "title": "LA CULPA",
            "description": "La culpa se disfraza de responsabilidad, pero muchas veces es solo un eco del pasado que ya no tiene poder aquí. ¿Te culpas por sentir, por decir, por elegirte? Esa no es tu voz.",
            "premium_description": "La culpa se disfraza de responsabilidad, pero muchas veces es solo un eco del pasado que ya no tiene poder aquí. ¿Te culpas por sentir, por decir, por elegirte? Esa no es tu voz.\n\nSoltar la culpa es un acto de amor propio. Significa perdonarte, abrazar tu humanidad, y recordar que mereces empezar de nuevo.",
            "practice_text": "✨ Práctica sugerida:\n Cierra los ojos y di tu nombre en voz alta. Luego repite: \"Te perdono. Te libero. Ya no necesitas cargar con esto\". Siente si hay un nudo que se afloja, aunque sea un poco.",
            "image_url": "/tarot11.png"
        },
        {
            "id": "12",
            "title": "PONER LÍMITES",
            "description": "Decir que no no te hace egoísta. Te hace clara. Te hace real. Poner límites no aleja el amor verdadero: lo protege.",
            "premium_description": "Decir que no no te hace egoísta. Te hace clara. Te hace real. Poner límites no aleja el amor verdadero: lo protege. Cuando marcas tu espacio, estás diciéndote a ti misma \"yo valgo, yo importo, yo me cuido\". Hay situaciones o relaciones que ya no se vinculan en tu presente, dejar ir, es el acto de amor más grande que podemos hacer, para nosotros mismos y para nuestro alrededor.\n\nEl límite no es un muro: es una puerta que decides cuándo abrir.",
            "practice_text": "✨ Práctica sugerida:\n Piensa en una situación en la que sientes que te estás sobrepasando. Escribe una frase que podrías usar para marcar un límite claro y amoroso. Repítela frente al espejo hasta que la sientas parte de ti.",
            "image_url": "/tarot12.png"
        },
        {
            "id": "13",
            "title": "CONFÍA",
            "description": "Aunque hoy no veas el horizonte, confía: estás siendo guiada, tienes un sequito de seres de luz que te acompañan, marcando tu camino, solo debes aprender a ver las señales.",
            "premium_description": "Aunque hoy no veas el horizonte, confía: estás siendo guiada, tienes un sequito de seres de luz que te acompañan, marcando tu camino, solo debes aprender a ver las señales. Cada paso, incluso los inciertos, forman parte del tejido invisible de tu crecimiento. No necesitas tener todas las respuestas, o que todo a tu alrededor sea perfecto, solo debes dar el siguiente paso desde la verdad de tu corazón.\n\nLa confianza se construye caminando. Paso a paso. Respiración a respiración.",
            "practice_text": "✨ Práctica sugerida:\n Haz una lista de 3 momentos en tu vida en los que algo se resolvió de forma inesperada. Luego escribe: \"Así como entonces, también ahora la vida me sostiene\".",
            "image_url": "/tarot13.png"
        },
        {
            "id": "14",
            "title": "CREE EN TI, INCLUSO CUANDO DUELA",
            "description": "Habrá días en que dudarás. En que la voz interna se opaque por viejas heridas. Pero incluso ahí, mereces seguir creyendo en ti.",
            "premium_description": "Habrá días en que dudarás. En que la voz interna se opaque por viejas heridas. Pero incluso ahí, mereces seguir creyendo en ti. Porque no estás rota: estás en proceso.Hay veces que las cosas deben romperse, y para volver a construirse con una nueva esencia. Romper el molde de algo que durante tanto tiempo has sostenido, para poder expandirte, y elegir lo que realmente deseas desde tu corazón.\n\nCada parte de ti tiene un valor inmenso, incluso las que todavía estás sanando. No te abandones. Eres tu mayor aliada.",
            "practice_text": "✨ Práctica sugerida:\n Escribe una carta a la versión de ti que más dudas genera. Háblale con amor, como lo harías con una amiga. Léela en voz alta. Date ese abrazo con palabras que tú misma necesitas.",
            "image_url": "/tarot14.png"
        },
        {
            "id": "15",
            "title": "AGRADECE EL AHORA, AUNQUE NO SEA PERFECTO",
            "description": "Agradecer no significa conformarse. Significa reconocer lo que sí está, lo que sí tienes, lo que sí eres y lo mucho que ha costado.",
            "premium_description": "Agradecer no significa conformarse. Significa reconocer lo que sí está, lo que sí tienes, lo que sí eres y lo mucho que ha costado. El agradecimiento abre espacio en el alma para recibir más. La gratitud, hace vibrar las energías de tal forma que trae consigo en resonancia a la abundancia.\n\nCuando agradeces, la vida responde, toma fuerza y ayuda a la acción. El corazón se expande, y permite ver con ojos de amor hasta lo más ínfimo. Lo simple se vuelve sagrado. Lo que antes era poco, ahora se vuelve demasiado.",
            "practice_text": "✨ Práctica sugerida:\n Haz una pausa. Anota cinco cosas que hoy puedes agradecer, por mínimas que parezcan. Luego pon tu mano en el pecho y di: \"Gracias por esto. Lo honro. Lo recibo\".",
            "image_url": "/tarot15.png"
        },
        {
            "id": "16",
            "title": "HAZLO, AUNQUE TIEMBLE TU VOZ",
            "description": "Hay algo que sabes que debes hacer. Algo que ronda tu alma desde hace tiempo. Pero esperas el momento perfecto, el valor absoluto, la aprobación de otros.",
            "premium_description": "Hay algo que sabes que debes hacer. Algo que ronda tu alma desde hace tiempo. Pero esperas el momento perfecto, el valor absoluto, la aprobación de otros.\n\nHoy esta carta llega para decirte: hazlo igual. Con miedo. Con dudas. Con todo lo que eres. Porque si lo sueñas, es porque tu alma ya está lista. Cuando tu alma se expresa, es como una flor en primavera, su color vibra, su forma es radiante, su aroma perfuma todo a su alrededor.",
            "practice_text": "✨ Práctica sugerida:\n Escribe una acción que has postergado por miedo. Visualízate haciéndola con confianza. Luego da hoy un primer paso —pequeño, pero real— hacia eso.",
            "image_url": "/tarot16.png"
        },
        {
            "id": "17",
            "title": "SUELTA EL CONTROL",
            "description": "El control es una ilusión que nace del miedo. Cuando lo sueltas, no pierdes poder: recuperas paz. Soltar no es abandonar, es confiar.",
            "premium_description": "El control es una ilusión que nace del miedo. Cuando lo sueltas, no pierdes poder: recuperas paz. Soltar no es abandonar, es confiar. Es permitir que la vida también haga su parte. El querer tener todo controlado, no nos permite ser flexibles, y abrirnos a lo que la vida tiene planeados para nosotros.\n\nNo necesitas tener todas las respuestas ahora. Dejarse sorprender por la vida es algo maravilloso. Solo necesitas abrirte a recibir lo que la vida te quiere mostrar.",
            "practice_text": "✨ Práctica sugerida:\n Haz una lista con lo que hoy no puedes controlar. Respira profundo y quema ese papel (con cuidado y conciencia). Mientras lo haces, repite: \"Hoy suelto. Hoy confío. Hoy respiro\".",
            "image_url": "/tarot17.png"
        },
        {
            "id": "18",
            "title": "MERECES TODO LO BUENO QUE ESTÁS SOÑANDO",
            "description": "No estás soñando demasiado. Estás recordando lo que es posible. A veces, te han hecho creer que pedir es egoísta, que desear es exagerado… Pero no.",
            "premium_description": "No estás soñando demasiado. Estás recordando lo que es posible. A veces, te han hecho creer que pedir es egoísta, que desear es exagerado… Pero no.\n\nMereces una vida donde te sientas amada, vista, plena. No por lo que haces. Sino por quien eres. Mereces que todo el amor que brindas, vuelva a tí multiplicado. Mereces relaciones sanas, que te aporten crecimiento.",
            "practice_text": "✨ Práctica sugerida:\n Escribe: \"Merezco…\" y completa con 5 afirmaciones. Léalas cada día durante una semana. Deja que tu sistema se acostumbre a esta verdad.",
            "image_url": "/tarot18.png"
        }
    ]
    
    # Generar 22 cartas adicionales con estructura básica (IDs 19-40)
    for i in range(19, 41):
        tarot_cards.append({
            "id": str(i),
            "title": f"CARTA {i}",
            "description": f"Descripción básica de la carta {i} que verán todos los usuarios. Esta carta trae un mensaje de reflexión y crecimiento personal.",
            "premium_description": f"Descripción extendida y detallada solo para usuarios premium de la carta {i}. Incluye insights profundos y conexiones espirituales más avanzadas.",
            "practice_text": f"✨ Práctica sugerida: Meditación y reflexión específica para la carta {i}. Dedica tiempo a conectar con la energía de esta carta.",
            "image_url": f"/tarot{i}.png"
        })
    
    # Obtener la carta de la lectura anterior si existe para evitar repetir
    last_card_id = None
    if current_user.last_tarot_reading:
        last_reading = await database.tarot_readings.find_one({
            "user_id": current_user.id,
            "reading_date": {"$lte": current_user.last_tarot_reading}
        }, sort=[("reading_date", -1)])
        if last_reading:
            last_card_id = last_reading["card"]["id"]
    
    # Filtrar la carta anterior para evitar repetición
    available_cards = [card for card in tarot_cards if card["id"] != last_card_id]
    if not available_cards:  # Si solo hay una carta disponible
        available_cards = tarot_cards
    
    
    selected_card = random.choice(available_cards)
    
    # Usar la descripción apropiada según el tipo de usuario
    description = selected_card["premium_description"] if current_user.is_premium else selected_card["description"]
    practice_text = selected_card["practice_text"] if current_user.is_premium else None
    
    card = TarotCard(
        id=selected_card["id"],
        title=selected_card["title"],
        description=description,
        meaning=practice_text or "",
        image_url=selected_card["image_url"],
        practice_text=practice_text
    )
    
    reading_data = {
        "_id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "card": card.dict(),
        "reading_date": now,
        "is_premium": current_user.is_premium
    }
    
    await database.tarot_readings.insert_one(reading_data)
    
    # Actualizar la última lectura del usuario
    await database.users.update_one(
        {"_id": current_user.id},
        {"$set": {"last_tarot_reading": now}}
    )
    
    return TarotReading(
        id=reading_data["_id"],
        user_id=current_user.id,
        card=card,
        reading_date=reading_data["reading_date"],
        is_premium=current_user.is_premium
    )



# Rutas de Horóscopo (Solo Premium)
@app.post("/api/horoscope/daily", response_model=HoroscopeResponse)
async def get_daily_horoscope_route(
    horoscope_request: HoroscopeRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="El horóscopo diario está disponible solo para usuarios premium"
        )
    
    # Calcular el signo zodiacal basado en la fecha de nacimiento
    birth_date = datetime.strptime(horoscope_request.birth_date, "%Y-%m-%d")
    zodiac_sign = calculate_zodiac_sign(birth_date)
    
    horoscope_text = await generate_daily_horoscope(zodiac_sign)
    
    return HoroscopeResponse(
        zodiac_sign=zodiac_sign,
        birth_date=horoscope_request.birth_date,
        date=datetime.utcnow(),
        daily_horoscope=horoscope_text,
        is_premium=current_user.is_premium
    )

# Rutas de Suscripción
@app.post("/api/subscription/create-payment-intent")
async def create_payment_intent(current_user: UserResponse = Depends(get_current_user)):
    try:
        if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY == "your_stripe_secret_key_here":
            return {
                "error": "Stripe no está configurado",
                "message": "Configure las claves de Stripe para habilitar pagos"
            }
        
        intent = stripe.PaymentIntent.create(
            amount=1999,  # $19.99 en centavos
            currency='usd',
            metadata={
                'user_id': current_user.id,
                'subscription_type': 'premium_monthly'
            }
        )
        
        return {"client_secret": intent.client_secret}
    except Exception as e:
        logger.error(f"Error creating payment intent: {e}")
        raise HTTPException(status_code=500, detail="Error al crear intención de pago")

@app.post("/api/subscription/upgrade")
async def upgrade_to_premium(current_user: UserResponse = Depends(get_current_user)):
    # En un entorno real, esto se haría después de confirmar el pago
    # Por ahora, simulamos la actualización
    
    subscription_expires = datetime.utcnow() + timedelta(days=30)
    
    await database.users.update_one(
        {"_id": current_user.id},
        {
            "$set": {
                "is_premium": True,
                "subscription_expires": subscription_expires,
                "upgraded_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Suscripción actualizada exitosamente", "expires": subscription_expires}

@app.post("/api/subscription/create-subscription", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_request: SubscriptionRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY == "your_stripe_secret_key_here":
            return SubscriptionResponse(
                status="error",
                client_secret="Stripe no está configurado"
            )
        
        # Crear o recuperar customer de Stripe
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            payment_method=subscription_request.payment_method_id
        )
        
        # Crear suscripción
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Calma Mi Alma Premium',
                    },
                    'unit_amount': 1999,  # $19.99
                    'recurring': {
                        'interval': 'month',
                    },
                },
                'quantity': 1,
            }],
            default_payment_method=subscription_request.payment_method_id,
            expand=['latest_invoice.payment_intent']
        )
        
        # Actualizar usuario a premium
        await database.users.update_one(
            {"_id": current_user.id},
            {
                "$set": {
                    "is_premium": True,
                    "subscription_expires": datetime.utcnow() + timedelta(days=30),
                    "stripe_customer_id": customer.id,
                    "stripe_subscription_id": subscription.id,
                    "upgraded_at": datetime.utcnow()
                }
            }
        )
        
        return SubscriptionResponse(
            status="success",
            subscription_id=subscription.id,
            client_secret=subscription.latest_invoice.payment_intent.client_secret
        )
    
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        return SubscriptionResponse(
            status="error",
            client_secret=str(e)
        )

# Endpoints de administración
@app.post("/api/admin/videos", response_model=VideoResponse)
async def create_video(
    video_request: AdminVideoRequest,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """Crear nuevo video (solo admin)"""
    try:
        video_data = {
            "_id": str(uuid.uuid4()),
            "title": video_request.title,
            "description": video_request.description,
            "youtube_url": video_request.youtube_url,
            "category": video_request.category,
            "thumbnail_url": video_request.thumbnail_url,
            "duration": video_request.duration,
            "is_premium": video_request.is_premium,
            "created_at": datetime.utcnow(),
            "created_by": current_admin.id
        }
        
        await database.videos.insert_one(video_data)
        
        return VideoResponse(
            id=video_data["_id"],
            title=video_data["title"],
            description=video_data["description"],
            youtube_url=video_data["youtube_url"],
            category=video_data["category"],
            thumbnail_url=video_data["thumbnail_url"],
            duration=video_data["duration"],
            is_premium=video_data["is_premium"]
        )
        
    except Exception as e:
        logger.error(f"Error creating video: {e}")
        raise HTTPException(status_code=500, detail="Error al crear video")

@app.post("/api/admin/courses", response_model=CourseResponse)
async def create_course(
    course_request: AdminCourseRequest,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """Crear nuevo curso (solo admin)"""
    try:
        course_data = {
            "_id": str(uuid.uuid4()),
            "title": course_request.title,
            "description": course_request.description,
            "price": course_request.price,
            "duration": course_request.duration,
            "level": course_request.level,
            "image_url": course_request.image_url,
            "youtube_url": course_request.youtube_url,
            "program": course_request.program,
            "created_at": datetime.utcnow(),
            "created_by": current_admin.id
        }
        
        await database.courses.insert_one(course_data)
        
        return CourseResponse(
            id=course_data["_id"],
            title=course_data["title"],
            description=course_data["description"],
            price=course_data["price"],
            duration=course_data["duration"],
            level=course_data["level"],
            image_url=course_data["image_url"]
        )
        
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail="Error al crear curso")

@app.get("/api/admin/videos", response_model=List[VideoResponse])
async def get_admin_videos(current_admin: UserResponse = Depends(get_current_admin_user)):
    """Obtener todos los videos para admin"""
    try:
        videos = await database.videos.find().to_list(length=None)
        admin_videos = []
        
        for video in videos:
            admin_videos.append(VideoResponse(
                id=video["_id"],
                title=video["title"],
                description=video["description"],
                youtube_url=video["youtube_url"],
                category=video["category"],
                thumbnail_url=video.get("thumbnail_url"),
                duration=video.get("duration"),
                is_premium=video["is_premium"]
            ))
        
        return admin_videos
        
    except Exception as e:
        logger.error(f"Error getting admin videos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener videos")

@app.get("/api/admin/courses", response_model=List[CourseResponse])
async def get_admin_courses(current_admin: UserResponse = Depends(get_current_admin_user)):
    """Obtener todos los cursos para admin"""
    try:
        courses = await database.courses.find().to_list(length=None)
        admin_courses = []
        
        for course in courses:
            admin_courses.append(CourseResponse(
                id=course["_id"],
                title=course["title"],
                description=course["description"],
                price=course["price"],
                duration=course["duration"],
                level=course["level"],
                image_url=course.get("image_url")
            ))
        
        return admin_courses
        
    except Exception as e:
        logger.error(f"Error getting admin courses: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener cursos")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=config("HOST", default="0.0.0.0"),
        port=int(config("PORT", default=8001)),
        reload=True
    )
