from fastapi import FastAPI, HTTPException, Depends, status, Request, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
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
            created_at=user_doc["created_at"],
            subscription_expires=user_doc.get("subscription_expires")
        )
        
        return Token(access_token=access_token, token_type="bearer", user=user_response)
        
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
        created_at=user["created_at"],
        subscription_expires=user.get("subscription_expires")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

# Rutas de Videos
@app.get("/api/videos", response_model=List[VideoResponse])
async def get_videos(current_user: UserResponse = Depends(get_current_user)):
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
        if video_data["is_premium"] and not current_user.is_premium:
            video_data["youtube_url"] = ""
        
        videos.append(VideoResponse(**video_data))
    
    return videos

# Rutas de Cursos
@app.get("/api/courses", response_model=List[CourseResponse])
async def get_courses(current_user: UserResponse = Depends(get_current_user)):
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
        }
    ]
    
    courses = []
    for course_data in courses_data:
        # Aplicar descuento del 30% para usuarios premium
        if current_user.is_premium:
            course_data["discounted_price"] = course_data["price"] * 0.7
        
        courses.append(CourseResponse(**course_data))
    
    return courses

# Rutas de Blog
@app.get("/api/blog/posts", response_model=List[BlogPostSummary])
async def get_blog_posts(current_user: UserResponse = Depends(get_current_user)):
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
        if not current_user.is_premium:
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
async def get_blog_post(post_id: str, current_user: UserResponse = Depends(get_current_user)):
    post = await database.blog_posts.find_one({"_id": post_id})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    # Para usuarios gratuitos, mostrar solo las primeras 3 líneas
    if not current_user.is_premium:
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
    current_user: UserResponse = Depends(get_current_user)
):
    # Solo usuarios premium pueden crear posts (o podrías agregar rol de admin)
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="Solo usuarios premium pueden crear posts"
        )
    
    post_data = {
        "_id": str(uuid.uuid4()),
        "title": post_request.title,
        "content": post_request.content,
        "excerpt": post_request.excerpt,
        "image_url": post_request.image_url,
        "published_date": datetime.utcnow(),
        "author": current_user.name
    }
    
    await database.blog_posts.insert_one(post_data)
    
    return BlogPostResponse(**post_data)

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
        # Gratuita: 1 lectura cada 3 días
        three_days_ago = now - timedelta(days=3)
        recent_reading = await database.tarot_readings.find_one({
            "user_id": current_user.id,
            "reading_date": {"$gte": three_days_ago}
        })
        
        if recent_reading:
            # Calcular tiempo restante para la próxima lectura
            next_reading_date = recent_reading["reading_date"] + timedelta(days=3)
            hours_remaining = (next_reading_date - now).total_seconds() / 3600
            
            if hours_remaining > 0:
                raise HTTPException(
                    status_code=403,
                    detail=f"Debes esperar {int(hours_remaining)} horas más para tu próxima lectura. Actualiza a Premium para lecturas diarias."
                )
    
    # Generar nueva lectura
    import random
    tarot_cards = [
        {"id": "1", "title": "El Loco", "description": "Nuevos comienzos", "image_url": "/carta-tarot-dorso.png"},
        {"id": "2", "title": "El Mago", "description": "Manifestación", "image_url": "/carta-tarot-dorso.png"},
        {"id": "3", "title": "La Emperatriz", "description": "Abundancia", "image_url": "/carta-tarot-dorso.png"},
        {"id": "4", "title": "El Emperador", "description": "Liderazgo", "image_url": "/carta-tarot-dorso.png"},
        {"id": "5", "title": "El Hierofante", "description": "Tradición", "image_url": "/carta-tarot-dorso.png"},
        {"id": "6", "title": "Los Amantes", "description": "Amor y decisiones", "image_url": "/carta-tarot-dorso.png"},
        {"id": "7", "title": "El Carro", "description": "Determinación", "image_url": "/carta-tarot-dorso.png"},
        {"id": "8", "title": "La Justicia", "description": "Equilibrio", "image_url": "/carta-tarot-dorso.png"},
        {"id": "9", "title": "El Ermitaño", "description": "Introspección", "image_url": "/carta-tarot-dorso.png"},
        {"id": "10", "title": "La Rueda de la Fortuna", "description": "Cambio y destino", "image_url": "/carta-tarot-dorso.png"},
    ]
    
    selected_card = random.choice(tarot_cards)
    reading_text = await generate_tarot_reading(selected_card, current_user.is_premium)
    
    card = TarotCard(
        id=selected_card["id"],
        title=selected_card["title"],
        description=selected_card["description"],
        meaning=reading_text,
        image_url=selected_card["image_url"]
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=config("HOST", default="0.0.0.0"),
        port=int(config("PORT", default=8001)),
        reload=True
    )