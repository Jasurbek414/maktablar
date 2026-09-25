import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppThemeMode { dark, light }

class _ThemeState {
  static bool isDark = true;
}

/// Minimalist, zamonaviy va toza ranglar palitrasi.
/// Qorong'i rejimda chuqur Obsidian/Slate tuslari, yorug' rejimda musaffo oq/kulrang tuslar.
class AppColors {
  // Fon ranglari
  static Color get bgMain => _ThemeState.isDark ? const Color(0xFF090B10) : const Color(0xFFF8FAFC);
  static Color get bgSidebar => _ThemeState.isDark ? const Color(0xFF0E121A) : const Color(0xFFFFFFFF);
  static Color get bgCard => _ThemeState.isDark ? const Color(0xFF131823) : const Color(0xFFFFFFFF);
  static Color get bgCardAlt => _ThemeState.isDark ? const Color(0xFF18202E) : const Color(0xFFF1F5F9);
  static Color get bgInput => _ThemeState.isDark ? const Color(0xFF0E131C) : const Color(0xFFF8FAFC);

  // Asosiy va aksent ranglar
  static Color get emerald => _ThemeState.isDark ? const Color(0xFF10B981) : const Color(0xFF059669);
  static Color get emeralddark => _ThemeState.isDark ? const Color(0xFF059669) : const Color(0xFF047857);
  static Color get cyan => _ThemeState.isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7);
  static Color get amber => _ThemeState.isDark ? const Color(0xFFF59E0B) : const Color(0xFFD97706);
  static Color get red => _ThemeState.isDark ? const Color(0xFFF43F5E) : const Color(0xFFE11D48);
  static Color get purple => _ThemeState.isDark ? const Color(0xFFA855F7) : const Color(0xFF7E22CE);

  // Matn ranglari
  static Color get textPrimary => _ThemeState.isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A);
  static Color get textSecondary => _ThemeState.isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569);
  static Color get textMuted => _ThemeState.isDark ? const Color(0xFF64748B) : const Color(0xFF64748B);
  static Color get textFaint => _ThemeState.isDark ? const Color(0xFF475569) : const Color(0xFF94A3B8);

  // Chegaralar (Borders) - mayin, toza 1px
  static Color get borderEmerald => _ThemeState.isDark ? const Color(0x3310B981) : const Color(0x2E059669);
  static Color get borderWhite => _ThemeState.isDark ? const Color(0x14FFFFFF) : const Color(0xFFE2E8F0);
  static Color get borderSubtle => _ThemeState.isDark ? const Color(0x18FFFFFF) : const Color(0xFFE2E8F0);
}

/// Minimalist dizayn uchun umumiy dekoratsiya va stillar
class AppDecorations {
  static BoxDecoration card({
    Color? color,
    BorderRadius? borderRadius,
    Border? border,
    bool elevated = false,
  }) {
    return BoxDecoration(
      color: color ?? AppColors.bgCard,
      borderRadius: borderRadius ?? BorderRadius.circular(18),
      border: border ?? Border.all(color: AppColors.borderSubtle, width: 1),
      boxShadow: elevated
          ? [
              BoxShadow(
                color: _ThemeState.isDark
                    ? Colors.black.withOpacity(0.3)
                    : Colors.black.withOpacity(0.04),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ]
          : null,
    );
  }

  static BoxDecoration badge({required Color color, double opacity = 0.12}) {
    return BoxDecoration(
      color: color.withOpacity(opacity),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: color.withOpacity(0.25), width: 1),
    );
  }
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
        scrolledUnderElevation: 0,
        centerTitle: false,
        foregroundColor: AppColors.textPrimary,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.bgCard,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: AppColors.bgCard,
        modalBackgroundColor: AppColors.bgCard,
        elevation: 12,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.bgInput,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppColors.emerald, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppColors.red, width: 1),
        ),
        hintStyle: TextStyle(color: AppColors.textFaint, fontSize: 14),
        labelStyle: TextStyle(color: AppColors.textMuted, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 22),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15, letterSpacing: -0.2),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 22),
          side: BorderSide(color: AppColors.borderSubtle, width: 1),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.bgSidebar,
        elevation: 0,
        selectedItemColor: AppColors.emerald,
        unselectedItemColor: AppColors.textFaint,
        selectedLabelStyle: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w500),
        type: BottomNavigationBarType.fixed,
      ),
      dividerTheme: DividerThemeData(color: AppColors.borderSubtle, thickness: 1, space: 1),
    );
  }

  static ThemeData dark() => themeFor(AppThemeMode.dark);
}
