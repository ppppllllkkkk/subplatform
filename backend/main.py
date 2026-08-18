import os
import tempfile

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel

from srf_extract import extract_srf_fields
from rfq_generate import generate_rfq_docx
from cbe_data import CANONICAL_ITEMS, VENDORS, guess_vendor
from cbe_extract import extract_vendor_items
from cbe_match import match_vendor_items
from cbe_generate import generate_cbe_xlsx

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
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


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
