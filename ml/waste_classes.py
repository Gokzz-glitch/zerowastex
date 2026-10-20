# ============================================================
# Zer0wasteX — Waste Class Taxonomy
# ============================================================

WASTE_CLASSES = {
    0: "organic",
    1: "plastic",
    2: "paper",
    3: "metal",
    4: "glass",
    5: "hazardous",
}

CLASS_LABELS = {
    "organic":   {"emoji": "🍌", "color": "#84cc16", "hindi": "जैविक",   "tamil": "கரிம"},
    "plastic":   {"emoji": "🧴", "color": "#38bdf8", "hindi": "प्लास्टिक", "tamil": "பிளாஸ்டிக்"},
    "paper":     {"emoji": "📰", "color": "#fbbf24", "hindi": "कागज़",    "tamil": "காகிதம்"},
    "metal":     {"emoji": "🥫", "color": "#94a3b8", "hindi": "धातु",    "tamil": "உலோகம்"},
    "glass":     {"emoji": "🍾", "color": "#a78bfa", "hindi": "कांच",    "tamil": "கண்ணாடி"},
    "hazardous": {"emoji": "☣️", "color": "#ef4444", "hindi": "खतरनाक",  "tamil": "அபாயகரமான"},
}

SEGREGATION_RULES = {
    "wet_bin": ["organic"],
    "dry_bin": ["plastic", "paper", "metal", "glass"],
    "hazardous_bin": ["hazardous"],
}

CLASS_DIFFICULTY = {
    "organic": 1.0,
    "plastic": 1.0,
    "paper": 0.9,
    "metal": 0.9,
    "glass": 0.8,
    "hazardous": 1.2,
}

MLP_TAXONOMY = {
    "plastic_general": {"label": "General Plastic", "is_mlp_candidate": False, "is_heuristic": False},
    "mlp_sachet": {"label": "Sachet", "is_mlp_candidate": True, "is_heuristic": True},
    "mlp_laminated_pouch": {"label": "Laminated Pouch", "is_mlp_candidate": True, "is_heuristic": True},
    "mlp_wrapper": {"label": "Wrapper", "is_mlp_candidate": True, "is_heuristic": True},
    "mlp_polybag": {"label": "Polybag", "is_mlp_candidate": True, "is_heuristic": True},
    "mlp_contaminated": {"label": "Contaminated MLP", "is_mlp_candidate": True, "is_heuristic": True},
}

MLP_KEYWORD_HEURISTICS = {
    "sachet": "mlp_sachet",
    "wrapper": "mlp_wrapper",
    "pouch": "mlp_laminated_pouch",
    "polybag": "mlp_polybag",
    "bag": "mlp_polybag",
    "contaminated": "mlp_contaminated",
    "foil": "mlp_laminated_pouch",
}
