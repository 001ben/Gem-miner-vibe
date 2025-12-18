import bpy
import math
import os
import random

def generate_body_texture(filepath):
    width, height = 512, 512
    size = width * height
    # Base Yellow: #FFAA00 -> (1.0, 0.666, 0.0, 1.0)
    base_r, base_g, base_b, base_a = 1.0, 0.666, 0.0, 1.0
    pixels = [0.0] * (size * 4)
    for i in range(size):
        idx = i * 4
        pixels[idx], pixels[idx+1], pixels[idx+2], pixels[idx+3] = base_r, base_g, base_b, base_a

    def blend_pixel(x, y, r, g, b, a):
        if 0 <= x < width and 0 <= y < height:
            idx = (y * width + x) * 4
            bg_r, bg_g, bg_b = pixels[idx], pixels[idx+1], pixels[idx+2]
            pixels[idx] = r * a + bg_r * (1 - a)
            pixels[idx+1] = g * a + bg_g * (1 - a)
            pixels[idx+2] = b * a + bg_b * (1 - a)
            pixels[idx+3] = 1.0

    # 1. Noise
    for _ in range(1000):
        is_dark = random.random() > 0.5
        nr, ng, nb, na = (0,0,0,0.1) if is_dark else (1,1,1,0.1)
        cx, cy = random.randint(0, width-1), random.randint(0, height-1)
        for ox in range(2):
            for oy in range(2):
                blend_pixel(cx+ox, cy+oy, nr, ng, nb, na)

    # 2. Rust Spots
    rr, rg, rb, ra = 0.39, 0.196, 0.0, 0.2
    for _ in range(20):
        cx, cy = random.randint(0, width-1), random.randint(0, height-1)
        radius = random.randint(10, 60)
        min_x, max_x = max(0, cx-radius), min(width, cx+radius)
        min_y, max_y = max(0, cy-radius), min(height, cy+radius)
        r_sq = radius * radius
        for y in range(min_y, max_y):
            for x in range(min_x, max_x):
                if (x-cx)**2 + (y-cy)**2 <= r_sq:
                    blend_pixel(x, y, rr, rg, rb, ra)

    img = bpy.data.images.new("BodyTexture", width=width, height=height)
    img.pixels = pixels
    img.file_format = 'PNG'
    img.filepath_raw = filepath
    img.save()
    print(f"Generated {filepath}")

def generate_tracks_texture(filepath):
    width, height = 512, 512
    size = width * height
    pixels = [0.06] * (size * 4) 
    for i in range(size): pixels[i*4+3] = 1.0

    # Draw Chevrons/Treads
    bar_height = 64
    for y in range(0, height, bar_height):
        for x in range(width):
            offset = abs(x - 256) // 8
            for py in range(y + offset, y + offset + 20):
                if 0 <= py < height:
                    idx = (py * width + x) * 4
                    pixels[idx], pixels[idx+1], pixels[idx+2] = 0.2, 0.2, 0.2

    img = bpy.data.images.new("TracksTexture", width=width, height=height)
    img.pixels = pixels
    img.file_format = 'PNG'
    img.filepath_raw = filepath
    img.save()
    print(f"Generated {filepath}")

# --- Execution ---
tex_dir = os.path.join(os.getcwd(), "assets", "textures")
os.makedirs(tex_dir, exist_ok=True)
generate_body_texture(os.path.join(tex_dir, "bulldozer_texture.png"))
generate_tracks_texture(os.path.join(tex_dir, "tracks_texture.png"))
