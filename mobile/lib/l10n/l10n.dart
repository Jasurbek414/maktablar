import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppLocale { uz, ru, en }

String localeCode(AppLocale l) => switch (l) { AppLocale.uz => 'uz', AppLocale.ru => 'ru', AppLocale.en => 'en' };

AppLocale localeFromCode(String? code) => switch (code) {
      'ru' => AppLocale.ru,
      'en' => AppLocale.en,
      _ => AppLocale.uz,
    };

String localeLabel(AppLocale l) => switch (l) { AppLocale.uz => 'O\'zbekcha', AppLocale.ru => 'Русский', AppLocale.en => 'English' };

class _LocaleState {
  static AppLocale current = AppLocale.uz;
}

class LocaleController extends StateNotifier<AppLocale> {
  LocaleController() : super(AppLocale.uz) {
    _restore();
  }

  static const _prefKey = 'app_locale';

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final locale = localeFromCode(prefs.getString(_prefKey));
    _LocaleState.current = locale;
    if (mounted) state = locale;
  }

  Future<void> setLocale(AppLocale locale) async {
    _LocaleState.current = locale;
    state = locale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, localeCode(locale));
  }
}

final localeProvider = StateNotifierProvider<LocaleController, AppLocale>((ref) => LocaleController());

/// Joriy tanlangan til bo'yicha matn qaytaruvchi yordamchi. Har bir ekran o'z
/// build()'ida `ref.watch(localeProvider)` chaqirib qayta chizilishini ta'minlaydi;
/// `t()` esa `_LocaleState.current`dan o'qiydi (statik holat, AppColors bilan bir xil naqsh).
String t(String key) {
  final entry = _strings[key];
  if (entry == null) return key;
  return entry[_LocaleState.current] ?? entry[AppLocale.uz] ?? key;
}

const Map<String, Map<AppLocale, String>> _strings = {
  // Umumiy / navigatsiya
  'nav.home': {AppLocale.uz: 'Bosh sahifa', AppLocale.ru: 'Главная', AppLocale.en: 'Home'},
  'nav.students': {AppLocale.uz: 'O\'quvchilar', AppLocale.ru: 'Ученики', AppLocale.en: 'Students'},
  'nav.classes': {AppLocale.uz: 'Sinflar', AppLocale.ru: 'Классы', AppLocale.en: 'Classes'},
  'nav.teachers': {AppLocale.uz: 'O\'qituvchilar', AppLocale.ru: 'Учителя', AppLocale.en: 'Teachers'},
  'nav.profile': {AppLocale.uz: 'Profil', AppLocale.ru: 'Профиль', AppLocale.en: 'Profile'},
  'nav.children': {AppLocale.uz: 'Farzandlarim', AppLocale.ru: 'Мои дети', AppLocale.en: 'My children'},

  'common.save': {AppLocale.uz: 'Saqlash', AppLocale.ru: 'Сохранить', AppLocale.en: 'Save'},
  'common.saved': {AppLocale.uz: 'Saqlandi', AppLocale.ru: 'Сохранено', AppLocale.en: 'Saved'},
  'common.cancel': {AppLocale.uz: 'Bekor qilish', AppLocale.ru: 'Отмена', AppLocale.en: 'Cancel'},
  'common.retry': {AppLocale.uz: 'Qayta urinish', AppLocale.ru: 'Повторить', AppLocale.en: 'Retry'},
  'common.search': {AppLocale.uz: 'Qidirish...', AppLocale.ru: 'Поиск...', AppLocale.en: 'Search...'},
  'common.send': {AppLocale.uz: 'Yuborish', AppLocale.ru: 'Отправить', AppLocale.en: 'Send'},
  'common.logout': {AppLocale.uz: 'Chiqish', AppLocale.ru: 'Выйти', AppLocale.en: 'Log out'},
  'common.login': {AppLocale.uz: 'Kirish', AppLocale.ru: 'Войти', AppLocale.en: 'Log in'},
  'common.noData': {AppLocale.uz: 'Ma\'lumot yo\'q', AppLocale.ru: 'Нет данных', AppLocale.en: 'No data'},
  'common.add': {AppLocale.uz: 'Qo\'shish', AppLocale.ru: 'Добавить', AppLocale.en: 'Add'},
  'common.remove': {AppLocale.uz: 'O\'chirish', AppLocale.ru: 'Удалить', AppLocale.en: 'Remove'},
  'common.notFound': {AppLocale.uz: 'Topilmadi', AppLocale.ru: 'Не найдено', AppLocale.en: 'Not found'},
  'common.notSpecified': {AppLocale.uz: 'Ko\'rsatilmagan', AppLocale.ru: 'Не указано', AppLocale.en: 'Not specified'},
  'teacher.subject': {AppLocale.uz: 'Fan', AppLocale.ru: 'Предмет', AppLocale.en: 'Subject'},

  // Sinflar
  'classes.notAssigned': {AppLocale.uz: 'Maktab biriktirilmagan', AppLocale.ru: 'Школа не привязана', AppLocale.en: 'No school assigned'},
  'classes.empty': {AppLocale.uz: 'Hozircha sinflar yo\'q', AppLocale.ru: 'Пока нет классов', AppLocale.en: 'No classes yet'},
  'classes.studentsCount': {AppLocale.uz: 'o\'quvchi', AppLocale.ru: 'учеников', AppLocale.en: 'students'},
  'classes.empty2': {AppLocale.uz: 'Bu sinfda o\'quvchi yo\'q', AppLocale.ru: 'В этом классе нет учеников', AppLocale.en: 'No students in this class'},
  'classes.attendanceLabel': {AppLocale.uz: 'Davomat: so\'ngi 30 kun', AppLocale.ru: 'Посещаемость: последние 30 дней', AppLocale.en: 'Attendance: last 30 days'},
  'classes.noAttendanceData': {AppLocale.uz: 'Davomat ma\'lumoti yo\'q', AppLocale.ru: 'Нет данных о посещаемости', AppLocale.en: 'No attendance data'},

  // Profil
  'profile.personalInfo': {AppLocale.uz: 'Shaxsiy ma\'lumotlar', AppLocale.ru: 'Личные данные', AppLocale.en: 'Personal info'},
  'profile.fullName': {AppLocale.uz: 'To\'liq ism', AppLocale.ru: 'Полное имя', AppLocale.en: 'Full name'},
  'profile.phone': {AppLocale.uz: 'Telefon raqami', AppLocale.ru: 'Номер телефона', AppLocale.en: 'Phone number'},
  'profile.yourName': {AppLocale.uz: 'Ismingiz', AppLocale.ru: 'Ваше имя', AppLocale.en: 'Your name'},
  'profile.login': {AppLocale.uz: 'Login', AppLocale.ru: 'Логин', AppLocale.en: 'Login'},
  'profile.phoneField': {AppLocale.uz: 'Telefon', AppLocale.ru: 'Телефон', AppLocale.en: 'Phone'},
  'profile.changePassword': {AppLocale.uz: 'Parolni o\'zgartirish', AppLocale.ru: 'Сменить пароль', AppLocale.en: 'Change password'},
  'profile.currentPassword': {AppLocale.uz: 'Joriy parol', AppLocale.ru: 'Текущий пароль', AppLocale.en: 'Current password'},
  'profile.newPassword': {AppLocale.uz: 'Yangi parol', AppLocale.ru: 'Новый пароль', AppLocale.en: 'New password'},
  'profile.confirmPassword': {AppLocale.uz: 'Yangi parolni tasdiqlang', AppLocale.ru: 'Подтвердите новый пароль', AppLocale.en: 'Confirm new password'},
  'profile.updatePassword': {AppLocale.uz: 'Parolni yangilash', AppLocale.ru: 'Обновить пароль', AppLocale.en: 'Update password'},
  'profile.parent': {AppLocale.uz: 'Ota-ona', AppLocale.ru: 'Родитель', AppLocale.en: 'Parent'},
  'profile.appearance': {AppLocale.uz: 'Ko\'rinish', AppLocale.ru: 'Вид', AppLocale.en: 'Appearance'},
  'profile.theme': {AppLocale.uz: 'Mavzu', AppLocale.ru: 'Тема', AppLocale.en: 'Theme'},
  'profile.themeDark': {AppLocale.uz: 'Tungi', AppLocale.ru: 'Тёмная', AppLocale.en: 'Dark'},
  'profile.themeLight': {AppLocale.uz: 'Kunduzgi', AppLocale.ru: 'Светлая', AppLocale.en: 'Light'},
  'profile.language': {AppLocale.uz: 'Til', AppLocale.ru: 'Язык', AppLocale.en: 'Language'},

  // Login
  'login.password': {AppLocale.uz: 'Parol', AppLocale.ru: 'Пароль', AppLocale.en: 'Password'},

  // Farzandlar
  'children.empty': {AppLocale.uz: 'Farzandlar topilmadi', AppLocale.ru: 'Дети не найдены', AppLocale.en: 'No children found'},
  'children.notAssigned': {AppLocale.uz: 'Sizga hali farzand biriktirilmagan', AppLocale.ru: 'К вам пока не привязан ни один ребёнок', AppLocale.en: 'No child is linked to your account yet'},
  'children.contactSchool': {
    AppLocale.uz: 'Maktab ma\'muriyatiga murojaat qiling — telefon raqamingiz farzandingiz profiliga biriktirilishi kerak.',
    AppLocale.ru: 'Обратитесь в администрацию школы — ваш номер телефона должен быть привязан к профилю ребёнка.',
    AppLocale.en: 'Please contact the school administration — your phone number needs to be linked to your child\'s profile.',
  },

  // Xabar/izoh
  'notes.addPlaceholder': {AppLocale.uz: 'Izoh qo\'shish...', AppLocale.ru: 'Добавить заметку...', AppLocale.en: 'Add a note...'},
  'notes.title': {AppLocale.uz: 'Izohlar', AppLocale.ru: 'Заметки', AppLocale.en: 'Notes'},
  'messages.replyPlaceholder': {AppLocale.uz: 'Javob yozing...', AppLocale.ru: 'Напишите ответ...', AppLocale.en: 'Write a reply...'},
  'messages.title': {AppLocale.uz: 'Xabarlar', AppLocale.ru: 'Сообщения', AppLocale.en: 'Messages'},
  'attendance.title': {AppLocale.uz: 'Davomat', AppLocale.ru: 'Посещаемость', AppLocale.en: 'Attendance'},

  // Parol formasi
  'pwd.fillAll': {AppLocale.uz: 'Barcha maydonlarni to\'ldiring', AppLocale.ru: 'Заполните все поля', AppLocale.en: 'Fill in all fields'},
  'pwd.mismatch': {AppLocale.uz: 'Yangi parollar mos kelmadi', AppLocale.ru: 'Новые пароли не совпадают', AppLocale.en: 'New passwords do not match'},
  'pwd.tooShort': {AppLocale.uz: 'Yangi parol kamida 6 belgidan iborat bo\'lishi kerak', AppLocale.ru: 'Новый пароль должен содержать не менее 6 символов', AppLocale.en: 'New password must be at least 6 characters'},
  'pwd.success': {AppLocale.uz: 'Parol muvaffaqiyatli o\'zgartirildi', AppLocale.ru: 'Пароль успешно изменён', AppLocale.en: 'Password changed successfully'},
  'pwd.wrong': {AppLocale.uz: 'Parol noto\'g\'ri', AppLocale.ru: 'Неверный пароль', AppLocale.en: 'Incorrect password'},

  // Login ekrani
  'login.pickPersona': {AppLocale.uz: 'Kim sifatida kirmoqchisiz?', AppLocale.ru: 'Как вы хотите войти?', AppLocale.en: 'How would you like to log in?'},
  'login.staff': {AppLocale.uz: 'Xodim', AppLocale.ru: 'Сотрудник', AppLocale.en: 'Staff'},
  'login.staffDesc': {AppLocale.uz: 'Direktor, mudira, o\'qituvchi', AppLocale.ru: 'Директор, завуч, учитель', AppLocale.en: 'Director, deputy, teacher'},
  'login.guardian': {AppLocale.uz: 'Ota-ona', AppLocale.ru: 'Родитель', AppLocale.en: 'Parent'},
  'login.guardianDesc': {AppLocale.uz: 'Farzandingiz davomatini kuzating', AppLocale.ru: 'Следите за посещаемостью ребёнка', AppLocale.en: 'Track your child\'s attendance'},
  'login.username': {AppLocale.uz: 'Login', AppLocale.ru: 'Логин', AppLocale.en: 'Username'},
  'login.phone': {AppLocale.uz: 'Telefon raqami', AppLocale.ru: 'Номер телефона', AppLocale.en: 'Phone number'},
  'login.firstTimeHint': {AppLocale.uz: 'Birinchi marta kirsangiz, kiritgan parolingiz yangi parolingiz sifatida saqlanadi', AppLocale.ru: 'Если вы входите впервые, введённый пароль будет сохранён как ваш новый пароль', AppLocale.en: 'On first login, the password you enter will be saved as your new password'},
  'login.back': {AppLocale.uz: 'Orqaga', AppLocale.ru: 'Назад', AppLocale.en: 'Back'},

  // Bosh sahifa (direktor)
  'dashboard.schoolStats': {AppLocale.uz: 'Maktab statistikasi', AppLocale.ru: 'Статистика школы', AppLocale.en: 'School statistics'},
  'dashboard.students': {AppLocale.uz: 'O\'quvchilar', AppLocale.ru: 'Ученики', AppLocale.en: 'Students'},
  'dashboard.teachers': {AppLocale.uz: 'O\'qituvchilar', AppLocale.ru: 'Учителя', AppLocale.en: 'Teachers'},
  'dashboard.classes': {AppLocale.uz: 'Sinflar', AppLocale.ru: 'Классы', AppLocale.en: 'Classes'},
  'dashboard.presentToday': {AppLocale.uz: 'Bugun kelganlar', AppLocale.ru: 'Присутствуют сегодня', AppLocale.en: 'Present today'},
  'dashboard.welcome': {AppLocale.uz: 'Xush kelibsiz', AppLocale.ru: 'Добро пожаловать', AppLocale.en: 'Welcome'},
  'dashboard.singleSchoolOnly': {
    AppLocale.uz: 'Maktab ma\'lumotlari faqat bitta maktabga bog\'langan rollar uchun ko\'rinadi.',
    AppLocale.ru: 'Информация о школе видна только ролям, привязанным к одной школе.',
    AppLocale.en: 'School details are only visible to roles tied to a single school.',
  },

  // O'quvchi/o'qituvchi tafsilotlari
  'detail.attendanceTab': {AppLocale.uz: 'Davomat', AppLocale.ru: 'Посещаемость', AppLocale.en: 'Attendance'},
  'detail.notesTab': {AppLocale.uz: 'Izohlar', AppLocale.ru: 'Заметки', AppLocale.en: 'Notes'},
  'detail.messagesTab': {AppLocale.uz: 'Xabarlar', AppLocale.ru: 'Сообщения', AppLocale.en: 'Messages'},
  'detail.infoTab': {AppLocale.uz: 'Ma\'lumot', AppLocale.ru: 'Информация', AppLocale.en: 'Info'},
  'detail.last30days': {AppLocale.uz: 'So\'ngi 30 kun', AppLocale.ru: 'Последние 30 дней', AppLocale.en: 'Last 30 days'},
  'detail.present': {AppLocale.uz: 'Kelgan', AppLocale.ru: 'Присутствовал', AppLocale.en: 'Present'},
  'detail.absent': {AppLocale.uz: 'Kelmagan', AppLocale.ru: 'Отсутствовал', AppLocale.en: 'Absent'},
  'detail.noEvents': {AppLocale.uz: 'Hozircha davomat hodisalari yo\'q', AppLocale.ru: 'Пока нет событий посещаемости', AppLocale.en: 'No attendance events yet'},
  'detail.noNotes': {AppLocale.uz: 'Hozircha izohlar yo\'q', AppLocale.ru: 'Пока нет заметок', AppLocale.en: 'No notes yet'},
  'detail.noMessages': {AppLocale.uz: 'Hozircha xabarlar yo\'q', AppLocale.ru: 'Пока нет сообщений', AppLocale.en: 'No messages yet'},
  'event.in': {AppLocale.uz: 'Keldi', AppLocale.ru: 'Пришёл', AppLocale.en: 'Arrived'},
  'event.out': {AppLocale.uz: 'Ketdi', AppLocale.ru: 'Ушёл', AppLocale.en: 'Left'},

  // Davomat xulosasi (child_detail_screen)
  'attendance.periodNote': {
    AppLocale.uz: 'So\'nggi {days} kunlik davr bo\'yicha, haqiqiy davomat qaydlariga asoslangan',
    AppLocale.ru: 'За последние {days} дней, на основе реальных записей посещаемости',
    AppLocale.en: 'Over the last {days} days, based on real attendance records',
  },
  'attendance.history': {AppLocale.uz: 'Davomat tarixi (so\'nggi hodisalar)', AppLocale.ru: 'История посещаемости (последние события)', AppLocale.en: 'Attendance history (recent events)'},
  'attendance.summaryExcellent': {
    AppLocale.uz: 'So\'nggi davrda davomat ajoyib — {percent}% ({days} kun kelgan)',
    AppLocale.ru: 'Посещаемость за последний период отличная — {percent}% ({days} дней присутствовал)',
    AppLocale.en: 'Attendance in the recent period is excellent — {percent}% ({days} days present)',
  },
  'attendance.summaryGood': {
    AppLocale.uz: 'So\'nggi davrda davomat yaxshi — {percent}% ({days} kun kelgan)',
    AppLocale.ru: 'Посещаемость за последний период хорошая — {percent}% ({days} дней присутствовал)',
    AppLocale.en: 'Attendance in the recent period is good — {percent}% ({days} days present)',
  },
  'attendance.summaryModerate': {
    AppLocale.uz: 'So\'nggi davrda davomat o\'rtacha — {percent}% ({days} kun kelgan)',
    AppLocale.ru: 'Посещаемость за последний период средняя — {percent}% ({days} дней присутствовал)',
    AppLocale.en: 'Attendance in the recent period is moderate — {percent}% ({days} days present)',
  },
  'attendance.summaryLow': {
    AppLocale.uz: 'So\'nggi davrda davomat past — {percent}% ({days} kun kelgan)',
    AppLocale.ru: 'Посещаемость за последний период низкая — {percent}% ({days} дней присутствовал)',
    AppLocale.en: 'Attendance in the recent period is low — {percent}% ({days} days present)',
  },
  'attendance.summaryNoAttendance': {
    AppLocale.uz: 'So\'nggi davrda hech qanday davomat qaydi yo\'q',
    AppLocale.ru: 'За последний период записей о посещаемости нет',
    AppLocale.en: 'No attendance records in the recent period',
  },
  'messages.emptyFirst': {
    AppLocale.uz: 'Hozircha xabar yo\'q — birinchi xabarni yuboring',
    AppLocale.ru: 'Пока нет сообщений — отправьте первое сообщение',
    AppLocale.en: 'No messages yet — send the first one',
  },

  // Kameralar
  'cameras.title': {AppLocale.uz: 'Kameralar', AppLocale.ru: 'Камеры', AppLocale.en: 'Cameras'},
  'cameras.online': {AppLocale.uz: 'Onlayn', AppLocale.ru: 'В сети', AppLocale.en: 'Online'},
  'cameras.offline': {AppLocale.uz: 'Oflayn', AppLocale.ru: 'Не в сети', AppLocale.en: 'Offline'},
  'cameras.maintenance': {AppLocale.uz: 'Texnik xizmatda', AppLocale.ru: 'На обслуживании', AppLocale.en: 'Maintenance'},
  'cameras.empty': {AppLocale.uz: 'Hozircha kameralar qo\'shilmagan', AppLocale.ru: 'Камеры пока не добавлены', AppLocale.en: 'No cameras added yet'},
  'cameras.onlineCount': {AppLocale.uz: 'onlayn', AppLocale.ru: 'в сети', AppLocale.en: 'online'},
  'cameras.noRoom': {AppLocale.uz: 'Xona biriktirilmagan', AppLocale.ru: 'Комната не привязана', AppLocale.en: 'No room assigned'},
  'cameras.room': {AppLocale.uz: 'Xona', AppLocale.ru: 'Комната', AppLocale.en: 'Room'},
  'cameras.status': {AppLocale.uz: 'Holat', AppLocale.ru: 'Статус', AppLocale.en: 'Status'},
  'cameras.recentEvents': {AppLocale.uz: 'So\'nggi hodisalar', AppLocale.ru: 'Последние события', AppLocale.en: 'Recent events'},
  'cameras.noEvents': {AppLocale.uz: 'Hozircha hodisalar yo\'q', AppLocale.ru: 'Пока нет событий', AppLocale.en: 'No events yet'},
  'cameras.liveNotConnected': {
    AppLocale.uz: 'Jonli video oqim ulanmagan — tizimda hozircha video-striming infratuzilmasi mavjud emas',
    AppLocale.ru: 'Прямая трансляция не подключена — в системе пока нет инфраструктуры видеотрансляции',
    AppLocale.en: 'Live stream not connected — the system doesn\'t have video-streaming infrastructure yet',
  },

  // Bosh sahifa — kengaytirilgan
  'dashboard.todayAttendance': {AppLocale.uz: 'Bugungi davomat', AppLocale.ru: 'Посещаемость сегодня', AppLocale.en: 'Today\'s attendance'},
  'dashboard.presentTodayShort': {AppLocale.uz: 'Keldi', AppLocale.ru: 'Присутствуют', AppLocale.en: 'Present'},
  'dashboard.absentTodayShort': {AppLocale.uz: 'Kelmadi', AppLocale.ru: 'Отсутствуют', AppLocale.en: 'Absent'},
  'dashboard.weeklyTrend': {AppLocale.uz: 'So\'nggi 7 kun', AppLocale.ru: 'Последние 7 дней', AppLocale.en: 'Last 7 days'},
  'dashboard.quickAccess': {AppLocale.uz: 'Tezkor kirish', AppLocale.ru: 'Быстрый доступ', AppLocale.en: 'Quick access'},
  'dashboard.devicesOnline': {AppLocale.uz: 'Qurilmalar onlayn', AppLocale.ru: 'Устройства в сети', AppLocale.en: 'Devices online'},

  // Face ID nazorati
  'faceMonitor.title': {AppLocale.uz: 'Face ID nazorati', AppLocale.ru: 'Мониторинг Face ID', AppLocale.en: 'Face ID monitoring'},
  'faceMonitor.devices': {AppLocale.uz: 'Tanish qurilmalari', AppLocale.ru: 'Устройства распознавания', AppLocale.en: 'Recognition devices'},
  'faceMonitor.noDevices': {AppLocale.uz: 'Hozircha qurilmalar ro\'yxatga olinmagan', AppLocale.ru: 'Устройства пока не зарегистрированы', AppLocale.en: 'No devices registered yet'},
  'faceMonitor.lastSeen': {AppLocale.uz: 'Oxirgi aloqa', AppLocale.ru: 'Последняя связь', AppLocale.en: 'Last seen'},
  'faceMonitor.pending': {AppLocale.uz: 'kutilmoqda', AppLocale.ru: 'в очереди', AppLocale.en: 'pending'},
  'faceMonitor.liveFeed': {AppLocale.uz: 'Bugungi tanilganlar', AppLocale.ru: 'Распознанные сегодня', AppLocale.en: 'Recognized today'},
  'faceMonitor.noEvents': {AppLocale.uz: 'Bugun hali hech kim tanilmagan', AppLocale.ru: 'Сегодня пока никто не распознан', AppLocale.en: 'No one recognized today yet'},
  'faceMonitor.temperature': {AppLocale.uz: 'Harorat', AppLocale.ru: 'Температура', AppLocale.en: 'Temperature'},
};

String tParams(String key, Map<String, String> params) {
  var s = t(key);
  params.forEach((k, v) => s = s.replaceAll('{$k}', v));
  return s;
}
