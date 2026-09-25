import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../../widgets/settings_row.dart';
import 'auth_controller.dart';

enum _LoginMode { director, guardian }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  _LoginMode _mode = _LoginMode.director;
  final _idCtrl = TextEditingController();
  final _pwCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscure = true;

  @override
  void dispose() {
    _idCtrl.dispose();
    _pwCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final controller = ref.read(authControllerProvider.notifier);
    final err = _mode == _LoginMode.director
        ? await controller.loginDirector(_idCtrl.text.trim(), _pwCtrl.text)
        : await controller.loginGuardian(_idCtrl.text.trim(), _pwCtrl.text);
    if (!mounted) return;
    setState(() {
      _loading = false;
      _error = err;
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    final isDirector = _mode == _LoginMode.director;

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            const Positioned(top: 12, right: 16, child: CompactLanguagePicker()),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Minimalist Logo Badge
                    Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        color: AppColors.bgCard,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppColors.borderEmerald, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.emerald.withOpacity(0.12),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(Icons.school_rounded, color: AppColors.emerald, size: 32),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Maktab Davomat',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Face ID monitoring & boshqaruv tizimi',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 32),

                    // Minimalist Segmented Role Switcher
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.bgCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: _RoleTab(
                              icon: Icons.badge_rounded,
                              label: t('login.staff'),
                              isSelected: isDirector,
                              onTap: () => setState(() {
                                _mode = _LoginMode.director;
                                _error = null;
                              }),
                            ),
                          ),
                          Expanded(
                            child: _RoleTab(
                              icon: Icons.family_restroom_rounded,
                              label: t('login.guardian'),
                              isSelected: !isDirector,
                              onTap: () => setState(() {
                                _mode = _LoginMode.guardian;
                                _error = null;
                              }),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Minimalist Form
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: AppDecorations.card(elevated: true),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isDirector ? t('login.username') : t('login.phone'),
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _idCtrl,
                            style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                            keyboardType: isDirector ? TextInputType.text : TextInputType.phone,
                            decoration: InputDecoration(
                              hintText: isDirector ? 'masalan: direktor1' : '+998 90 123 45 67',
                              prefixIcon: Icon(isDirector ? Icons.person_rounded : Icons.phone_rounded, size: 20, color: AppColors.textMuted),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            t('login.password'),
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _pwCtrl,
                            obscureText: _obscure,
                            style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: '••••••••',
                              prefixIcon: Icon(Icons.lock_rounded, size: 20, color: AppColors.textMuted),
                              suffixIcon: IconButton(
                                icon: Icon(_obscure ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20, color: AppColors.textMuted),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                            onSubmitted: (_) => _submit(),
                          ),
                          if (!isDirector)
                            Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: Text(
                                t('login.firstTimeHint'),
                                style: TextStyle(color: AppColors.textFaint, fontSize: 11.5),
                              ),
                            ),
                          if (_error != null)
                            Container(
                              margin: const EdgeInsets.only(top: 14),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: AppDecorations.badge(color: AppColors.red),
                              child: Row(
                                children: [
                                  Icon(Icons.info_rounded, color: AppColors.red, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(_error!, style: TextStyle(color: AppColors.red, fontSize: 12)),
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _loading ? null : _submit,
                              child: _loading
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : Text(t('common.login')),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoleTab extends StatelessWidget {
  const _RoleTab({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.emerald : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : AppColors.textMuted,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.textSecondary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                fontSize: 13.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
