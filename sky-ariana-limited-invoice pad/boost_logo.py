from PIL import Image, ImageEnhance
import numpy as np

# Load the white-background logo
img = Image.open('sky_ariana_logo.png').convert('RGBA')
arr = np.array(img, dtype=np.float32)

r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
lum = 0.299 * r + 0.587 * g + 0.114 * b

# Mask of logo artwork (where it's not white background)
is_art = (lum < 240) & (a > 0)

# Boost contrast and richness of the blue and red artwork
# Enhance blue channel and darken shadows for crispness
b_art = arr[is_art, 2]
arr[is_art, 2] = np.clip(b_art * 1.25, 0, 255) # richer blue
arr[is_art, 0] = np.clip(arr[is_art, 0] * 0.85, 0, 255) # deeper contrast
arr[is_art, 1] = np.clip(arr[is_art, 1] * 0.90, 0, 255)

out_img = Image.fromarray(arr.astype(np.uint8), 'RGBA')

# Increase overall contrast & sharpness
enh = ImageEnhance.Contrast(out_img)
out_img = enh.enhance(1.4)

enh_sharp = ImageEnhance.Sharpness(out_img)
out_img = enh_sharp.enhance(1.5)

out_img.save('sky_ariana_logo.png', 'PNG')
print("High-contrast crisp logo saved to sky_ariana_logo.png")
