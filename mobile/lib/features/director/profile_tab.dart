import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../../widgets/password_change_form.dart';
import '../../widgets/settings_row.dart';
import '../auth/auth_controller.dart';
import 'director_repository.dart';

const _roleLabels = {
  'SUPERADMIN': 'Superadmin',
  'ADMIN': 'Admin',
  'REGION_DIRECTOR': 'Viloyat direktori',
  'DISTRICT_DIRECTOR': 'Tuman direktori',
  'DIRECTOR': 'Direktor',
  'MUDIR': 'Mudira',
  'TEACHER': 'O\'qituvchi',
};

class ProfileTab extends ConsumerStatefulWidget {
  const ProfileTab({super.key, required this.profile});
  final Map<String, dynamic>? profile;

  @override
  ConsumerState<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends ConsumerState<ProfileTab> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  bool _saving = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.profile?['fullName'] as String? ?? '');
    _phoneCtrl = TextEditingController(text: widget.profile?['phone'] as String? ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() { _saving = true; _error = null; _success = null; });
    try {
      final updated = await ref.read(directorRepositoryProvider).updateProfile(
            fullName: _nameCtrl.text.trim(),
            phone: _phoneCtrl.text.trim(),
          );
      final merged = { ...?widget.profile, ...updated };
      await ref.read(authControllerProvider.notifier).updateLocalProfile(merged);
      setState(() => _success = 'Saqlandi');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    final p = widget.profile;
    final fullName = p?['fullName'] as String? ?? '';
    final initial = fullName.isNotEmpty ? fullName.substring(0, 1).toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(title: Text(t('nav.profile'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.emerald, const Color(0xFF34D399)]), borderRadius: BorderRadius.circular(20)),
                  alignment: Alignment.center,
                  child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 26)),
                ),
                const SizedBox(height: 12),
                Text(p?['fullName'] as String? ?? '', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 17)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.emerald.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                  child: Text(_roleLabels[p?['role']] ?? p?['role'] as String? ?? '', style: TextStyle(color: AppColors.emerald, fontSize: 12)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          _SectionCard(
            title: t('profile.appearance'),
            child: const AppearanceSettingsSection(),
          ),

          const SizedBox(height: 16),

          _SectionCard(
            title: t('profile.personalInfo'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _nameCtrl,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  decoration: InputDecoration(labelText: t('profile.fullName')),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneCtrl,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(labelText: t('profile.phone'), hintText: '+998...'),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(color: AppColors.bgCardAlt, borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(t('profile.login'), style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                      Text(p?['username'] as String? ?? '', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5, fontFamily: 'monospace')),
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: TextStyle(color: AppColors.red, fontSize: 12.5)),
                ],
                if (_success != null) ...[
                  const SizedBox(height: 10),
                  Text(_success!, style: TextStyle(color: AppColors.emerald, fontSize: 12.5)),
                ],
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _saveProfile,
                    child: _saving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(t('common.save')),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          _SectionCard(
            title: t('profile.changePassword'),
            child: PasswordChangeForm(
              onSubmit: (oldP, newP) => ref.read(directorRepositoryProvider).changePassword(oldP, newP),
            ),
          ),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => ref.read(authControllerProvider.notifier).logout(),
              icon: Icon(Icons.logout_rounded, color: AppColors.red, size: 18),
              label: Text(t('common.logout'), style: TextStyle(color: AppColors.red)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0x33EF4444)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderEmerald),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}
