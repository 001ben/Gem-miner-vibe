# /// script
# dependencies = [
#   "Pillow",
# ]
# ///

import math
import os
import random
from PIL import Image

def generate_tracks_texture(filepath):
    width, height = 512, 512
    img = Image.new('RGBA', (width, height), (15, 15, 15, 255)) # Dark grey
    pixels = img.load()

    # Draw Chevrons/Treads
    bar_height = 64
    for y in range(0, height, bar_height):
        for x in range(width):
            offset = abs(x - 256) // 8
            for py in range(y + offset, y + offset + 20):
                if 0 <= py < height:
                    pixels[x, py] = (51, 51, 51, 255)

    img.save(filepath)
    print(f"   [TEXTURE] Generated {filepath}")

# --- Execution ---
if __name__ == "__main__":
    tex_dir = os.path.join(os.getcwd(), "assets", "textures")
    os.makedirs(tex_dir, exist_ok=True)
    generate_tracks_texture(os.path.join(tex_dir, "tracks_texture.png"))
