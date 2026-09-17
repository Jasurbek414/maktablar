import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/director/director_home_shell.dart';
import 'features/parent/parent_home_screen.dart';
import 'theme/app_theme.dart';

class MaktabDavomadApp extends ConsumerWidget {
  const MaktabDavomadApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return MaterialApp(
      title: 'Maktab Davomad',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.themeFor(mode),
      home: const _RootRouter(),
    );
  }
}

/// Auth holatiga qarab tegishli ildiz ekranini ko'rsatadi:
/// hali kirilmagan -> LoginScreen, GUARDIAN -> ota-ona ilovasi, DIRECTOR (yoki boshqa
/// xodim roli) -> xodim ilovasi.
class _RootRouter extends ConsumerWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    switch (auth.persona) {
      case AppPersona.guardian:
        return const ParentHomeScreen();
      case AppPersona.director:
        return const DirectorHomeShell();
      case AppPersona.none:
        return const LoginScreen();
    }
  }
}
