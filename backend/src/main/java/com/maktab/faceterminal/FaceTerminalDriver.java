package com.maktab.faceterminal;

import com.maktab.model.FaceTerminal;

/**
 * Face ID terminal brendiga xos "yuz ma'lumotini qurilmaga yuklash" drayveri. Har bir yangi
 * brend (ZKTeco, Dahua, ...) qo'llab-quvvatlanishi kerak bo'lganda, shu interfeysni amalga
 * oshiruvchi yangi Spring @Component qo'shiladi — FaceTerminalDriverRegistry uni avtomatik
 * topib, FaceTerminal.brend'iga qarab tanlaydi. Boshqa hech qanday joyga tegilmaydi.
 */
public interface FaceTerminalDriver {

    /** Shu drayver qaysi FaceTerminal.brand qiymati(lari)ni qo'llab-quvvatlaydi (katta-kichik harfga sezgir emas). */
    boolean supports(String brand);

    /**
     * Bitta o'quvchining yuz rasmini shu terminalga yuklaydi (avval mavjud bo'lsa — yangilaydi).
     * Muvaffaqiyatsiz bo'lsa exception tashlanadi — chaqiruvchi xabarini foydalanuvchiga ko'rsatadi.
     *
     * @param terminal        maqsad qurilma (ipAddress/port/deviceUsername/devicePassword shu yerdan)
     * @param employeeNo      qurilmadagi identifikator — Student.faceId bilan bir xil qilib beriladi
     * @param fullName        ko'rsatiladigan ism
     * @param imageBytes      JPEG rasm baytlari
     * @param imageContentType odatda "image/jpeg"
     */
    void pushFace(FaceTerminal terminal, String employeeNo, String fullName,
                  byte[] imageBytes, String imageContentType) throws Exception;
}
