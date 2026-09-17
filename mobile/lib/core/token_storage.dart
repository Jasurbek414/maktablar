import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// JWT tokenlarni xavfsiz saqlaydi. Ikkita alohida rol bor: DIRECTOR (staff, /api/auth/*
/// kontrakti) va GUARDIAN (ota-ona, /api/guardian-app/* kontrakti) — bir vaqtning o'zida
/// faqat bittasi faol bo'ladi (ilova ochilishda foydalanuvchi qaysi rolda kirganini tanlaydi).
class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';
  static const _roleKey = 'auth_role'; // "DIRECTOR" | "GUARDIAN" | staff role nomi
  static const _profileKey = 'auth_profile_json';

  Future<void> save({required String token, required String role, required String profileJson}) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _roleKey, value: role);
    await _storage.write(key: _profileKey, value: profileJson);
  }

  Future<String?> readToken() => _storage.read(key: _tokenKey);
  Future<String?> readRole() => _storage.read(key: _roleKey);
  Future<String?> readProfileJson() => _storage.read(key: _profileKey);

  /// Token/rolga tegmasdan faqat profil ma'lumotini yangilaydi (masalan ism o'zgarganda).
  Future<void> updateProfileJson(String profileJson) => _storage.write(key: _profileKey, value: profileJson);

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _roleKey);
    await _storage.delete(key: _profileKey);
  }
}
