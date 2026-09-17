package com.maktab.faceterminal;

/**
 * Student.faceId  <->  qurilmadagi employeeNo.
 *
 * Hikvision DS-K1T673DX (V4.41.1) employeeNo'da faqat harf va raqamni qabul qiladi — "-" va "_"
 * bo'lsa UserInfo/SetUp statusCode=6 (badJsonContent) bilan rad etadi (2026-09-15, jismoniy
 * qurilmada sinalgan). Platformadagi faceId'lar esa "ABC1-D2E3F456" shaklida — shuning uchun
 * qurilmaga faqat harf-raqamlari yuboriladi, qurilmadan kelgan voqea esa shu qoida bo'yicha
 * o'quvchiga qaytariladi (StudentRepository#findBySchoolIdAndDeviceEmployeeNo).
 */
public final class FaceIdMapping {

    /** Qurilma employeeNo maksimal uzunligi (capabilities: employeeNo max 32). */
    public static final int MAX_LENGTH = 32;

    private FaceIdMapping() { }

    /** faceId'dan qurilma employeeNo'si; yaroqsiz bo'lsa (bo'sh yoki juda uzun) null. */
    public static String toEmployeeNo(String faceId) {
        if (faceId == null) return null;
        String s = faceId.replaceAll("[^A-Za-z0-9]", "");
        return s.isEmpty() || s.length() > MAX_LENGTH ? null : s;
    }
}
