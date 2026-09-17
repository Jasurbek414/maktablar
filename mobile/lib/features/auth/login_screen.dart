import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../../widgets/settings_row.dart';
import 'auth_controller.dart';

enum _LoginMode { picker, director, guardian }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  _LoginMode _mode = _LoginMode.picker;
  final _idCtrl = TextEditingController(); // username yoki telefon
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
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [AppColors.emerald, const Color(0xFF34D399)]),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [BoxShadow(color: AppColors.emerald.withOpacity(0.25), blurRadius: 24, offset: const Offset(0, 8))],
                      ),
                      child: const Icon(Icons.school_rounded, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 20),
                    Text('Maktab Davomad', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    const SizedBox(height: 6),
                    Text(
                      _mode == _LoginMode.picker
                          ? t('login.pickPersona')
                          : _mode == _LoginMode.director
                              ? t('login.staff')
                              : t('login.guardian'),
                      style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                    ),
                    const SizedBox(height: 36),
                    if (_mode == _LoginMode.picker) _buildPicker() else _buildForm(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPicker() {
    return Column(
      children: [
        _PersonaCard(
          icon: Icons.badge_rounded,
          title: t('login.staff'),
          subtitle: t('login.staffDesc'),
          onTap: () => setState(() => _mode = _LoginMode.director),
        ),
        const SizedBox(height: 14),
        _PersonaCard(
          icon: Icons.family_restroom_rounded,
          title: t('login.guardian'),
          subtitle: t('login.guardianDesc'),
          onTap: () => setState(() => _mode = _LoginMode.guardian),
        ),
      ],
    );
  }

  Widget _buildForm() {
    final isDirector = _mode == _LoginMode.director;
    return Column(
      children: [
        TextField(
          controller: _idCtrl,
          style: TextStyle(color: AppColors.textPrimary),
          keyboardType: isDirector ? TextInputType.text : TextInputType.phone,
          decoration: InputDecoration(
            labelText: isDirector ? t('login.username') : t('login.phone'),
            hintText: isDirector ? 'masalan: direktor1' : '+998...',
            prefixIcon: Icon(isDirector ? Icons.person_outline : Icons.phone_outlined, color: AppColors.textMuted),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _pwCtrl,
          obscureText: _obscure,
          style: TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: t('login.password'),
            prefixIcon: Icon(Icons.lock_outline, color: AppColors.textMuted),
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.textMuted),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          onSubmitted: (_) => _submit(),
        ),
        if (!isDirector)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                t('login.firstTimeHint'),
                style: TextStyle(color: AppColors.textFaint, fontSize: 11.5),
              ),
            ),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Text(_error!, style: TextStyle(color: AppColors.red, fontSize: 13), textAlign: TextAlign.center),
          ),
        const SizedBox(height: 22),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(t('common.login')),
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => setState(() {
            _mode = _LoginMode.picker;
            _error = null;
            _idCtrl.clear();
            _pwCtrl.clear();
          }),
          child: Text(t('login.back'), style: TextStyle(color: AppColors.textMuted)),
        ),
      ],
    );
  }
}

class _PersonaCard extends StatelessWidget {
  const _PersonaCard({required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.borderEmerald),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.emerald.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: AppColors.emerald, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 3),
                  Text(subtitle, style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.textFaint),
          ],
        ),
      ),
    );
  }
}
