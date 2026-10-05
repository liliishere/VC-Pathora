"""
A tiny stand-in for YOUR future model, so you can test the custom-model path today.
Run:  python -m app.ai.mock_model_server      (listens on :9000)
Then: TI_AI_PROVIDER=custom uvicorn app.main:app
Replace this file's logic with your real model (e.g. a fine-tuned LLM) — keep the same JSON contract.
"""
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Mock model")

@app.post("/generate")
def generate(req: dict):
    cands = req.get("candidates", [])
    return {"title": f"[mock model] {len(cands)} ideas for you",
            "text": "This answer came from the custom-model endpoint.",
            "places": [{"id": c["id"], "why": "(model) " + c["why"]} for c in cands]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
