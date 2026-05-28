import os
import json
import random

def load_word_bank():
    # Mengambil base path relatif terhadap file ini
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, "data", "word-bank.json")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_starting_word(word_bank):
    verbs = word_bank.get("verbs", [])
    valid_verbs = [v for v in verbs if len(v) <= 4]
    return random.choice(valid_verbs).upper() if valid_verbs else "WORK"

def is_valid_word(word, word_bank):
    word_lower = word.lower()
    return word_lower in word_bank.get("valid_words", []) or word_lower in word_bank.get("verbs", [])

def get_valid_transitions(current_word, hand, word_bank):
    transitions = []
    current_word = current_word.lower()
    valid_words_set = set(word_bank.get("valid_words", []) + word_bank.get("verbs", []))
    
    for idx, orig_char in enumerate(current_word):
        for letter in hand:
            letter_lower = letter.lower()
            if letter_lower == orig_char:
                continue
            
            # Buat kandidat kata baru
            candidate = list(current_word)
            candidate[idx] = letter_lower
            cand_word = "".join(candidate)
            
            if cand_word in valid_words_set:
                transitions.append({
                    "position": idx,
                    "letter": letter_lower,
                    "word": cand_word
                })
    return transitions

def get_bot_move(current_word, bot_hand, word_bank, difficulty="medium"):
    transitions = get_valid_transitions(current_word, bot_hand, word_bank)
    if not transitions:
        return None
        
    if difficulty == "easy":
        # 30% kemungkinan bot gagal menemukan kata (menyerah)
        if random.random() < 0.3:
            return None
        return random.choice(transitions)
        
    elif difficulty == "medium":
        # 10% kemungkinan bot gagal menemukan kata
        if random.random() < 0.1:
            return None
        return random.choice(transitions)
        
    elif difficulty == "hard":
        # AI Heuristik: Pilih kata yang menyisakan cabang kata tetangga paling sedikit di kamus
        # Menghambat opsi balasan dari player
        best_move = None
        min_opponent_responses = 9999
        valid_words_set = set(word_bank.get("valid_words", []) + word_bank.get("verbs", []))
        
        for move in transitions:
            cand_word = move["word"]
            neighbor_count = 0
            
            # Hitung jumlah kemungkinan kata turunan dari cand_word
            for i in range(len(cand_word)):
                for c in "abcdefghijklmnopqrstuvwxyz":
                    if c == cand_word[i]:
                        continue
                    test_list = list(cand_word)
                    test_list[i] = c
                    test_word = "".join(test_list)
                    if test_word in valid_words_set:
                        neighbor_count += 1
            
            if neighbor_count < min_opponent_responses:
                min_opponent_responses = neighbor_count
                best_move = move
                
        return best_move if best_move else random.choice(transitions)
