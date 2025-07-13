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
        subscription_expires=user.get("subscription_expires")
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
    await database.natal_charts.create_index("user_id")
    
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
        # Verificar si ya existe un usuario premium de prueba
        existing_user = await database.users.find_one({"email": "premium@calmamialma.com"})
        if existing_user:
            return {"message": "Usuario premium de prueba ya existe", "email": "premium@calmamialma.com"}
        
        # Crear usuario premium de prueba
        premium_user = {
            "_id": str(uuid.uuid4()),
            "email": "premium@calmamialma.com",
            "name": "Usuario Premium",
            "password": get_password_hash("premium123"),
            "is_premium": True,
            "created_at": datetime.utcnow(),
            "subscription_expires": datetime.utcnow() + timedelta(days=30)
        }
        
        await database.users.insert_one(premium_user)
        
        return {
            "message": "Usuario premium de prueba creado exitosamente",
            "email": "premium@calmamialma.com",
            "password": "premium123",
            "note": "Úsalo para probar funcionalidades premium"
        }
        
    except Exception as e:
        logger.error(f"Error creating premium user: {e}")
        raise HTTPException(status_code=500, detail="Error al crear usuario premium")

# Rutas de Tarot
@app.get("/api/tarot/daily", response_model=TarotReading)
async def get_daily_tarot(current_user: UserResponse = Depends(get_current_user)):
    # Verificar si ya tiene una lectura hoy
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_reading = await database.tarot_readings.find_one({
        "user_id": current_user.id,
        "reading_date": {"$gte": today}
    })
    
    if existing_reading:
        return TarotReading(**existing_reading)
    
    # Generar nueva lectura
    import random
    tarot_cards = [
        {"id": "1", "title": "El Loco", "description": "Nuevos comienzos"},
        {"id": "2", "title": "El Mago", "description": "Manifestación"},
        {"id": "3", "title": "La Emperatriz", "description": "Abundancia"},
        {"id": "4", "title": "El Emperador", "description": "Liderazgo"},
        {"id": "5", "title": "El Hierofante", "description": "Tradición"},
    ]
    
    selected_card = random.choice(tarot_cards)
    reading_text = await generate_tarot_reading(selected_card, current_user.is_premium)
    
    card = TarotCard(
        id=selected_card["id"],
        title=selected_card["title"],
        description=selected_card["description"],
        meaning=reading_text
    )
    
    reading_data = {
        "_id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "card": card.dict(),
        "reading_date": datetime.utcnow(),
        "is_premium": current_user.is_premium
    }
    
    await database.tarot_readings.insert_one(reading_data)
    
    return TarotReading(
        id=reading_data["_id"],
        user_id=current_user.id,
        card=card,
        reading_date=reading_data["reading_date"],
        is_premium=current_user.is_premium
    )



# Rutas de Horóscopo
@app.post("/api/horoscope/daily", response_model=HoroscopeResponse)
async def get_daily_horoscope_route(
    horoscope_request: HoroscopeRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    horoscope_text = await generate_daily_horoscope(horoscope_request.zodiac_sign)
    
    return HoroscopeResponse(
        zodiac_sign=horoscope_request.zodiac_sign,
        date=datetime.utcnow(),
        daily_horoscope=horoscope_text,
        is_premium=current_user.is_premium
    )

# Rutas de Suscripción
@app.post("/api/subscription/create-payment-intent")
async def create_payment_intent(current_user: UserResponse = Depends(get_current_user)):
    try:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=config("HOST", default="0.0.0.0"),
        port=int(config("PORT", default=8001)),
        reload=True
    )