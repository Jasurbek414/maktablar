import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Server javob bermaganda ko'rsatiladigan umumiy xato holati + qayta urinish tugmasi.
///
/// MUHIM (2026-09-25 audit): ilovadagi bir necha ekran xato yuz berganda JIMGINA
/// `MockData`ga tushib ketardi — foydalanuvchi "ishlayapti" deb o'ylardi, lekin ekrandagi
/// raqamlar soxta edi. Endi xato aniq aytiladi va qayta urinish taklif qilinadi.
class AppErrorState extends StatelessWidget {
  const AppErrorState({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off_rounded, size: 44, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 13.5),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Qayta urinish'),
            ),
          ],
        ),
      ),
    );
  }
}
