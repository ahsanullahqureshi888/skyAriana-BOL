from PIL import Image, ImageDraw, ImageFont
import math

def generate_crisp_sky_ariana_logo():
    size = 800
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = size // 2, size // 2
    r_outer = (size // 2) - 15
    r_inner = r_outer - 18
    r_core = r_inner - 25
    
    # Colors
    NAVY = (15, 45, 95, 255)
    ROYAL_BLUE = (14, 116, 215, 255)
    LIGHT_BLUE = (224, 242, 254, 255)
    CRIMSON = (200, 29, 37, 255)
    GOLD = (217, 119, 6, 255)
    DARK_SLATE = (30, 41, 59, 255)
    WHITE = (255, 255, 255, 255)
    
    # 1. Outer Rings (Royal Blue & Gold)
    draw.ellipse((cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer), fill=WHITE, outline=ROYAL_BLUE, width=7)
    draw.ellipse((cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner), outline=NAVY, width=3)
    
    # Outer ring background band
    # draw a subtle soft light-blue ring band between inner and core
    for i in range(12):
        angle = i * (360 / 12)
        rad = math.radians(angle)
        sx = cx + (r_inner - 10) * math.cos(rad)
        sy = cy + (r_inner - 10) * math.sin(rad)
        # draw small gold star/dot
        draw.ellipse((sx - 3, sy - 3, sx + 3, sy + 3), fill=GOLD)

    # 2. Central Core Circle (White with subtle logistics map contour)
    draw.ellipse((cx - r_core, cy - r_core, cx + r_core, cy + r_core), fill=WHITE, outline=ROYAL_BLUE, width=4)
    
    # Latitude / longitude lines inside core (light blue)
    grid_col = (186, 230, 253, 200)
    for offset in [r_core * 0.4, r_core * 0.75]:
        draw.ellipse((cx - r_core + 5, cy - offset, cx + r_core - 5, cy + offset), outline=grid_col, width=2)
    draw.line((cx - r_core + 5, cy, cx + r_core - 5, cy), fill=grid_col, width=2)
    draw.line((cx, cy - r_core + 5, cx, cy + r_core - 5), fill=grid_col, width=2)
    
    # 3. Bold "SKY" 3D Dynamic Branding in Center
    # Red dynamic motion swoosh behind SKY
    swoosh_pts = [
        (cx - 220, cy + 20),
        (cx - 60, cy - 60),
        (cx + 180, cy - 90),
        (cx + 240, cy - 70),
        (cx + 120, cy - 40),
        (cx - 80, cy + 10),
        (cx - 220, cy + 20)
    ]
    draw.polygon(swoosh_pts, fill=CRIMSON)
    
    # Central Cargo Truck / Airplane / Ship Silhouette in Navy/Royal Blue
    # White Airplane at Top
    draw.polygon([(cx - 25, cy - 130), (cx + 25, cy - 130), (cx, cy - 170)], fill=ROYAL_BLUE) # nose
    draw.polygon([(cx - 70, cy - 120), (cx + 70, cy - 120), (cx, cy - 140)], fill=ROYAL_BLUE) # wings
    
    # Modern Logistics Semi-Truck on Right
    truck_x, truck_y = cx + 70, cy + 10
    draw.rectangle((truck_x, truck_y - 35, truck_x + 95, truck_y + 30), fill=ROYAL_BLUE) # Trailer
    draw.rectangle((truck_x + 95, truck_y - 15, truck_x + 130, truck_y + 30), fill=NAVY) # Cab
    draw.rectangle((truck_x + 105, truck_y - 10, truck_x + 125, truck_y + 5), fill=LIGHT_BLUE) # Window
    draw.ellipse((truck_x + 20, truck_y + 20, truck_x + 45, truck_y + 45), fill=DARK_SLATE) # Wheel 1
    draw.ellipse((truck_x + 65, truck_y + 20, truck_x + 90, truck_y + 45), fill=DARK_SLATE) # Wheel 2
    draw.ellipse((truck_x + 105, truck_y + 20, truck_x + 130, truck_y + 45), fill=DARK_SLATE) # Wheel 3
    
    # Cargo Container Ship on Left
    ship_x, ship_y = cx - 180, cy + 25
    draw.polygon([(ship_x, ship_y + 15), (ship_x + 110, ship_y + 15), (ship_x + 90, ship_y + 35), (ship_x + 15, ship_y + 35)], fill=NAVY) # Hull
    draw.rectangle((ship_x + 15, ship_y - 5, ship_x + 40, ship_y + 15), fill=CRIMSON) # Container 1
    draw.rectangle((ship_x + 45, ship_y - 15, ship_x + 75, ship_y + 15), fill=ROYAL_BLUE) # Container 2
    
    # Large 3D "SKY" Text across center
    try:
        font_large = ImageFont.truetype("arialbd.ttf", 108)
        font_med = ImageFont.truetype("arialbd.ttf", 32)
        font_small = ImageFont.truetype("arialbd.ttf", 22)
    except:
        font_large = ImageFont.load_default()
        font_med = font_large
        font_small = font_large
        
    # Draw "SKY" with drop-shadow & vibrant gradient-style navy/royal fill
    text_sky = "SKY"
    # Shadow
    draw.text((cx - 108, cy - 92), text_sky, fill=(15, 23, 42, 120), font=font_large)
    # Main
    draw.text((cx - 110, cy - 95), text_sky, fill=ROYAL_BLUE, font=font_large)
    
    # "ARIANA LIMITED" banner
    draw.rectangle((cx - 160, cy + 85, cx + 160, cy + 125), fill=NAVY, outline=GOLD, width=2)
    draw.text((cx - 130, cy + 92), "ARIANA LIMITED", fill=WHITE, font=font_med)
    
    # Arabic / Pashto Subtitle: "سکای آریانا لمتد"
    draw.text((cx - 75, cy + 135), "سکای آریانا لمتد", fill=DARK_SLATE, font=font_small)
    
    # Bottom: "★ SINCE 2011 ★"
    draw.text((cx - 72, cy + 185), "★ SINCE 2011 ★", fill=GOLD, font=font_small)
    
    # Top curved header text in inner ring: "INTERNATIONAL TRANSIT & FORWARDING"
    draw.text((cx - 145, cy - 255), "INTERNATIONAL LOGISTICS", fill=NAVY, font=font_small)

    img.save('sky_ariana_logo.png', 'PNG')
    print("Vector-crisp Sky Ariana logo saved cleanly to sky_ariana_logo.png")

if __name__ == "__main__":
    generate_crisp_sky_ariana_logo()
