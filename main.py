import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from src.script.game_logic import load_word_bank, get_starting_word, is_valid_word, get_bot_move

app = FastAPI(
    title="Word Morph: Alphabets Card Game",
    description="SPA turn-based alphabet word morphing game with intelligent AI difficulty levels."
)

template_dir = os.path.join(BASE_DIR, "src", "templates")
if not os.path.exists(template_dir):
    template_dir = os.path.join(os.getcwd(), "src", "templates")

templates = Jinja2Templates(directory=template_dir)

style_dir = os.path.join(BASE_DIR, "src", "style")
if not os.path.exists(style_dir):
    style_dir = os.path.join(os.getcwd(), "src", "style")

script_dir = os.path.join(BASE_DIR, "src", "script")
if not os.path.exists(script_dir):
    script_dir = os.path.join(os.getcwd(), "src", "script")

if os.path.exists(style_dir):
    app.mount("/style", StaticFiles(directory=style_dir), name="style")
if os.path.exists(script_dir):
    app.mount("/script", StaticFiles(directory=script_dir), name="script")

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("page/index.html", {"request": request})

@app.get("/robots.txt", response_class=PlainTextResponse)
async def get_robots():
    return "User-agent: *\nAllow: /\nSitemap: https://alphabets-card-game.vercel.app/sitemap.xml"

@app.get("/sitemap.xml")
async def get_sitemap():
    sitemap_xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://alphabets-card-game.vercel.app/</loc>
        <lastmod>2026-05-28</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>"""
    return Response(content=sitemap_xml, media_type="application/xml")

@app.get("/api/start")
async def start_game():
    word_bank = load_word_bank()
    start_word = get_starting_word(word_bank)
    
    alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    import random
    random.shuffle(alphabet)
    
    p1_pool = alphabet[:13]
    p2_pool = alphabet[13:]
    
    p1_hand = p1_pool[:7]
    p1_draw = p1_pool[7:]
    
    p2_hand = p2_pool[:7]
    p2_draw = p2_pool[7:]
    
    return {
        "start_word": start_word,
        "player": {
            "hand": p1_hand,
            "draw": p1_draw
        },
        "bot": {
            "hand": p2_hand,
            "draw": p2_draw
        }
    }

@app.post("/api/validate-move")
async def validate_move(payload: dict):
    word = payload.get("current_word", "").lower()
    letter = payload.get("letter", "").lower()
    position = payload.get("position")
    
    if not word or not letter or position is None:
        raise HTTPException(status_code=400, detail="Invalid payload parameters")
        
    word_list = list(word)
    if position >= len(word_list):
        raise HTTPException(status_code=400, detail="Invalid target position")
        
    word_list[position] = letter
    new_word = "".join(word_list)
    
    word_bank = load_word_bank()
    valid = is_valid_word(new_word, word_bank)
    
    return {
        "valid": valid,
        "new_word": new_word.upper() if valid else None
    }

@app.post("/api/bot-move")
async def bot_move(payload: dict):
    current_word = payload.get("current_word", "").lower()
    bot_hand = [l.lower() for l in payload.get("bot_hand", [])]
    difficulty = payload.get("difficulty", "medium")
    
    word_bank = load_word_bank()
    move = get_bot_move(current_word, bot_hand, word_bank, difficulty)
    
    if move:
        return {
            "played": True,
            "position": move["position"],
            "letter": move["letter"].upper(),
            "new_word": move["word"].upper()
        }
    return {
        "played": False,
        "message": "Bot has no valid moves remaining."
    }
