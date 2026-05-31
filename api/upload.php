<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Image Upload Helper
 * ============================================================
 * Secure image upload with validation and WebP conversion.
 * ============================================================
 */

require_once __DIR__ . '/config.php';

/**
 * Process and store an uploaded image
 * Returns [file_path, thumbnail_path, width, height, file_size] or sends error
 */
function processImageUpload(string $fieldName, string $subdir): array {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] === UPLOAD_ERR_NO_FILE) {
        return [];
    }

    $file = $_FILES[$fieldName];

    // Check upload error
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temp directory',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        ];
        sendError($errors[$file['error']] ?? 'Upload error', 400);
    }

    // Check file size
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        sendError('File size exceeds ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB limit', 400);
    }

    // Validate MIME type using finfo (not the untrusted $_FILES['type'])
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    if (!in_array($mimeType, ALLOWED_MIME_TYPES, true)) {
        sendError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF', 400);
    }

    // Double-check with getimagesize (prevents disguised files)
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        sendError('File is not a valid image', 400);
    }

    $width = $imageInfo[0];
    $height = $imageInfo[1];

    // Generate unique filename
    $timestamp = time();
    $random = bin2hex(random_bytes(8));
    $filename = "{$timestamp}_{$random}.webp";
    $thumbFilename = "{$timestamp}_{$random}_thumb.webp";

    // Ensure directories exist
    $uploadDir = ensureUploadDir($subdir);

    $filePath = $uploadDir . $filename;
    $thumbPath = $uploadDir . $thumbFilename;

    // Load image based on type
    $srcImage = null;
    switch ($mimeType) {
        case 'image/jpeg':
            $srcImage = @imagecreatefromjpeg($file['tmp_name']);
            break;
        case 'image/png':
            $srcImage = @imagecreatefrompng($file['tmp_name']);
            break;
        case 'image/webp':
            $srcImage = @imagecreatefromwebp($file['tmp_name']);
            break;
        case 'image/gif':
            $srcImage = @imagecreatefromgif($file['tmp_name']);
            break;
    }

    if (!$srcImage) {
        sendError('Failed to process image', 500);
    }

    // Preserve transparency for PNG
    imagealphablending($srcImage, true);
    imagesavealpha($srcImage, true);

    // Auto-rotate based on EXIF data (JPEG only)
    if ($mimeType === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($file['tmp_name']);
        if ($exif && isset($exif['Orientation'])) {
            switch ($exif['Orientation']) {
                case 3:
                    $srcImage = imagerotate($srcImage, 180, 0);
                    break;
                case 6:
                    $srcImage = imagerotate($srcImage, -90, 0);
                    [$width, $height] = [$height, $width];
                    break;
                case 8:
                    $srcImage = imagerotate($srcImage, 90, 0);
                    [$width, $height] = [$height, $width];
                    break;
            }
        }
    }

    // Save as WebP (main image)
    if (!imagewebp($srcImage, $filePath, WEBP_QUALITY)) {
        imagedestroy($srcImage);
        sendError('Failed to save image', 500);
    }

    // Create thumbnail
    $thumbWidth = THUMBNAIL_MAX_WIDTH;
    $thumbHeight = THUMBNAIL_MAX_HEIGHT;
    $ratio = min($thumbWidth / $width, $thumbHeight / $height);

    if ($ratio < 1) {
        $newWidth = (int)round($width * $ratio);
        $newHeight = (int)round($height * $ratio);
    } else {
        $newWidth = $width;
        $newHeight = $height;
    }

    $thumbImage = imagecreatetruecolor($newWidth, $newHeight);
    imagealphablending($thumbImage, false);
    imagesavealpha($thumbImage, true);
    imagecopyresampled($thumbImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    imagewebp($thumbImage, $thumbPath, WEBP_QUALITY);
    imagedestroy($thumbImage);

    // Get final file size
    $fileSize = filesize($filePath);

    // Clean up
    imagedestroy($srcImage);

    // Return relative paths (for storage in DB)
    $relPath = UPLOAD_URL_PREFIX . $subdir . $filename;
    $relThumbPath = UPLOAD_URL_PREFIX . $subdir . $thumbFilename;

    return [
        'file_path'      => $relPath,
        'thumbnail_path' => $relThumbPath,
        'width'          => $width,
        'height'         => $height,
        'file_size'      => $fileSize,
        'original_name'  => $file['name'],
    ];
}


/**
 * Delete an image file and its thumbnail from disk
 */
function deleteImageFiles(string $filePath, ?string $thumbnailPath = null): void {
    // Convert URL paths back to filesystem paths
    $basePath = dirname(__DIR__);

    if ($filePath) {
        $fullPath = $basePath . $filePath;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }

    if ($thumbnailPath) {
        $fullPath = $basePath . $thumbnailPath;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }
}
