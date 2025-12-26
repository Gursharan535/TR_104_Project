import json
import os
import shutil
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Field, Session, SQLModel, create_engine, select
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from pypdf import PdfReader
from tavily import TavilyClient
from dotenv import load_dotenv
import chromadb
from chromadb.utils import embedding_functions
import spacy
from email_validator import validate_email, EmailNotValidError 
from mcp_server import mcp_instance, MCP_TOOLS

# Load NLP Model
try:
    nlp = spacy.load("en_core_web_sm")
except:
    print("Warning: Spacy model not found. Run: python -m spacy download en_core_web_sm")
    nlp = None

# --- CONFIGURATION ---
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

SECRET_KEY = "your_super_secret_key_change_this_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300
DATABASE_URL = "sqlite:///./ai_workspace.db"
UPLOAD_DIR = "static/uploads"

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "") 
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("./chroma_db", exist_ok=True)

# --- VECTOR DB ---
chroma_client = chromadb.PersistentClient(path="./chroma_db")
emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
collection = chroma_client.get_or_create_collection(name="meeting_embeddings", embedding_function=emb_fn)

# --- DATABASE MODELS ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Meeting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str
    date: str
    duration: str
    status: str
    audio_url: Optional[str] = None
    summary: Optional[str] = None
    transcript: Optional[str] = None
    sentiment: Optional[str] = None
    sentimentScore: Optional[int] = 0
    keywords_json: str = "[]" 
    action_items_json: str = "[]"
    speakers_json: str = "[]"

# --- PYDANTIC MODELS ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserRead(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str]

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserRead

class MeetingCreate(BaseModel):
    title: str
    date: str
    duration: str
    status: str
    audio_url: str
    summary: str
    transcript: str
    sentiment: str
    sentimentScore: int
    keywords: List[str]
    actionItems: List[dict]
    speakers: List[dict]

class EmailRequest(BaseModel):
    recipient: str
    subject: str
    body: str

class EmailCheck(BaseModel):
    email: str

# --- SECURITY ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def verify_password(plain_password, hashed_password): return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password): return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_db_and_tables(): SQLModel.metadata.create_all(engine)
def get_session():
    with Session(engine) as session: yield session

def verify_real_email(email: str):
    try:
        v = validate_email(email, check_deliverability=True)
        return v.normalized
    except EmailNotValidError as e:
        raise HTTPException(status_code=400, detail=f"Invalid email: {str(e)}")

# --- APP SETUP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401)
    except JWTError: raise HTTPException(status_code=401)
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None: raise HTTPException(status_code=401)
    return user

def get_tavily_keys():
    keys = []
    for i in range(1, 6):
        k = os.getenv(f"TAVILY_API_KEY_{i}")
        if k: keys.append(k)
    return keys

# --- USER ENDPOINTS (Placing these first to avoid 404s) ---

@app.get("/users/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/auth/check-email")
async def check_email_exists(data: EmailCheck, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    return {"exists": user is not None}

@app.post("/auth/signup", response_model=Token)
def signup(user_data: UserCreate, session: Session = Depends(get_session)):
    valid_email = verify_real_email(user_data.email)
    if session.exec(select(User).where(User.email == valid_email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = User(name=user_data.name, email=valid_email, password_hash=get_password_hash(user_data.password), avatar=f"https://ui-avatars.com/api/?name={user_data.name}&background=random")
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return {"access_token": create_access_token(data={"sub": db_user.email}), "token_type": "bearer", "user": db_user}

@app.post("/auth/login-json", response_model=Token)
def login_json(user_data: dict, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == user_data.get("email"))).first()
    if not user or not verify_password(user_data.get("password"), user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer", "user": user}

# --- MEETING ENDPOINTS ---

@app.get("/meetings")
def get_meetings(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # This GET endpoint was giving 405 because the frontend was calling it before the user was authed
    return session.exec(select(Meeting).where(Meeting.user_id == current_user.id).order_by(Meeting.id.desc())).all()

@app.post("/meetings")
def create_meeting(meeting_data: MeetingCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_meeting = Meeting(
        user_id=current_user.id,
        title=meeting_data.title,
        date=meeting_data.date,
        duration=meeting_data.duration,
        status=meeting_data.status,
        audio_url=meeting_data.audio_url,
        summary=meeting_data.summary,
        transcript=meeting_data.transcript,
        sentiment=meeting_data.sentiment,
        sentimentScore=meeting_data.sentimentScore,
        keywords_json=json.dumps(meeting_data.keywords),
        action_items_json=json.dumps(meeting_data.actionItems),
        speakers_json=json.dumps(meeting_data.speakers)
    )
    session.add(db_meeting)
    session.commit()
    session.refresh(db_meeting)
    
    try:
        text_to_embed = f"{db_meeting.title}\n{db_meeting.summary}\n{db_meeting.transcript[:2000]}"
        collection.add(
            documents=[text_to_embed],
            metadatas=[{"user_id": str(current_user.id), "title": db_meeting.title}],
            ids=[str(db_meeting.id)]
        )
    except Exception as e:
        print(f"⚠️ Embedding failed: {e}")

    return db_meeting

# --- TOOL & MEDIA ENDPOINTS ---

@app.post("/upload-media")
async def upload_media(file: UploadFile = File(...)):
    safe_name = f"{datetime.now().timestamp()}_{file.filename}".replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://localhost:8000/{file_path.replace(os.sep, '/')}"}

@app.post("/nlp/extract-entities")
async def extract_entities(data: dict):
    if not nlp: return {"entities": []}
    text = data.get("text", "")
    doc = nlp(text[:10000])
    entities = []
    seen = set()
    for ent in doc.ents:
        if ent.label_ in ["PERSON", "ORG", "GPE", "DATE", "MONEY"] and ent.text not in seen:
            entities.append({"text": ent.text, "label": ent.label_})
            seen.add(ent.text)
    return {"entities": entities}

@app.post("/tools/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        reader = PdfReader(file.file)
        text = ""
        for page in reader.pages:
            # Extract text
            page_text = page.extract_text() or ""
            # 👇 FIX: Clean up weird characters that break UTF-8
            clean_text = page_text.encode("utf-8", "ignore").decode("utf-8")
            text += clean_text + "\n"
            
        return {"filename": file.filename, "content": text}
    except Exception as e:
        print(f"PDF Parse Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/fact-check")
async def fact_check(query_data: dict):
    keys = get_tavily_keys()
    if not keys: raise HTTPException(status_code=500, detail="No Tavily API keys configured.")
    last_error = None
    for api_key in keys:
        try:
            tavily = TavilyClient(api_key=api_key)
            response = tavily.search(query=query_data["query"], search_depth="basic")
            context = "\n".join([f"- {r['content']} (Source: {r['url']})" for r in response['results'][:3]])
            return {"context": context}
        except Exception as e:
            last_error = str(e)
            continue 
    raise HTTPException(status_code=500, detail=f"All search keys failed. {last_error}")

@app.post("/tools/semantic-search")
async def semantic_search(query_data: dict, current_user: User = Depends(get_current_user)):
    query = query_data.get("query")
    try:
        results = collection.query(
            query_texts=[query],
            n_results=5,
            where={"user_id": str(current_user.id)}
        )
        matched_ids = results['ids'][0] if results['ids'] else []
        return {"matched_ids": matched_ids}
    except Exception as e:
        return {"matched_ids": []}

@app.post("/debug/regenerate-embeddings")
async def regenerate_embeddings(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    meetings = session.exec(select(Meeting).where(Meeting.user_id == current_user.id)).all()
    count = 0
    for m in meetings:
        try:
            text = f"{m.title}\n{m.summary}\n{m.transcript[:2000]}"
            collection.upsert(
                documents=[text],
                metadatas=[{"user_id": str(current_user.id), "title": m.title}],
                ids=[str(m.id)]
            )
            count += 1
        except Exception as e:
            print(f"Error: {e}")
    return {"message": f"Successfully indexed {count} meetings."}

@app.post("/tools/send-email")
async def send_email_endpoint(email_data: EmailRequest):
    my_email = os.getenv("SMTP_EMAIL")
    my_password = os.getenv("SMTP_PASSWORD")

    if not my_email or not my_password:
        print(f"MOCK EMAIL TO: {email_data.recipient}")
        return {"message": "Mock email sent"}

    try:
        msg = MIMEMultipart()
        msg['From'] = my_email
        msg['To'] = email_data.recipient
        msg['Subject'] = email_data.subject
        msg.attach(MIMEText(email_data.body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(my_email, my_password)
        server.send_message(msg)
        server.quit()
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- MCP ENDPOINT ---
@app.post("/mcp/process")
async def mcp_process(request: dict):
    tool_name = request.get("tool")
    arguments = request.get("args", {})
    result = mcp_instance.execute_tool(tool_name, arguments)
    return {"tool": tool_name, "result": result}