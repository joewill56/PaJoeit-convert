import { LanguageCode } from '../languages';

export interface BatchStrings {
  upTo50Images: string;
  limit50Warning: string;
  limitExceededNotice: (currentCount: number, allowedCount: number) => string;
  batchProcessedSummary: (success: number, total: number) => string;
  batchFailedSummary: (failed: number) => string;
  retryFailed: string;
  clearCompleted: string;
  zipTooLargeWarning: string;
  errDecode: string;
  errMemory: string;
  errUnsupported: string;
  errDimension: string;
  errCompression: string;
  readyStatus: string;
  queuedStatus: string;
  errorStatus: string;
  noImageOnHand: string;
}

export const BATCH_TRANSLATIONS: Record<LanguageCode, BatchStrings> = {
  en: {
    upTo50Images: 'Up to 50 images per batch',
    limit50Warning: 'You can process up to 50 images at a time. Please remove some images and try again.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `Maximum 50 images per batch. ${current} images are already selected, so only ${allowed} more can be added.`
        : 'Maximum 50 images per batch reached. 50 images are already selected in the workspace.',
    batchProcessedSummary: (success, total) => `${success} of ${total} images processed successfully.`,
    batchFailedSummary: (failed) => `${failed} ${failed === 1 ? 'image' : 'images'} could not be processed.`,
    retryFailed: 'Retry Failed Images',
    clearCompleted: 'Clear Completed',
    zipTooLargeWarning:
      'Your files were processed successfully, but this ZIP is too large for this device to create reliably. Please download the files individually or create smaller batches.',
    errDecode: 'Image could not be decoded. The file may be corrupted or in an unsupported format.',
    errMemory: 'This image is too large for this device to process safely. Try a smaller image or resize it first.',
    errUnsupported: 'This image format is not supported.',
    errDimension: 'This image exceeds the maximum supported dimensions for safe processing.',
    errCompression: 'Compression failed while exporting the image. Please try again.',
    readyStatus: 'Ready',
    queuedStatus: 'Queued',
    errorStatus: 'Error',
    noImageOnHand: 'No image on hand?',
  },

  es: {
    upTo50Images: 'Hasta 50 imágenes por lote',
    limit50Warning: 'Puedes procesar hasta 50 imágenes a la vez. Elimina algunas imágenes e inténtalo de nuevo.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `Máximo 50 imágenes por lote. Ya hay ${current} seleccionadas, por lo que solo se pueden añadir ${allowed} más.`
        : 'Máximo 50 imágenes por lote alcanzado. Ya hay 50 imágenes seleccionadas en el espacio de trabajo.',
    batchProcessedSummary: (success, total) => `${success} de ${total} imágenes procesadas con éxito.`,
    batchFailedSummary: (failed) => `${failed} ${failed === 1 ? 'imagen no se pudo procesar' : 'imágenes no se pudieron procesar'}.`,
    retryFailed: 'Reintentar fallidas',
    clearCompleted: 'Limpiar completadas',
    zipTooLargeWarning:
      'Los archivos se procesaron con éxito, pero este archivo ZIP es demasiado grande para crearse de forma fiable en este dispositivo. Descárgalos individualmente o en lotes más pequeños.',
    errDecode: 'No se pudo decodificar la imagen. El archivo puede estar dañado o en un formato no compatible.',
    errMemory: 'Esta imagen es demasiado grande para que este dispositivo la procese de forma segura.',
    errUnsupported: 'Este formato de imagen no es compatible.',
    errDimension: 'Esta imagen supera las dimensiones máximas admitidas.',
    errCompression: 'Error de compresión al exportar la imagen. Inténtalo de nuevo.',
    readyStatus: 'Listo',
    queuedStatus: 'En cola',
    errorStatus: 'Error',
    noImageOnHand: '¿No tienes una imagen a mano?',
  },

  fr: {
    upTo50Images: 'Jusqu\'à 50 images par lot',
    limit50Warning: 'Vous pouvez traiter jusqu\'à 50 images à la fois. Veuillez supprimer quelques images et réessayer.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `Maximum 50 images par lot. ${current} images sont déjà sélectionnées, seules ${allowed} de plus peuvent être ajoutées.`
        : 'Maximum de 50 images par lot atteint. 50 images sont déjà sélectionnées.',
    batchProcessedSummary: (success, total) => `${success} sur ${total} images traitées avec succès.`,
    batchFailedSummary: (failed) => `${failed} ${failed === 1 ? 'image n\'a pas pu être traitée' : 'images n\'ont pas pu être traitées'}.`,
    retryFailed: 'Réessayer les échecs',
    clearCompleted: 'Effacer les terminées',
    zipTooLargeWarning:
      'Vos fichiers ont été traités avec succès, mais ce fichier ZIP est trop volumineux pour cet appareil. Veuillez télécharger les fichiers individuellement ou créer des lots plus petits.',
    errDecode: 'L\'image n\'a pas pu être décodée. Le fichier est peut-être corrompu ou dans un format non pris en charge.',
    errMemory: 'Cette image est trop volumineuse pour être traitée en toute sécurité sur cet appareil.',
    errUnsupported: 'Ce format d\'image n\'est pas pris en charge.',
    errDimension: 'Cette image dépasse les dimensions maximales prises en charge.',
    errCompression: 'La compression a échoué lors de l\'exportation de l\'image. Veuillez réessayer.',
    readyStatus: 'Prêt',
    queuedStatus: 'En attente',
    errorStatus: 'Erreur',
    noImageOnHand: 'Pas d\'image sous la main ?',
  },

  de: {
    upTo50Images: 'Bis zu 50 Bilder pro Stapel',
    limit50Warning: 'Sie können bis zu 50 Bilder gleichzeitig verarbeiten. Bitte entfernen Sie einige Bilder und versuchen Sie es erneut.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `Maximal 50 Bilder pro Stapel. ${current} Bilder sind bereits ausgewählt, es können nur noch ${allowed} hinzugefügt werden.`
        : 'Maximal 50 Bilder pro Stapel erreicht. Es befinden sich bereits 50 Bilder im Arbeitsbereich.',
    batchProcessedSummary: (success, total) => `${success} von ${total} Bildern erfolgreich verarbeitet.`,
    batchFailedSummary: (failed) => `${failed} ${failed === 1 ? 'Bild konnte nicht verarbeitet werden' : 'Bilder konnten nicht verarbeitet werden'}.`,
    retryFailed: 'Fehlgeschlagene wiederholen',
    clearCompleted: 'Abgeschlossene leeren',
    zipTooLargeWarning:
      'Ihre Dateien wurden erfolgreich verarbeitet, aber diese ZIP-Datei ist zu groß für dieses Gerät. Bitte laden Sie die Dateien einzeln herunter oder erstellen Sie kleinere Stapel.',
    errDecode: 'Das Bild konnte nicht dekodiert werden. Die Datei ist möglicherweise beschädigt oder hat ein nicht unterstütztes Format.',
    errMemory: 'Dieses Bild ist zu groß, um auf diesem Gerät sicher verarbeitet zu werden.',
    errUnsupported: 'Dieses Bildformat wird nicht unterstützt.',
    errDimension: 'Dieses Bild überschreitet die maximal unterstützten Abmessungen.',
    errCompression: 'Komprimierung beim Exportieren des Bildes fehlgeschlagen. Bitte versuchen Sie es erneut.',
    readyStatus: 'Fertig',
    queuedStatus: 'Warteschlange',
    errorStatus: 'Fehler',
    noImageOnHand: 'Kein Bild zur Hand?',
  },

  pt: {
    upTo50Images: 'Até 50 imagens por lote',
    limit50Warning: 'Você pode processar até 50 imagens por vez. Remova algumas imagens e tente novamente.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `Máximo de 50 imagens por lote. ${current} imagens já foram selecionadas, apenas mais ${allowed} podem ser adicionadas.`
        : 'Limite de 50 imagens por lote atingido. Já existem 50 imagens selecionadas.',
    batchProcessedSummary: (success, total) => `${success} de ${total} imagens processadas com sucesso.`,
    batchFailedSummary: (failed) => `${failed} ${failed === 1 ? 'imagem não pôde ser processada' : 'imagens não puderam ser processadas'}.`,
    retryFailed: 'Tentar novamente com falhas',
    clearCompleted: 'Limpar concluídas',
    zipTooLargeWarning:
      'Seus arquivos foram processados com sucesso, mas este ZIP é grande demais para este dispositivo. Baixe os arquivos individualmente ou processe em lotes menores.',
    errDecode: 'A imagem não pôde ser decodificada. O arquivo pode estar corrompido ou em um formato não suportado.',
    errMemory: 'Esta imagem é muito grande para este dispositivo processar com segurança.',
    errUnsupported: 'Este formato de imagem não é suportado.',
    errDimension: 'Esta imagem excede as dimensões máximas suportadas.',
    errCompression: 'A compressão falhou ao exportar a imagem. Tente novamente.',
    readyStatus: 'Pronto',
    queuedStatus: 'Na fila',
    errorStatus: 'Erro',
    noImageOnHand: 'Nenhuma imagem em mãos?',
  },

  ar: {
    upTo50Images: 'حتى 50 صورة في الدفعة الواحدة',
    limit50Warning: 'يمكنك معالجة ما يصل إلى 50 صورة في المرة الواحدة. يرجى إزالة بعض الصور والمحاولة مجدداً.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `الحد الأقصى 50 صورة لكل دفعة. تم تحديد ${current} صورة بالفعل، لذلك يمكن إضافة ${allowed} فقط.`
        : 'تم الوصول إلى الحد الأقصى (50 صورة). يوجد بالفعل 50 صورة في مساحة العمل.',
    batchProcessedSummary: (success, total) => `تمت معالجة ${success} من أصل ${total} صورة بنجاح.`,
    batchFailedSummary: (failed) => `تعذرت معالجة ${failed} من الصور.`,
    retryFailed: 'إعادة محاولة الصور غير المكتملة',
    clearCompleted: 'مسح المكتملة',
    zipTooLargeWarning:
      'تمت معالجة ملفاتك بنجاح، لكن ملف ZIP كبير جداً بالنسبة لهذا الجهاز. يرجى تنزيل الملفات بشكل فردي أو إنشاء دفعات أصغر.',
    errDecode: 'تعذر فك تشفير الصورة. قد يكون الملف تالفاً أو بتنسيق غير مدعوم.',
    errMemory: 'هذه الصورة كبيرة جداً بحيث لا يمكن لهذا الجهاز معالجتها بأمان.',
    errUnsupported: 'تنسيق الصورة هذا غير مدعوم.',
    errDimension: 'تتجاوز هذه الصورة الحد الأقصى للأبعاد المدعومة.',
    errCompression: 'فشل الضغط أثناء تصدير الصورة. يرجى المحاولة مرة أخرى.',
    readyStatus: 'جاهز',
    queuedStatus: 'في الانتظار',
    errorStatus: 'خطأ',
    noImageOnHand: 'ليست لديك صورة الآن؟',
  },

  hi: {
    upTo50Images: 'प्रति बैच 50 छवियों तक',
    limit50Warning: 'आप एक बार में 50 छवियों तक प्रोसेस कर सकते हैं। कृपया कुछ छवियां हटाएं और पुनः प्रयास करें।',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `प्रति बैच अधिकतम 50 छवियां। ${current} छवियां पहले से चयनित हैं, केवल ${allowed} और जोड़ी जा सकती हैं।`
        : 'प्रति बैच अधिकतम 50 छवियों की सीमा पूर्ण हो गई है। 50 छवियां पहले से चयनित हैं।',
    batchProcessedSummary: (success, total) => `${total} में से ${success} छवियां सफलतापूर्वक प्रोसेस की गईं।`,
    batchFailedSummary: (failed) => `${failed} छवियों को प्रोसेस नहीं किया जा सका।`,
    retryFailed: 'असफल छवियों को पुनः प्रयास करें',
    clearCompleted: 'पूर्ण हटाएं',
    zipTooLargeWarning:
      'आपकी फाइलें सफलतापूर्वक प्रोसेस हो गईं, लेकिन यह ज़िप इस डिवाइस के लिए बहुत बड़ी है। कृपया फ़ाइलों को व्यक्तिगत रूप से डाउनलोड करें।',
    errDecode: 'छवि को डिकोड नहीं किया जा सका। फ़ाइल दूषित या असमर्थित प्रारूप में हो सकती है।',
    errMemory: 'यह छवि इस डिवाइस पर सुरक्षित रूप से प्रोसेस करने के लिए बहुत बड़ी है।',
    errUnsupported: 'यह छवि प्रारूप समर्थित नहीं है।',
    errDimension: 'यह छवि अधिकतम समर्थित आयामों से अधिक है।',
    errCompression: 'छवि निर्यात करते समय संपीड़न विफल रहा। कृपया पुनः प्रयास करें।',
    readyStatus: 'तैयार',
    queuedStatus: 'कतार में',
    errorStatus: 'त्रुटि',
    noImageOnHand: 'कोई छवि पास में नहीं है?',
  },

  id: {
    upTo50Images: 'Hingga 50 gambar per batch',
    limit50Warning: 'Anda dapat memproses hingga 50 gambar sekaligus. Harap hapus beberapa gambar dan coba lagi.',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `Maksimal 50 gambar per batch. ${current} gambar sudah dipilih, hanya ${allowed} gambar lagi yang dapat ditambahkan.`
        : 'Maksimal 50 gambar per batch tercapai. Sudah ada 50 gambar di ruang kerja.',
    batchProcessedSummary: (success, total) => `${success} dari ${total} gambar berhasil diproses.`,
    batchFailedSummary: (failed) => `${failed} gambar tidak dapat diproses.`,
    retryFailed: 'Coba Lagi yang Gagal',
    clearCompleted: 'Hapus yang Selesai',
    zipTooLargeWarning:
      'File Anda berhasil diproses, namun file ZIP ini terlalu besar untuk perangkat ini. Silakan unduh file satu per satu atau buat batch yang lebih kecil.',
    errDecode: 'Gambar tidak dapat didekode. File mungkin rusak atau dalam format yang tidak didukung.',
    errMemory: 'Gambar ini terlalu besar untuk diproses dengan aman oleh perangkat ini.',
    errUnsupported: 'Format gambar ini tidak didukung.',
    errDimension: 'Gambar ini melebihi dimensi maksimum yang didukung.',
    errCompression: 'Kompresi gagal saat mengekspor gambar. Silakan coba lagi.',
    readyStatus: 'Siap',
    queuedStatus: 'Antrean',
    errorStatus: 'Kesalahan',
    noImageOnHand: 'Tidak punya gambar saat ini?',
  },

  zh: {
    upTo50Images: '每批最多 50 张图片',
    limit50Warning: '一次最多可处理 50 张图片。请移除部分图片后重试。',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `每批最多 50 张图片。已选择 ${current} 张，因此只能再添加 ${allowed} 张。`
        : '已达到每批 50 张图片的上限。工作区中已有 50 张图片。',
    batchProcessedSummary: (success, total) => `成功处理 ${total} 张中的 ${success} 张图片。`,
    batchFailedSummary: (failed) => `${failed} 张图片无法处理。`,
    retryFailed: '重试失败图片',
    clearCompleted: '清除已完成',
    zipTooLargeWarning:
      '您的文件已成功处理，但生成的 ZIP 文件对此设备过大。请单独下载文件或分批处理。',
    errDecode: '无法解码图像。文件可能已损坏或格式不受支持。',
    errMemory: '此图像过大，当前设备无法安全处理。请尝试较小的图像或先调整尺寸。',
    errUnsupported: '不支持此图像格式。',
    errDimension: '此图像超出支持的最大安全尺寸。',
    errCompression: '导出图像时压缩失败，请重试。',
    readyStatus: '就绪',
    queuedStatus: '排队中',
    errorStatus: '错误',
    noImageOnHand: '手头没有图片？',
  },

  ja: {
    upTo50Images: '1バッチあたり最大50枚',
    limit50Warning: '一度に処理できる画像は最大50枚です。いくつかの画像を削除してから再試行してください。',
    limitExceededNotice: (current, allowed) =>
      allowed > 0
        ? `1バッチあたり最大50枚です。現在${current}枚選択されているため、追加できるのはあと${allowed}枚です。`
        : '1バッチあたり最大50枚に達しました。すでに50枚選択されています。',
    batchProcessedSummary: (success, total) => `${total}枚中${success}枚の画像を正常に処理しました。` ,
    batchFailedSummary: (failed) => `${failed}枚の画像を処理できませんでした。`,
    retryFailed: '失敗した画像を再試行',
    clearCompleted: '完了をクリア',
    zipTooLargeWarning:
      'ファイルは正常に処理されましたが、このZIPファイルはお使いのデバイスで作成するには大きすぎます。ファイルを個別にダウンロードするか、より小さなバッチで作成してください。',
    errDecode: '画像をデコードできませんでした。ファイルが破損しているか、サポートされていない形式の可能性があります。',
    errMemory: 'この画像はこのデバイスで安全に処理するには大きすぎます。',
    errUnsupported: 'この画像形式はサポートされていません。',
    errDimension: 'この画像はサポートされている最大サイズを超えています。',
    errCompression: '画像のエクスポート中に圧縮に失敗しました。もう一度お試しください。',
    readyStatus: '完了',
    queuedStatus: '待機中',
    errorStatus: 'エラー',
    noImageOnHand: '手元に画像がありませんか？',
  },
};
