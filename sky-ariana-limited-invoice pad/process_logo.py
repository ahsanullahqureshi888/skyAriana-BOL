from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

def clean_logo():
    # Load image
    img = Image.open('sky_ariana_logo.jpg').convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    h, w = arr.shape[:2]
    cy, cx = h / 2.0, w / 2.0
    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - cx)**2 + (y - cy)**2)
    
    # Outer circle perimeter
    outer_radius = min(h, w) / 2.0 - 6.0
    
    # Luminance / brightness
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    
    # Blue intensity vs dark
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = np.where(max_c > 0, (max_c - min_c) / max_c, 0)
    
    # Pixels that are part of the black space background
    is_black = (lum < 45) & (b < 65) & (r < 50) & (g < 50)
    
    # Build smooth alpha
    alpha = np.full((h, w), 255.0, dtype=np.float32)
    
    # Outside radius is transparent
    alpha[dist > outer_radius] = 0.0
    
    # Anti-alias boundary
    edge = (dist > (outer_radius - 3.0)) & (dist <= outer_radius)
    alpha[edge] = 255.0 * (outer_radius - dist[edge]) / 3.0
    
    # Black background transparency
    alpha[is_black] = 0.0
    
    arr[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    
    cleaned = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    cleaned.save('sky_ariana_logo.png', 'PNG')
    cleaned.save('sky_ariana_logo_transparent.png', 'PNG')
    print("Clean transparent logo saved successfully: sky_ariana_logo.png")

if __name__ == "__main__":
    clean_logo()
