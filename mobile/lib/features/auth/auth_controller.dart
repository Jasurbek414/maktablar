import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../core/token_storage.dart';

enum AppPersona { none, director, guardian }

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

  /// Direktor ilovasida staff rolining o'zi (DIRECTOR/MUDIR/TEACHER/SUPERADMIN va h.k.)
  String? get staffRole => persona == AppPersona.director ? (profile?['role'] as String?) : null;
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
      final persona = role == 'GUARDIAN' ? AppPersona.guardian : AppPersona.director;
      state = AuthState(persona: persona, profile: jsonDecode(profileJson) as Map<String, dynamic>, loading: false);
    } else {
      state = state.copyWith(loading: false);
    }
  }

  Future<String?> loginDirector(String username, String password) async {
    try {
      final res = await _api.post('/api/auth/login', data: {'username': username, 'password': password});
      final data = res.data as Map<String, dynamic>;
      final user = data['user'] as Map<String, dynamic>;
      await _storage.save(token: data['token'] as String, role: user['role'] as String, profileJson: jsonEncode(user));
      state = AuthState(persona: AppPersona.director, profile: user, loading: false);
      return null;
    } catch (e) {
      return apiErrorMessage(e, fallback: 'Login yoki parol noto\'g\'ri');
    }
  }

  Future<String?> loginGuardian(String phone, String password) async {
    try {
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
