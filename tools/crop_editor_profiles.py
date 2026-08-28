from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "editors" / "editorial-portfolio-sheet.png"
OUTPUT = ROOT / "assets" / "editors"

PROFILES = [
    ("science-editor.png", 0, 0),
    ("technology-editor.png", 1, 0),
    ("engineering-editor.png", 2, 0),
    ("mathematics-editor.png", 3, 0),
    ("education-editor.png", 0, 1),
    ("humanities-social-sciences-editor.png", 1, 1),
    ("entrepreneurship-management-editor.png", 2, 1),
]

COLS = [(0.010, 0.245), (0.258, 0.495), (0.507, 0.744), (0.755, 0.992)]
ROWS = [(0.012, 0.495), (0.506, 0.990)]


with Image.open(SOURCE) as sheet:
    width, height = sheet.size
    for filename, column, row in PROFILES:
        x1, x2 = COLS[column]
        y1, y2 = ROWS[row]
        portrait = sheet.crop((round(width * x1), round(height * y1), round(width * x2), round(height * y2)))
        target_width = 720
        target_height = round(portrait.height * target_width / portrait.width)
        portrait = portrait.resize((target_width, target_height), Image.Resampling.LANCZOS)
        portrait.save(OUTPUT / filename, format="PNG", optimize=True)
        print(f"Created {filename}: {portrait.width}×{portrait.height}")
