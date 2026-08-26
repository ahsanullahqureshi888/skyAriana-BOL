from PIL import Image, ImageDraw
import numpy as np

# 1. Clean Globe Crop & Circle Mask
src = Image.open(r'C:\Users\HomePC\.gemini\antigravity\brain\a7978521-103b-4866-97f5-09b43c311452\.user_uploaded\media_1787716647773.png').convert('RGBA')

# In the screenshot, the globe sphere is located precisely around x: 708 to 768, y: 78 to 142
globe_raw = src.crop((706, 75, 768, 142))

# Apply smooth circular alpha mask to globe
gw, gh = globe_raw.size
g_mask = Image.new('L', (gw, gh), 0)
g_draw = ImageDraw.Draw(g_mask)
g_draw.ellipse((2, 2, gw - 3, gh - 3), fill=255)

globe_clean = Image.new('RGBA', (gw, gh), (255, 255, 255, 0))
globe_clean.paste(globe_raw, (0, 0), mask=g_mask)
globe_clean.save('globe_flags.png', 'PNG')
print('Perfect circular globe saved to globe_flags.png')

# 2. Perfect Left Logo: Take high-res original and remove all black space background cleanly
logo_orig = Image.open('sky_ariana_logo.jpg').convert('RGBA')
l_arr = np.array(logo_orig, dtype=np.float32)

lh, lw = l_arr.shape[:2]
lcy, lcx = lh / 2.0, lw / 2.0
ly, lx = np.ogrid[:lh, :lw]
ldist = np.sqrt((lx - lcx)**2 + (ly - lcy)**2)
l_radius = min(lh, lw) / 2.0 - 4.0

lr, lg, lb = l_arr[:, :, 0], l_arr[:, :, 1], l_arr[:, :, 2]
lum = 0.299 * lr + 0.587 * lg + 0.114 * lb

# The black background is where luminance < 60 and colors are dark
is_black_bg = (lum < 55) & (ldist <= l_radius)

# We can replace the black background with pure white (255, 255, 255)
# so the logo artwork shines on a clean white circle without looking dark or black
l_arr_white = l_arr.copy()
l_arr_white[ldist > l_radius, 3] = 0 # outside transparent
for i in range(3):
    l_arr_white[is_black_bg, i] = 255.0 # convert black background to white

# Save clean white-isolated logo
Image.fromarray(l_arr_white.astype(np.uint8), 'RGBA').save('sky_ariana_logo.png', 'PNG')
print('Clean white-background Sky Ariana logo saved to sky_ariana_logo.png')
