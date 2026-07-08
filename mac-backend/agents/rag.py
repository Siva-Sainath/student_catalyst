import os
import re

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "documents")

def initialize_docs():
    os.makedirs(DOCS_DIR, exist_ok=True)
    # Seed default handbook if empty
    handbook_path = os.path.join(DOCS_DIR, "handbook.txt")
    if not os.listdir(DOCS_DIR):
        with open(handbook_path, "w", encoding="utf-8") as f:
            f.write(
                "Hostel Curfew & Guidelines:\n"
                "The hostel main gate closes strictly at 9:00 PM for all students. Late entry is only permitted with a pre-approved gate pass from the Warden.\n\n"
                "Mess Timings & Menu:\n"
                "Breakfast: 7:30 AM - 9:00 AM (Monday: Dosa, Tuesday: Idli, Wednesday: Poori).\n"
                "Lunch: 12:30 PM - 2:00 PM.\n"
                "Dinner: 7:30 PM - 9:00 PM. Mess gates close at 9:00 PM.\n\n"
                "Library Timings:\n"
                "The central library is open from 9:00 AM to 10:00 PM on weekdays. On Saturdays and Sundays, it closes at 6:00 PM.\n\n"
                "Placement Eligibility:\n"
                "Students must maintain a minimum CGPA of 8.0 to participate in the campus placement drive. No active backlogs are allowed.\n\n"
                "Campus Contact Numbers:\n"
                "Academics Office: +91-44-3993101\n"
                "Hostel Warden Office: +91-44-3993102\n"
                "Emergency Health Center: +91-44-3993103\n"
            )

def get_chunks() -> list[dict]:
    initialize_docs()
    chunks = []
    
    def chunk_text(text: str, max_size: int = 800, overlap: int = 100) -> list[str]:
        if len(text) <= max_size:
            return [text]
        sub_chunks = []
        start = 0
        while start < len(text):
            end = start + max_size
            if end >= len(text):
                sub_chunks.append(text[start:])
                break
            
            # Find last sentence end or space boundary
            search_slice = text[end - overlap:end]
            boundary = -1
            for separator in [". ", "? ", "! ", "\n"]:
                pos = search_slice.rfind(separator)
                if pos > boundary:
                    boundary = pos
            
            if boundary != -1:
                actual_end = end - overlap + boundary + 1
            else:
                space_pos = search_slice.rfind(" ")
                if space_pos != -1:
                    actual_end = end - overlap + space_pos
                else:
                    actual_end = end
            
            sub_chunks.append(text[start:actual_end].strip())
            next_start = actual_end - overlap
            if next_start <= start:
                next_start = start + max_size - overlap
            start = next_start
        return [c for c in sub_chunks if c]

    for filename in os.listdir(DOCS_DIR):
        if not filename.endswith((".txt", ".md")):
            continue
        filepath = os.path.join(DOCS_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            # Split by double newlines to get paragraphs/sections
            paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
            chunk_idx = 0
            for p in paragraphs:
                sub_pts = chunk_text(p)
                for sub in sub_pts:
                    chunks.append({
                        "source": filename,
                        "index": chunk_idx,
                        "text": sub
                    })
                    chunk_idx += 1
        except Exception:
            pass
    return chunks

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant",
    "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having",
    "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how",
    "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself",
    "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shant",
    "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that", "thats",
    "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyd",
    "theyll", "theyre", "theyve", "this", "those", "through", "to", "too", "under", "until", "up", "very",
    "was", "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens",
    "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would",
    "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself", "yourselves"
}

def search_context(query: str, limit: int = 3) -> list[dict]:
    chunks = get_chunks()
    raw_words = set(re.findall(r'\w+', query.lower()))
    query_words = {w for w in raw_words if w not in STOP_WORDS}
    if not query_words:
        query_words = raw_words
    if not query_words:
        return []
        
    scored_chunks = []
    for chunk in chunks:
        chunk_words = re.findall(r'\w+', chunk["text"].lower())
        if not chunk_words:
            continue
        # Count term matches
        matches = sum(1 for w in query_words if w in chunk_words)
        score = matches / (len(set(chunk_words)) ** 0.15) if matches > 0 else 0
        if score > 0:
            scored_chunks.append((score, chunk))
            
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored_chunks[:limit]]
