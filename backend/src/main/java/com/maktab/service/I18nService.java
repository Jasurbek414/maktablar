package com.maktab.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

/**
 * Foydalanuvchiga ko'rinadigan xato/muvaffaqiyat xabarlarini joriy so'rov
 * lokaliga (Accept-Language header, AcceptHeaderLocaleResolver orqali)
 * mos tilda qaytarish uchun ingichka wrapper — controller'lar
 * MessageSource'ning to'liq API'siga o'rniga shu bitta metodni chaqiradi.
 */
@Service
public class I18nService {

    @Autowired
    private MessageSource messageSource;

    public String msg(String key, Object... args) {
        return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
    }
}
