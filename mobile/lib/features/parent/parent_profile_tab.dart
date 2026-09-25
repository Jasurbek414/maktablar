import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../../widgets/password_change_form.dart';
import '../../widgets/settings_row.dart';
import '../auth/auth_controller.dart';
import 'parent_repository.dart';

class ParentProfileTab extends ConsumerStatefulWidget {
  const ParentProfileTab({super.key, required this.profile});
  final Map<String, dynamic>? profile;

  @override
  ConsumerState<ParentProfileTab> createState() => _ParentProfileTabState();
}

class _ParentProfileTabState extends ConsumerState<ParentProfileTab> {
  late final TextEditingController _nameCtrl;
  bool _saving = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.profile?['name'] as String? ?? widget.profile?['fullName'] as String? ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() { _saving = true; _error = null; _success = null; });
    try {
      final updated = await ref.read(parentRepositoryProvider).updateProfile(name: _nameCtrl.text.trim());
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
    final name = p?['fullName'] as String? ?? p?['name'] as String? ?? 'Ota-ona';
    final initial = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(title: Text(t('nav.profile'))),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // ── Header Card ──
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppDecorations.card(),
            child: Row(
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppColors.cyan.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.cyan.withOpacity(0.25)),
                  ),
                  alignment: Alignment.center,
                  child: Text(initial, style: TextStyle(color: AppColors.cyan, fontWeight: FontWeight.bold, fontSize: 22)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16.5)),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: AppDecorations.badge(color: AppColors.cyan),
                        child: Text(
                          t('profile.parent'),
                          style: TextStyle(color: AppColors.cyan, fontSize: 11.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Appearance ──
          _SectionCard(
            title: t('profile.appearance'),
            child: const AppearanceSettingsSection(),
          ),

          const SizedBox(height: 16),

          // ── Personal Info ──
          _SectionCard(
            title: t('profile.personalInfo'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _nameCtrl,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: t('profile.yourName'),
                    prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: AppColors.textMuted),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.bgInput,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(t('profile.phone'), style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text(p?['phone'] as String? ?? '', style: TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                if (_error != null)
                  Container(
                    margin: const EdgeInsets.only(top: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: AppDecorations.badge(color: AppColors.red),
                    child: Text(_error!, style: TextStyle(color: AppColors.red, fontSize: 12)),
                  ),
                if (_success != null)
                  Container(
                    margin: const EdgeInsets.only(top: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: AppDecorations.badge(color: AppColors.emerald),
                    child: Text(_success!, style: TextStyle(color: AppColors.emerald, fontSize: 12)),
                  ),
                const SizedBox(height: 16),
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

          // ── Change Password ──
          _SectionCard(
            title: t('profile.changePassword'),
            child: PasswordChangeForm(
              onSubmit: (oldP, newP) => ref.read(parentRepositoryProvider).changePassword(oldP, newP),
            ),
          ),

          const SizedBox(height: 16),

          // ── Logout ──
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => ref.read(authControllerProvider.notifier).logout(),
              icon: Icon(Icons.logout_rounded, color: AppColors.red, size: 18),
              label: Text(t('common.logout'), style: TextStyle(color: AppColors.red)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.red.withOpacity(0.3)),
              ),
            ),
          ),
          const SizedBox(height: 24),
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
      padding: const EdgeInsets.all(18),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}
