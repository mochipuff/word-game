from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
from src.script.game_logic import load_word_bank, get_starting_word, is_valid_word, get_bot_move

app = FastAPI(
    title="Word Morph: Alphabets Card Game",
    description="SPA turn-based alphabet word morphing game with intelligent AI difficulty levels."
)

# Mount files static
app.mount("/style", StaticFiles(directory="src/style"), name="style")
app.mount("/script", StaticFiles(directory="src/script"), name="script")

templates = Jinja2Templates(directory="src/templates")

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("page/index.html", {"request": request})

# SEO Configurations
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

# Game REST APIs
@app.get("/api/start")
async def start_game():
    word_bank = load_word_bank()
    start_word = get_starting_word(word_bank)
    
    # Acak dan bagi alfabet menjadi pool P1 dan P2
    alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    random.shuffle(alphabet)
    
    p1_pool = alphabet[:13]
    p2_pool = alphabet[13:]
    
    # Deal awal 7 kartu per-pemain, sisanya masuk tumpukan draw deck
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
