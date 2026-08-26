from PIL import Image, ImageDraw
import math

def create_globe_flags():
    size = 400
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy, r = size // 2, size // 2, (size // 2) - 10
    
    # Outer circle
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(245, 248, 252, 255), outline=(15, 23, 42, 255), width=4)
    
    # Colorful mosaic bands representing flags of trading countries (Afghanistan, UAE, India, Turkey, Germany, etc.)
    colors = [
        (220, 38, 38),   # Red
        (2, 132, 199),   # Blue
        (16, 185, 129),  # Green
        (234, 179, 8),   # Gold / Yellow
        (15, 23, 42),    # Black / Navy
        (255, 255, 255), # White
        (249, 115, 22),  # Orange
        (147, 51, 234)   # Purple
    ]
    
    # Draw curved flag patterns inside globe
    for i in range(12):
        angle1 = i * 30
        angle2 = angle1 + 30
        c1 = colors[i % len(colors)]
        c2 = colors[(i + 3) % len(colors)]
        
        # Sector / segment
        draw.pieslice((cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6), angle1, angle2, fill=c1, outline=(255, 255, 255, 200), width=2)
    
    # Draw globe latitude & longitude grid lines
    grid_color = (15, 23, 42, 180)
    for ry in [r * 0.35, r * 0.7]:
        draw.ellipse((cx - r + 6, cy - ry, cx + r - 6, cy + ry), outline=grid_color, width=2)
    
    for rx in [r * 0.35, r * 0.7]:
        draw.ellipse((cx - rx, cy - r + 6, cx + rx, cy + r - 6), outline=grid_color, width=2)
        
    draw.line((cx - r + 6, cy, cx + r - 6, cy), fill=grid_color, width=3)
    draw.line((cx, cy - r + 6, cx, cy + r - 6), fill=grid_color, width=3)
    
    # Outer ring shadow / highlight
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(15, 23, 42, 255), width=4)
    
    img.save('globe_flags.png', 'PNG')
    print("Created globe_flags.png")

if __name__ == "__main__":
    create_globe_flags()
