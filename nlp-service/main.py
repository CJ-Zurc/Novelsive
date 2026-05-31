from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import torch

app = FastAPI(title="Novelsive NLP Emotion Service")

# Load emotion classification pipeline
# bhadresh-savani/distilbert-base-uncased-emotion predicts: sadness, joy, love, anger, fear, surprise
try:
    print("Loading emotion classification model...")
    # Use CPU explicitly to save memory and avoid CUDA issues on user machine
    classifier = pipeline(
        "sentiment-analysis", 
        model="bhadresh-savani/distilbert-base-uncased-emotion",
        device=-1
    )
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    # Fallback placeholder if Hugging Face is offline/inaccessible
    classifier = None

class AnalyzeRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"status": "running", "model": "bhadresh-savani/distilbert-base-uncased-emotion"}

@app.post("/analyze")
def analyze_text(request: AnalyzeRequest):
    if not request.text.strip():
        return {"emotion": "NEUTRAL", "confidence": 1.0}

    # If classifier didn't load, use a heuristic fallback
    if classifier is None:
        return fallback_analyze(request.text)

    try:
        # Run inference
        results = classifier(request.text)
        if not results:
            return {"emotion": "NEUTRAL", "confidence": 1.0}
            
        result = results[0]
        label = result['label'].upper() # JOY, SADNESS, ANGER, FEAR, SURPRISE, LOVE
        score = float(result['score'])

        # Mapping model labels to system labels:
        # Allowed labels: JOY, SADNESS, ANGER, FEAR, SURPRISE, LOVE, NEUTRAL, DISGUST
        # If score is too low, we classify as NEUTRAL
        if score < 0.40:
            return {"emotion": "NEUTRAL", "confidence": score}

        # Check for simple disgust keywords since the model doesn't output disgust
        disgust_keywords = ["disgust", "gross", "revolting", "nasty", "repulsive", "sickening", "yuck"]
        if any(kw in request.text.lower() for kw in disgust_keywords):
            return {"emotion": "DISGUST", "confidence": max(score, 0.7)}

        return {"emotion": label, "confidence": score}

    except Exception as e:
        print(f"Inference error: {e}")
        return fallback_analyze(request.text)

def fallback_analyze(text: str) -> dict:
    # Heuristic analyzer fallback
    text_lower = text.lower()
    
    # Emotion keyword list mapping
    mapping = {
        "JOY": ["happy", "joy", "glad", "excited", "cheerful", "smile", "laugh", "delight", "wonderful"],
        "SADNESS": ["sad", "cry", "tears", "grief", "sorrow", "depressed", "lonely", "hurt", "pain"],
        "ANGER": ["angry", "mad", "furious", "hate", "rage", "annoyed", "irritated", "pissed"],
        "FEAR": ["scared", "afraid", "fear", "terrified", "panic", "dread", "frightened", "spooky"],
        "SURPRISE": ["surprised", "shocked", "amazing", "wow", "unexpected", "astonished"],
        "LOVE": ["love", "adore", "affection", "romantic", "darling", "sweetheart", "passion"],
        "DISGUST": ["gross", "disgust", "nasty", "revolting", "repulsive", "yuck"]
    }
    
    found_emotion = "NEUTRAL"
    max_matches = 0
    
    for emotion, keywords in mapping.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches > max_matches:
            max_matches = matches
            found_emotion = emotion
            
    return {"emotion": found_emotion, "confidence": 0.5 if found_emotion != "NEUTRAL" else 1.0}
