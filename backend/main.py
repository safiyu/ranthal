import io
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from PIL import Image
import torch
from transformers import AutoModelForImageSegmentation
from torchvision import transforms
import numpy as np
import pytesseract

app = FastAPI(title="Antigravity Backend API")

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer(auto_error=False)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory user store (replace with database in production)
users_db: dict = {}

# Global model variable for background removal
model = None
device = None

def load_model():
    """Load the RMBG-1.4 model"""
    global model, device
    if model is None:
        print("Loading RMBG-1.4 model...")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = AutoModelForImageSegmentation.from_pretrained(
            "briaai/RMBG-1.4",
            trust_remote_code=True
        )
        model.to(device)
        model.eval()
        print(f"Model loaded on {device}")
    return model, device

# Preprocessing transform for background removal
transform = transforms.Compose([
    transforms.Resize((1024, 1024)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    """Pre-load background removal model on startup"""
    load_model()

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

# ==================== AUTH ENDPOINTS ====================

@app.post("/auth/register")
async def register(email: str, password: str, name: Optional[str] = None):
    """Register a new user"""
    if email in users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = f"user_{len(users_db) + 1}"
    users_db[email] = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "created_at": datetime.utcnow().isoformat()
    }
    
    token = create_token(user_id, email)
    return {"message": "User created", "token": token, "user_id": user_id}

@app.post("/auth/login")
async def login(email: str, password: str):
    """Authenticate and return JWT token"""
    user = users_db.get(email)
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], email)
    return {"token": token, "user_id": user["id"], "name": user.get("name")}

@app.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user from JWT"""
    email = user.get("email")
    user_data = users_db.get(email, {})
    return {
        "id": user.get("sub"),
        "email": email,
        "name": user_data.get("name")
    }

# ==================== OCR ENDPOINT ====================

@app.post("/ocr")
async def extract_text(image: UploadFile = File(...)):
    """Extract text from image using Tesseract OCR"""
    try:
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(pil_image)
        
        return {"text": text.strip()}
        
    except Exception as e:
        print(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BACKGROUND REMOVAL ====================

@app.post("/remove-bg")
async def remove_background(image: UploadFile = File(...)):
    """Remove background from uploaded image"""
    try:
        model_instance, dev = load_model()
        
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        original_size = pil_image.size
        
        input_tensor = transform(pil_image).unsqueeze(0).to(dev)
        
        with torch.no_grad():
            outputs = model_instance(input_tensor)
        
        mask = outputs[0][0].squeeze().cpu().numpy()
        mask_image = Image.fromarray((mask * 255).astype(np.uint8))
        mask_image = mask_image.resize(original_size, Image.BILINEAR)
        
        result = pil_image.copy()
        result.putalpha(mask_image)
        
        output_buffer = io.BytesIO()
        result.save(output_buffer, format="PNG")
        output_buffer.seek(0)
        
        return Response(
            content=output_buffer.getvalue(),
            media_type="image/png"
        )
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
