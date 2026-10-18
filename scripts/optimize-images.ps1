Add-Type -AssemblyName System.Drawing

function Optimize-Jpeg($filePath, [long]$quality = 75) {
    $tempPath = $filePath + ".tmp.jpg"
    try {
        $img = [System.Drawing.Image]::FromFile($filePath)
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
        
        $img.Save($tempPath, $codec, $encoderParams)
        $img.Dispose()

        $oldLen = (Get-Item $filePath).Length
        $newLen = (Get-Item $tempPath).Length

        if ($newLen -lt $oldLen) {
            Move-Item -Force $tempPath $filePath
            Write-Host "Optimized $filePath`: $([math]::Round($oldLen/1KB))KB -> $([math]::Round($newLen/1KB))KB"
        } else {
            Remove-Item -Force $tempPath
            Write-Host "Kept $filePath as is"
        }
    } catch {
        Write-Warning "Failed to optimize $filePath`: $_"
        if (Test-Path $tempPath) { Remove-Item -Force $tempPath }
    }
}

function Optimize-Png($filePath, [int]$maxWidth = 1400) {
    $tempPath = $filePath + ".tmp.png"
    try {
        $img = [System.Drawing.Image]::FromFile($filePath)
        $w = $img.Width
        $h = $img.Height
        
        if ($w -gt $maxWidth) {
            $newW = $maxWidth
            $newH = [int]($h * ($maxWidth / $w))
            $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $newW, $newH)
            $g.Dispose()
            $img.Dispose()
            
            $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $bmp.Dispose()
        } else {
            $bmp = New-Object System.Drawing.Bitmap($img)
            $img.Dispose()
            $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $bmp.Dispose()
        }

        $oldLen = (Get-Item $filePath).Length
        $newLen = (Get-Item $tempPath).Length

        if ($newLen -lt $oldLen) {
            Move-Item -Force $tempPath $filePath
            Write-Host "Optimized $filePath`: $([math]::Round($oldLen/1KB))KB -> $([math]::Round($newLen/1KB))KB"
        } else {
            Remove-Item -Force $tempPath
            Write-Host "Kept $filePath as is"
        }
    } catch {
        Write-Warning "Failed to optimize $filePath`: $_"
        if (Test-Path $tempPath) { Remove-Item -Force $tempPath }
    }
}

# Optimize large JPG wallpapers
Get-ChildItem -Path public/images -Filter *.jpg -Recurse | Where-Object { $_.Length -gt 250KB } | ForEach-Object {
    Optimize-Jpeg $_.FullName 75
}

# Optimize large PNGs
Get-ChildItem -Path public/images -Filter *.png -Recurse | Where-Object { $_.Length -gt 300KB } | ForEach-Object {
    Optimize-Png $_.FullName 512
}
Get-ChildItem -Path public -Filter *.png -File | Where-Object { $_.Length -gt 300KB } | ForEach-Object {
    Optimize-Png $_.FullName 512
}
