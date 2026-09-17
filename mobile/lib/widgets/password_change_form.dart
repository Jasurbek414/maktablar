import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../l10n/l10n.dart';
import '../theme/app_theme.dart';

/// Direktor (features/director) va ota-ona (features/parent) profil ekranlarida
/// bir xil "parolni o'zgartirish" formasi — faqat backend endpointi farq qiladi
/// (chaqiruvchi buni onSubmit orqali beradi).
class PasswordChangeForm extends StatefulWidget {
  const PasswordChangeForm({super.key, required this.onSubmit});
  final Future<void> Function(String oldPassword, String newPassword) onSubmit;

  @override
  State<PasswordChangeForm> createState() => _PasswordChangeFormState();
}

class _PasswordChangeFormState extends State<PasswordChangeForm> {
  final _oldCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _saving = false;
  String? _error;
  String? _success;
  bool _obscureOld = true;
  bool _obscureNew = true;

  @override
  void dispose() {
    _oldCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _error = null; _success = null; });
    if (_oldCtrl.text.isEmpty || _newCtrl.text.isEmpty) {
      setState(() => _error = t('pwd.fillAll'));
      return;
    }
    if (_newCtrl.text != _confirmCtrl.text) {
      setState(() => _error = t('pwd.mismatch'));
      return;
    }
    if (_newCtrl.text.length < 6) {
      setState(() => _error = t('pwd.tooShort'));
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.onSubmit(_oldCtrl.text, _newCtrl.text);
      _oldCtrl.clear();
      _newCtrl.clear();
      _confirmCtrl.clear();
      setState(() => _success = t('pwd.success'));
    } catch (e) {
      setState(() => _error = apiErrorMessage(e, fallback: t('pwd.wrong')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _oldCtrl,
          obscureText: _obscureOld,
          style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            labelText: t('profile.currentPassword'),
            suffixIcon: IconButton(
              icon: Icon(_obscureOld ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.textMuted, size: 20),
              onPressed: () => setState(() => _obscureOld = !_obscureOld),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _newCtrl,
          obscureText: _obscureNew,
          style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            labelText: t('profile.newPassword'),
            suffixIcon: IconButton(
              icon: Icon(_obscureNew ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.textMuted, size: 20),
              onPressed: () => setState(() => _obscureNew = !_obscureNew),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _confirmCtrl,
          obscureText: _obscureNew,
          style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
          decoration: InputDecoration(labelText: t('profile.confirmPassword')),
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
            onPressed: _saving ? null : _submit,
            child: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(t('profile.updatePassword')),
          ),
        ),
      ],
    );
  }
}
