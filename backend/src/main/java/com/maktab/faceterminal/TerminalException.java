package com.maktab.faceterminal;

/**
 * Terminal bilan ishlashdagi kutilgan xato (qurilma javob bermadi, noto'g'ri sozlama, qurilma
 * so'rovni rad etdi). Xabar foydalanuvchiga ko'rsatishga yaroqli bo'lishi kerak — ichki stack
 * trace yoki parol kabi maxfiy ma'lumot xabarga qo'shilmaydi.
 */
public class TerminalException extends RuntimeException {
    public TerminalException(String message) {
        super(message);
    }

    public TerminalException(String message, Throwable cause) {
        super(message, cause);
    }
}
