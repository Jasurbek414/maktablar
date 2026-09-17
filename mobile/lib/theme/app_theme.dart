import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppThemeMode { dark, light }

/// AppColors getterlari o'qiydigan global holat. Riverpod providerdan tashqarida
/// ham (masalan static getterlar ichida) o'qish kerak bo'lgani uchun oddiy statik
/// bayroq sifatida saqlanadi; haqiqiy manba — ThemeModeController.
class _ThemeState {
  static bool isDark = true;
}

/// Veb-ilova (frontend/) bilan bir xil rang palitrasi: qorong'i fon + zumrad (emerald)
/// urg'u — endi kun/tun rejimiga qarab ikkita palitra orasida almashadi.
class AppColors {
  static Color get bgMain => _ThemeState.isDark ? const Color(0xFF020504) : const Color(0xFFF4F7F5);
  static Color get bgSidebar => _ThemeState.isDark ? const Color(0xFF0A120E) : const Color(0xFFFFFFFF);
  static Color get bgCard => _ThemeState.isDark ? const Color(0xFF0D1A14) : const Color(0xFFFFFFFF);
  static Color get bgCardAlt => _ThemeState.isDark ? const Color(0xFF0A1410) : const Color(0xFFF1F5F3);
  static Color get bgInput => _ThemeState.isDark ? const Color(0xFF0A120E) : const Color(0xFFF1F5F3);

  static Color get emerald => _ThemeState.isDark ? const Color(0xFF10B981) : const Color(0xFF059669);
  static Color get emeralddark => _ThemeState.isDark ? const Color(0xFF059669) : const Color(0xFF047857);
  static Color get cyan => _ThemeState.isDark ? const Color(0xFF22D3EE) : const Color(0xFF0891B2);
  static Color get amber => _ThemeState.isDark ? const Color(0xFFF59E0B) : const Color(0xFFD97706);
  static Color get red => _ThemeState.isDark ? const Color(0xFFEF4444) : const Color(0xFFDC2626);
  static Color get purple => _ThemeState.isDark ? const Color(0xFFA855F7) : const Color(0xFF9333EA);

  static Color get textPrimary => _ThemeState.isDark ? Colors.white : const Color(0xFF0F172A);
  static Color get textSecondary => _ThemeState.isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569);
  static Color get textMuted => _ThemeState.isDark ? const Color(0xFF64748B) : const Color(0xFF64748B);
  static Color get textFaint => _ThemeState.isDark ? const Color(0xFF475569) : const Color(0xFF94A3B8);

  static Color get borderEmerald => _ThemeState.isDark ? const Color(0x1A10B981) : const Color(0x1A059669);
  static Color get borderWhite => _ThemeState.isDark ? const Color(0x0AFFFFFF) : const Color(0x0A000000);
}

class ThemeModeController extends StateNotifier<AppThemeMode> {
  ThemeModeController() : super(AppThemeMode.dark) {
    _restore();
  }

  static const _prefKey = 'app_theme_mode';

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefKey);
    final mode = saved == 'light' ? AppThemeMode.light : AppThemeMode.dark;
    _ThemeState.isDark = mode == AppThemeMode.dark;
    if (mounted) state = mode;
  }

  Future<void> setMode(AppThemeMode mode) async {
    _ThemeState.isDark = mode == AppThemeMode.dark;
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, mode == AppThemeMode.dark ? 'dark' : 'light');
  }

  Future<void> toggle() => setMode(state == AppThemeMode.dark ? AppThemeMode.light : AppThemeMode.dark);
}

final themeModeProvider = StateNotifierProvider<ThemeModeController, AppThemeMode>((ref) => ThemeModeController());

class AppTheme {
  static ThemeData themeFor(AppThemeMode mode) {
    _ThemeState.isDark = mode == AppThemeMode.dark;
    final base = _ThemeState.isDark ? ThemeData.dark(useMaterial3: true) : ThemeData.light(useMaterial3: true);
    final textTheme = GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    );

    return base.copyWith(
      scaffoldBackgroundColor: AppColors.bgMain,
      primaryColor: AppColors.emerald,
      textTheme: textTheme,
      colorScheme: base.colorScheme.copyWith(
        primary: AppColors.emerald,
        secondary: AppColors.cyan,
        surface: AppColors.bgCard,
        error: AppColors.red,
        brightness: _ThemeState.isDark ? Brightness.dark : Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.bgMain,
        elevation: 0,
        centerTitle: false,
        foregroundColor: AppColors.textPrimary,
      ),
      cardTheme: CardThemeData(
        color: AppColors.bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.borderEmerald),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.bgInput,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.borderEmerald),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.borderEmerald),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.emerald, width: 1.5),
        ),
        hintStyle: TextStyle(color: AppColors.textFaint),
        labelStyle: TextStyle(color: AppColors.textSecondary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emerald,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.bgSidebar,
        selectedItemColor: AppColors.emerald,
        unselectedItemColor: AppColors.textFaint,
        type: BottomNavigationBarType.fixed,
      ),
      dividerTheme: DividerThemeData(color: AppColors.borderWhite, thickness: 1),
    );
  }

  static ThemeData dark() => themeFor(AppThemeMode.dark);
}
