import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/l10n.dart';
import '../theme/app_theme.dart';

/// Direktor va ota-ona Profil ekranlarida ishlatiladigan umumiy "Ko'rinish"
/// bo'limi — kun/tun rejimi va til tanlovi, ikkalasi ham darhol qo'llanadi va
/// SharedPreferences orqali saqlanadi.
class AppearanceSettingsSection extends ConsumerWidget {
  const AppearanceSettingsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(t('profile.theme'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            _ThemeSegment(
              isDark: mode == AppThemeMode.dark,
              onChanged: (isDark) => ref.read(themeModeProvider.notifier).setMode(isDark ? AppThemeMode.dark : AppThemeMode.light),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(t('profile.language'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            _LanguageSegment(
              current: locale,
              onChanged: (l) => ref.read(localeProvider.notifier).setLocale(l),
            ),
          ],
        ),
      ],
    );
  }
}

/// Kirish (login) ekrani uchun ixcham til tanlagich — hali profilga
/// yetib bo'lmagan holatda ham tilni almashtirish imkonini beradi.
class CompactLanguagePicker extends ConsumerWidget {
  const CompactLanguagePicker({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    return _LanguageSegment(current: locale, onChanged: (l) => ref.read(localeProvider.notifier).setLocale(l));
  }
}

class _ThemeSegment extends StatelessWidget {
  const _ThemeSegment({required this.isDark, required this.onChanged});
  final bool isDark;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: AppColors.bgInput, borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _segmentButton(icon: Icons.dark_mode_rounded, label: t('profile.themeDark'), selected: isDark, onTap: () => onChanged(true)),
          _segmentButton(icon: Icons.light_mode_rounded, label: t('profile.themeLight'), selected: !isDark, onTap: () => onChanged(false)),
        ],
      ),
    );
  }

  Widget _segmentButton({required IconData icon, required String label, required bool selected, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(color: selected ? AppColors.emerald.withOpacity(0.15) : null, borderRadius: BorderRadius.circular(8)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: selected ? AppColors.emerald : AppColors.textFaint),
            const SizedBox(width: 5),
            Text(label, style: TextStyle(fontSize: 12, color: selected ? AppColors.emerald : AppColors.textFaint, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

class _LanguageSegment extends StatelessWidget {
  const _LanguageSegment({required this.current, required this.onChanged});
  final AppLocale current;
  final ValueChanged<AppLocale> onChanged;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<AppLocale>(
      initialValue: current,
      onSelected: onChanged,
      color: AppColors.bgCardAlt,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.borderEmerald)),
      itemBuilder: (context) => AppLocale.values
          .map((l) => PopupMenuItem(
                value: l,
                child: Text(localeLabel(l), style: TextStyle(color: l == current ? AppColors.emerald : AppColors.textPrimary, fontSize: 13)),
              ))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(color: AppColors.bgInput, borderRadius: BorderRadius.circular(10)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(localeLabel(current), style: TextStyle(fontSize: 12.5, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
            const SizedBox(width: 4),
            Icon(Icons.expand_more_rounded, size: 16, color: AppColors.textFaint),
          ],
        ),
      ),
    );
  }
}
