<?php
$file = 'e:/New folder/sky-ariana-bbb/acci-laravel/public/images/original-stamp.png';
$img = imagecreatefrompng($file);
imagealphablending($img, false);
imagesavealpha($img, true);

$width = imagesx($img);
$height = imagesy($img);

for ($y = 0; $y < $height; $y++) {
    for ($x = 0; $x < $width; $x++) {
        $rgb = imagecolorat($img, $x, $y);
        $r = ($rgb >> 16) & 0xFF;
        $g = ($rgb >> 8) & 0xFF;
        $b = $rgb & 0xFF;
        
        // Remove checkerboard: gray and white pixels have high R and G
        if ($r > 120 && $g > 120) {
            // Set to transparent
            $color = imagecolorallocatealpha($img, 0, 0, 0, 127);
            imagesetpixel($img, $x, $y, $color);
        } else {
            // Blue stamp text: keep original color, fully opaque
            $color = imagecolorallocatealpha($img, $r, $g, $b, 0);
            imagesetpixel($img, $x, $y, $color);
        }
    }
}
imagepng($img, $file);
echo "Background removed.\n";
