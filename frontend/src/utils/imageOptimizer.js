import JSZip from 'jszip';

/**
 * Rasmni (File yoki Blob) brauzer canvasida avtomatik o'lchamini kichraytirib,
 * JPEG formatda siqadi (sifatni yo'qotmagan holda megabaytlarni kilobaytga tushiradi).
 * 
 * Masalan: 12 MP (4000x3000) 8 MB rasm -> 1000px, ~120 KB JPEG bo'ladi.
 * Face ID terminal va veb-sayt uchun ideal o'lcham va tiniqlikda saqlanadi.
 */
export async function compressImageBlob(blob, maxSide = 1000, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Agar rasm allaqachon kichik bo'lsa va hajmi 200KB dan kam bo'lsa, tegilmaydi
      if (width <= maxSide && height <= maxSide && blob.size <= 200 * 1024) {
        resolve(blob);
        return;
      }

      // Proporsiyani saqlagan holda maksimal tomonni maxSide ga moslash
      if (width > height) {
        if (width > maxSide) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        }
      } else {
        if (height > maxSide) {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      // Oq fon qo'yish (PNG shaffofligi qora bo'lib qolmasligi uchun)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (compressedBlob) => {
          if (!compressedBlob) {
            resolve(blob);
            return;
          }
          // Agar siqilgan rasm kattaroq chiqsa, asl nusxasi olinadi
          if (compressedBlob.size < blob.size) {
            resolve(compressedBlob);
          } else {
            resolve(blob);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Agar rasm o'qilmasa, asl fayl qaytariladi
      resolve(blob);
    };

    img.src = url;
  });
}

/**
 * Bitta rasm File obyektini siqib, yangi File qaytaradi.
 */
export async function compressImageFile(file, maxSide = 1000, quality = 0.85) {
  if (!file || !file.type.startsWith('image/')) return file;
  try {
    const compressedBlob = await compressImageBlob(file, maxSide, quality);
    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([compressedBlob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    console.warn('Rasmni siqishda xatolik:', err);
    return file;
  }
}

/**
 * Excel (.xlsx) faylini tekshirib, ichidagi barcha katta rasmlarni (xl/media/*)
 * avtomatik siqadi va repak qiladi.
 * 
 * Masalan: 30 ta telefon rasmi solingan 60 MB lik Excel fayli 2-3 MB ga aylanadi!
 */
export async function optimizeExcelFile(file, onProgress) {
  if (!file || !file.name.toLowerCase().endsWith('.xlsx')) {
    return { file, optimized: false };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // xl/media/ papkasidagi rasmlarni topish
    const mediaFiles = [];
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && relativePath.startsWith('xl/media/')) {
        const lower = relativePath.toLowerCase();
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
          mediaFiles.push({ path: relativePath, entry: zipEntry });
        }
      }
    });

    if (mediaFiles.length === 0) {
      return { file, optimized: false, message: "Faylda rasmlar topilmadi" };
    }

    let imagesOptimized = 0;
    const total = mediaFiles.length;

    for (let i = 0; i < total; i++) {
      const { path, entry } = mediaFiles[i];
      if (onProgress) {
        onProgress({ current: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
      }

      const imgData = await entry.async('blob');
      // Faqat 150 KB dan katta rasmlarni siqish
      if (imgData.size > 150 * 1024) {
        const compressedBlob = await compressImageBlob(imgData, 1000, 0.82);
        if (compressedBlob.size < imgData.size) {
          const compressedBuffer = await compressedBlob.arrayBuffer();
          zip.file(path, compressedBuffer);
          imagesOptimized++;
        }
      }
    }

    if (imagesOptimized === 0) {
      return { file, optimized: false, message: "Rasmlar allaqachon ixcham o'lchamda" };
    }

    // Yangi ixchamlangan Excel faylni yaratish
    const newZipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const optimizedFile = new File([newZipBlob], file.name, {
      type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      lastModified: Date.now()
    });

    return {
      file: optimizedFile,
      optimized: true,
      originalSize: file.size,
      newSize: optimizedFile.size,
      imagesOptimized,
      totalImages: total
    };
  } catch (err) {
    console.warn('Excel faylini optimizatsiya qilishda xatolik:', err);
    // Xato bo'lsa, asl fayl bilan davom etiladi
    return { file, optimized: false, error: err.message };
  }
}
