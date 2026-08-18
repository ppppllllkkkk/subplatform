import os
import tempfile

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel

from srf_extract import extract_srf_fields
from rfq_generate import generate_rfq_docx
from cbe_data import CANONICAL_ITEMS, VENDORS, guess_vendor
from cbe_extract import extract_vendor_items
from cbe_match import match_vendor_items
from cbe_generate import generate_cbe_xlsx
import db

app = FastAPI(title="Subcontractor Platform API")

# На Render задайте переменную окружения FRONTEND_ORIGIN с адресом фронтенда
# (например, https://your-app.onrender.com). Локально по умолчанию разрешён
# адрес dev-сервера Vite.
#
# render.yaml подставляет сюда голый хост сервиса (без схемы, через
# fromService/RENDER_EXTERNAL_HOSTNAME) — если схемы нет, достраиваем https://.
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
if FRONTEND_ORIGIN and not FRONTEND_ORIGIN.startswith(("http://", "https://")):
    FRONTEND_ORIGIN = f"https://{FRONTEND_ORIGIN}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["*"],
)

# --- Пароль на весь сайт (пока команда небольшая — один общий пароль) ---
#
# Задаётся переменной окружения APP_PASSWORD (на Render — sync: false,
# спросится один раз при создании Blueprint'а). Если переменная не задана —
# проверка отключена (например, для локальной разработки).
APP_PASSWORD = os.environ.get("APP_PASSWORD")

# Пути, которые остаются доступны без пароля: health-check самого Render.
_PUBLIC_PATHS = {"/api/health"}


@app.middleware("http")
async def check_password(request: Request, call_next):
    if APP_PASSWORD and request.url.path.startswith("/api") and request.url.path not in _PUBLIC_PATHS:
        if request.headers.get("X-App-Password") != APP_PASSWORD:
            return JSONResponse(status_code=401, content={"detail": "Неверный пароль"})
    return await call_next(request)


@app.on_event("startup")
def on_startup():
    try:
        db.init_db()
    except Exception as e:
        # Не роняем весь сервис, если БД временно недоступна при старте
        # (например, ещё поднимается при первом деплое, или сетевой сбой).
        # SRF/RFQ/CBE не зависят от БД и должны продолжать работать;
        # /api/database вернёт ошибку по факту обращения, если проблема
        # не исчезнет сама.
        print(f"[startup] БД недоступна при старте, продолжаю без неё: {e}")


class RfqFields(BaseModel):
    issuedBy: str = ""
    invitedBidder: str = ""
    rfqReference: str = ""
    issueDate: str = ""
    workLocation: str = ""
    expectedStart: str = ""
    requiredCompletion: str = ""
    bidDate: str = ""
    projectName: str = ""
    projectDescription: str = ""
    scope: str = ""


class CbeGenerateRequest(BaseModel):
    assignments: dict[str, dict[str, str]]


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Общая база субподрядчиков (шарится между всеми, кто открыл сайт) ---


class WorkbookPayload(BaseModel):
    fileName: str
    categories: list


@app.get("/api/database")
def database_get():
    if not db.is_configured():
        raise HTTPException(status_code=503, detail="База данных не подключена (нет DATABASE_URL)")
    try:
        return db.load_workbook()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"База данных недоступна: {e}")


@app.post("/api/database")
def database_save(payload: WorkbookPayload):
    if not db.is_configured():
        raise HTTPException(status_code=503, detail="База данных не подключена (нет DATABASE_URL)")
    try:
        db.save_workbook(payload.fileName, payload.categories)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"База данных недоступна: {e}")
    return {"status": "ok"}


@app.delete("/api/database")
def database_clear():
    if not db.is_configured():
        raise HTTPException(status_code=503, detail="База данных не подключена (нет DATABASE_URL)")
    try:
        db.clear_workbook()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"База данных недоступна: {e}")
    return {"status": "ok"}


@app.post("/api/srf/extract")
async def srf_extract(file: UploadFile = File(...)):
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Ожидается файл в формате PDF")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        fields = extract_srf_fields(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Не удалось разобрать файл: {e}")
    finally:
        os.unlink(tmp_path)

    return fields


@app.post("/api/rfq/generate")
async def rfq_generate(fields: RfqFields):
    tmp_path = tempfile.mktemp(suffix=".docx")
    try:
        generate_rfq_docx(fields.model_dump(), tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не удалось собрать документ: {e}")

    return FileResponse(
        tmp_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="RFQ.docx",
        background=BackgroundTask(os.unlink, tmp_path),
    )


@app.get("/api/cbe/reference")
def cbe_reference():
    return {
        "items": [{"id": i["id"], "name": i["name"]} for i in CANONICAL_ITEMS],
        "vendors": [{"id": v["id"], "name": v["name"]} for v in VENDORS],
    }


@app.post("/api/cbe/extract")
async def cbe_extract(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        try:
            extracted = extract_vendor_items(tmp_path)
            matched = match_vendor_items(extracted["items"])
            vendor_guess = guess_vendor(file.filename + " " + extracted.get("raw_text", ""))
            results.append(
                {
                    "filename": file.filename,
                    "source": extracted["source"],
                    "vendorGuess": vendor_guess,
                    "items": matched,
                }
            )
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e), "items": []})
        finally:
            os.unlink(tmp_path)

    return {"results": results}


@app.post("/api/cbe/generate")
async def cbe_generate(payload: CbeGenerateRequest):
    tmp_path = tempfile.mktemp(suffix=".xlsx")
    try:
        generate_cbe_xlsx(payload.assignments, tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не удалось собрать документ: {e}")

    return FileResponse(
        tmp_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="CBE_Training.xlsx",
        background=BackgroundTask(os.unlink, tmp_path),
    )
