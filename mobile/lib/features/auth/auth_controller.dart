import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../core/token_storage.dart';
import '../../core/mock_data.dart';

/// Demo/test rejimi — haqiqiy backend ulanmasdan, soxta (MockData) ma'lumot bilan ishlaydi.
///
/// STANDART QIYMAT `false` — ilova doim haqiqiy serverga ulanadi. Namoyish uchun
/// `--dart-define=DEMO_MODE=true` bilan qurish mumkin (Dockerfile: `--build-arg DEMO_MODE=true`).
///
/// MUHIM (2026-09-25 audit): avval standart qiymat `true` edi va `mobile/Dockerfile` bu
/// define'ni umuman bermasdi — natijada qurilgan HAR BIR APK demo rejimda chiqqan:
/// login paytida parol tekshirilmagan (`MockData.directorProfile` qaytarilgan) va hamma
/// ekran soxta ma'lumot ko'rsatgan. Standart qiymat `false` bo'lishi shart — aks holda
/// `--dart-define`ni unutish jimgina yana soxta APK beradi.
const bool kDemoMode = bool.fromEnvironment('DEMO_MODE', defaultValue: false);

/// Ilovadagi uchta foydalanuvchi turi.
///
/// MUHIM (2026-09-25): avval faqat `director` va `guardian` bor edi — TEACHER roli bilan
/// kirgan o'qituvchi direktor bilan AYNAN bir xil interfeysni olardi. Endi u alohida
/// persona: faqat o'zi sinf rahbari bo'lgan sinfni ko'radi (server tomonida ham
/// cheklangan — CurrentUserService#allowedClassIds).
enum AppPersona { none, director, teacher, guardian }

/// Xodim rolidan personani aniqlaydi. Bitta joyda turishi SHART — `_restore()` va
/// `loginDirector()` ikkalasi ham shuni ishlatadi, aks holda ilovani qayta ochganda
/// persona o'zgarib ketishi mumkin.
AppPersona personaForRole(String? role) {
  if (role == 'GUARDIAN') return AppPersona.guardian;
  if (role == 'TEACHER') return AppPersona.teacher;
  return AppPersona.director;
}

class AuthState {
  final AppPersona persona;
  final Map<String, dynamic>? profile; // staff User yoki Guardian xaritasi
  final bool loading;

  const AuthState({this.persona = AppPersona.none, this.profile, this.loading = true});

  AuthState copyWith({AppPersona? persona, Map<String, dynamic>? profile, bool? loading}) => AuthState(
        persona: persona ?? this.persona,
        profile: profile ?? this.profile,
        loading: loading ?? this.loading,
      );

  /// Xodim (direktor yoki o'qituvchi) rolining o'zi — DIRECTOR/MUDIR/TEACHER/SUPERADMIN va h.k.
  /// Ota-ona uchun har doim null.
  String? get staffRole => isStaff ? (profile?['role'] as String?) : null;

  /// Xodimmi (direktor yoki o'qituvchi) — ota-onadan farqlash uchun.
  bool get isStaff => persona == AppPersona.director || persona == AppPersona.teacher;

  /// Profildagi maktab id — xodim ekranlari shunga tayanadi.
  int? get schoolId => profile?['schoolId'] is int ? profile!['schoolId'] as int : null;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._api, this._storage) : super(const AuthState()) {
    _restore();
  }

  final ApiClient _api;
  final TokenStorage _storage;

  Future<void> _restore() async {
    final token = await _storage.readToken();
    final role = await _storage.readRole();
    final profileJson = await _storage.readProfileJson();
    if (token != null && role != null && profileJson != null) {
      state = AuthState(
        persona: personaForRole(role),
        profile: jsonDecode(profileJson) as Map<String, dynamic>,
        loading: false,
      );
    } else {
      state = state.copyWith(loading: false);
    }
  }

  Future<String?> loginDirector(String username, String password) async {
    try {
      if (kDemoMode) {
        final user = MockData.directorProfile;
        await _storage.save(token: 'demo-token-dir', role: user['role'] as String, profileJson: jsonEncode(user));
        state = AuthState(
            persona: personaForRole(user['role'] as String?), profile: user, loading: false);
        return null;
      }
      final res = await _api.post('/api/auth/login', data: {'username': username, 'password': password});
      final data = res.data as Map<String, dynamic>;
      final user = data['user'] as Map<String, dynamic>;
      await _storage.save(token: data['token'] as String, role: user['role'] as String, profileJson: jsonEncode(user));
      state = AuthState(
          persona: personaForRole(user['role'] as String?), profile: user, loading: false);
      return null;
    } catch (e) {
      return apiErrorMessage(e, fallback: 'Login yoki parol noto\'g\'ri');
    }
  }

  Future<String?> loginGuardian(String phone, String password) async {
    try {
      if (kDemoMode) {
        final guardian = MockData.parentProfile;
        await _storage.save(token: 'demo-token-gua', role: 'GUARDIAN', profileJson: jsonEncode(guardian));
        state = AuthState(persona: AppPersona.guardian, profile: guardian, loading: false);
        return null;
      }
      final res = await _api.post('/api/guardian-app/login', data: {'phone': phone, 'password': password});
      final data = res.data as Map<String, dynamic>;
      final guardian = data['guardian'] as Map<String, dynamic>;
      await _storage.save(token: data['token'] as String, role: 'GUARDIAN', profileJson: jsonEncode(guardian));
      state = AuthState(persona: AppPersona.guardian, profile: guardian, loading: false);
      return null;
    } catch (e) {
      return apiErrorMessage(e, fallback: 'Telefon yoki parol noto\'g\'ri');
    }
  }

  Future<void> logout() async {
    await _storage.clear();
    state = const AuthState(persona: AppPersona.none, loading: false);
  }

  /// Profil ma'lumotini (masalan ism/telefon o'zgarganda) mahalliy holatda va
  /// xavfsiz saqlashda yangilaydi — token/rolga tegmaydi.
  Future<void> updateLocalProfile(Map<String, dynamic> profile) async {
    await _storage.updateProfileJson(jsonEncode(profile));
    state = state.copyWith(profile: profile);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref.watch(apiClientProvider), ref.watch(tokenStorageProvider)),
);
