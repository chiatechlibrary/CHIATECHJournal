from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "images" / "domains" / "setehem-icon-sheet.png"
OUT = SOURCE.parent
NAMES = [
    ("science", 0, 0),
    ("technology", 1, 0),
    ("engineering", 2, 0),
    ("mathematics", 3, 0),
    ("education", 0, 1),
    ("humanities-social-sciences", 1, 1),
    ("entrepreneurship-management", 2, 1),
]

image = Image.open(SOURCE).convert("RGB")
width, height = image.size
cell_w = width // 4
cell_h = height // 2

for name, column, row in NAMES:
    left = column * cell_w
    right = width if column == 3 else (column + 1) * cell_w
    top = row * cell_h
    bottom = height if row == 1 else (row + 1) * cell_h
    cell = image.crop((left, top, right, bottom))
    white = Image.new("RGB", cell.size, "white")
    difference = ImageEnhance.Contrast(ImageChops.difference(cell, white).convert("L")).enhance(2.2)
    mask = difference.point(lambda pixel: 255 if pixel > 18 else 0)
    bounds = mask.getbbox()
    if bounds:
        pad = 10
        bounds = (
            max(0, bounds[0] - pad),
            max(0, bounds[1] - pad),
            min(cell.width, bounds[2] + pad),
            min(cell.height, bounds[3] + pad),
        )
        cell = cell.crop(bounds)
    cell.thumbnail((432, 432), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (512, 512), "white")
    canvas.paste(cell, ((512 - cell.width) // 2, (512 - cell.height) // 2))
    canvas.save(OUT / f"{name}.png", optimize=True)
    print(OUT / f"{name}.png")
