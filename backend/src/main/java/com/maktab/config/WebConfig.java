package com.maktab.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

/**
 * Frontend har bir so'rovda `Accept-Language: uz|ru|en` header yuboradi —
 * AcceptHeaderLocaleResolver shu header'ni avtomatik o'qib, I18nService/
 * MessageSource orqali javob xabarlarining tilini aniqlaydi. Header
 * bo'lmasa yoki qo'llab-quvvatlanmagan til bo'lsa — standart 'uz'.
 */
@Configuration
public class WebConfig {

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(new Locale("uz"));
        resolver.setSupportedLocales(List.of(new Locale("uz"), new Locale("ru"), new Locale("en")));
        return resolver;
    }

    /**
     * MUHIM: Spring Bootning avtomatik MessageSource konfiguratsiyasi (spring.messages.*)
     * FAQAT bazaviy "messages.properties" (til qo'shimchasisiz) fayl classpath'da mavjud
     * bo'lsagina ishga tushadi (ResourceBundleCondition). Bu loyihada faqat
     * messages_uz/ru/en.properties bor, bazaviy fayl YO'Q edi — natijada avtomatik
     * MessageSource bean umuman yaratilmasdi va Spring ApplicationContext o'zining ICHKI
     * standart (bo'sh) MessageSource'iga tushib qolardi, u esa HAR QANDAY kalit uchun
     * NoSuchMessageException tashlaydi. Bu xato ishlab chiqarishda /api/auth/login kabi
     * HAR BIR i18n.msg() chaqiruvini (demak deyarli barcha endpointlarni) buzgan edi.
     * Shu sabab MessageSource'ni bu yerda ANIQ (explicit) bean sifatida ro'yxatdan
     * o'tkazamiz — bu avtomatik konfiguratsiyaning shartli tekshiruviga bog'liq emas.
     */
    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames("messages");
        source.setDefaultEncoding("UTF-8");
        source.setUseCodeAsDefaultMessage(false);
        source.setFallbackToSystemLocale(false);
        return source;
    }
}
