import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Push-bildirishnomalar — Firebase Cloud Messaging orqali. MUHIM: bu ishlashi uchun
/// haqiqiy Firebase loyihasi kerak (google-services.json). Bu hali qo'shilmagan —
/// shuning uchun initialize() xato chiqmasdan "sokin" muvaffaqiyatsiz bo'ladi va
/// ilova push'siz normal ishlashda davom etadi. Qo'shish uchun: mobile/README.md.
///
/// Hozircha faqat fon/tugatilgan holatdagi bildirishnomalar (FCM'ning o'zi ko'rsatadi).
/// Ilova OCHIQ turganda kelgan xabar uchun banner ko'rsatish (flutter_local_notifications)
/// ATAYLAB qo'shilmadi — u Android build'da qo'shimcha Gradle sozlash (core library
/// desugaring) talab qiladi; push haqiqiy funksiyaga aylanadigan bosqichda qo'shiladi.
class PushNotifications {
  static bool _ready = false;

  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      _ready = true;
    } catch (e) {
      debugPrint('PushNotifications: Firebase sozlanmagan, push o\'chirilgan ($e)');
      _ready = false;
    }
  }

  static Future<String?> fcmToken() async {
    if (!_ready) return null;
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }
}
