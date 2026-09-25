/// Demo rejimi uchun mock ma'lumotlar — haqiqiy backend ulanmasdan ishlatiladi.
library mock_data;

import '../models/models.dart';

class MockData {
  // Director profile mock
  static const Map<String, dynamic> directorProfile = {
    'id': 1,
    'fullName': 'Jasurbek Karimov',
    'username': 'direktor1',
    'role': 'DIRECTOR',
    'schoolId': 1,
    'phone': '+998901234567',
  };

  // Parent profile mock
  static const Map<String, dynamic> parentProfile = {
    'id': 101,
    'fullName': 'Nodira Rahimova',
    'phone': '+998901112233',
    'role': 'GUARDIAN',
  };

  static final Map<String, dynamic> school = {
    'id': 1,
    'name': '45-umumta\'lim maktabi',
    'districtName': 'Andijon tumani',
    'provinceName': 'Andijon viloyati',
    'studentCount': 450,
    'classCount': 16,
  };

  static final AttendanceOverview attendanceOverview = AttendanceOverview(
    totalStudents: 450,
    presentToday: 432,
    absentToday: 18,
    totalDevices: 4,
    onlineDevices: 3,
    weeklyPresent: [415, 428, 421, 440, 432, 0, 0], // last 7 days, 0 for weekend
  );

  static final List<Student> students = [
    Student(id: 1, fullName: 'Aziz Karimov', className: '5-B sinf', birthDate: '2013-05-12'),
    Student(id: 2, fullName: 'Malika Tosheva', className: '3-A sinf', birthDate: '2015-03-22'),
    Student(id: 3, fullName: 'Sardor Rahimov', className: '7-V sinf', birthDate: '2011-08-05'),
    Student(id: 4, fullName: 'Zilola Yusupova', className: '2-B sinf', birthDate: '2016-11-30'),
    Student(id: 5, fullName: 'Bobur Hasanov', className: '9-A sinf', birthDate: '2009-01-17'),
    Student(id: 6, fullName: 'Shahlo Norova', className: '4-A sinf', birthDate: '2014-07-08'),
    Student(id: 7, fullName: 'Ulugbek Mirzayev', className: '6-B sinf', birthDate: '2012-09-14'),
    Student(id: 8, fullName: 'Dildora Saidova', className: '1-A sinf', birthDate: '2017-02-28'),
    Student(id: 9, fullName: 'Jasur Qodirov', className: '8-B sinf', birthDate: '2010-06-03'),
    Student(id: 10, fullName: 'Nozima Ergasheva', className: '5-A sinf', birthDate: '2013-12-19'),
    Student(id: 11, fullName: 'Sherzod Mamatov', className: '7-A sinf', birthDate: '2011-04-25'),
    Student(id: 12, fullName: 'Feruza Olimova', className: '3-B sinf', birthDate: '2015-10-11'),
  ];

  static final List<SchoolClassRoom> classes = [
    SchoolClassRoom(id: 1, name: '1-A', grade: 1, teacherName: 'Nilufar Qodirova', studentCount: 28),
    SchoolClassRoom(id: 2, name: '1-B', grade: 1, teacherName: 'Muhabbat Tursunova', studentCount: 30),
    SchoolClassRoom(id: 3, name: '2-A', grade: 2, teacherName: 'Sarvinoz Xoliqova', studentCount: 29),
    SchoolClassRoom(id: 4, name: '2-B', grade: 2, teacherName: 'Gavhar Ismoilova', studentCount: 27),
    SchoolClassRoom(id: 5, name: '3-A', grade: 3, teacherName: 'Zulfiya Nazarova', studentCount: 31),
    SchoolClassRoom(id: 6, name: '3-B', grade: 3, teacherName: 'Hulkar Mirzayeva', studentCount: 28),
    SchoolClassRoom(id: 7, name: '4-A', grade: 4, teacherName: 'Dilorom Yusupova', studentCount: 30),
    SchoolClassRoom(id: 8, name: '5-A', grade: 5, teacherName: 'Kamola Hasanova', studentCount: 32),
    SchoolClassRoom(id: 9, name: '5-B', grade: 5, teacherName: 'Barno Rahimova', studentCount: 30),
    SchoolClassRoom(id: 10, name: '6-A', grade: 6, teacherName: 'Nasiba Sobirov', studentCount: 28),
    SchoolClassRoom(id: 11, name: '7-A', grade: 7, teacherName: 'Ozoda Toshmatova', studentCount: 29),
    SchoolClassRoom(id: 12, name: '7-V', grade: 7, teacherName: 'Muazzam Qosimova', studentCount: 27),
    SchoolClassRoom(id: 13, name: '8-B', grade: 8, teacherName: 'Robiya Aliyeva', studentCount: 31),
    SchoolClassRoom(id: 14, name: '9-A', grade: 9, teacherName: 'Sitora Hamidova', studentCount: 30),
    SchoolClassRoom(id: 15, name: '10-A', grade: 10, teacherName: 'Madinabonu Xoliqova', studentCount: 26),
    SchoolClassRoom(id: 16, name: '11-A', grade: 11, teacherName: 'Feruza Abdullayeva', studentCount: 24),
  ];

  static final List<TeacherSummary> teachers = [
    TeacherSummary(id: 1, fullName: 'Nilufar Qodirova', phone: '+998901234001', subject: 'Ona tili', username: 'nilufar_q'),
    TeacherSummary(id: 2, fullName: 'Muhabbat Tursunova', phone: '+998901234002', subject: 'Matematika', username: 'muhabbat_t'),
    TeacherSummary(id: 3, fullName: 'Sarvinoz Xoliqova', phone: '+998901234003', subject: 'Ingliz tili', username: 'sarvinoz_x'),
    TeacherSummary(id: 4, fullName: 'Zulfiya Nazarova', phone: '+998901234004', subject: 'Fizika', username: 'zulfiya_n'),
    TeacherSummary(id: 5, fullName: 'Kamola Hasanova', phone: '+998901234005', subject: 'Kimyo', username: 'kamola_h'),
    TeacherSummary(id: 6, fullName: 'Barno Rahimova', phone: '+998901234006', subject: 'Biologiya', username: 'barno_r'),
    TeacherSummary(id: 7, fullName: 'Nasiba Sobirov', phone: '+998901234007', subject: 'Tarix', username: 'nasiba_s'),
    TeacherSummary(id: 8, fullName: 'Ozoda Toshmatova', phone: '+998901234008', subject: 'Geografiya', username: 'ozoda_t'),
  ];

  static List<AttendanceEvent> studentAttendance(int studentId) {
    final now = DateTime.now();
    final events = <AttendanceEvent>[];
    var id = 1;
    for (var i = 29; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      if (date.weekday == DateTime.sunday) continue;
      // 90% chance of attendance
      if (i % 10 == 3) continue; // skip some days to simulate absences
      events.add(AttendanceEvent(
        id: id++,
        timestamp: DateTime(date.year, date.month, date.day, 7, 42 + (id % 10)),
        type: 'IN',
      ));
      events.add(AttendanceEvent(
        id: id++,
        timestamp: DateTime(date.year, date.month, date.day, 13, 25 + (id % 15)),
        type: 'OUT',
      ));
    }
    return events;
  }

  static final List<RecognitionDevice> devices = [
    RecognitionDevice(id: 1, deviceSerial: 'DS-K1T671MF-001', deviceName: 'Asosiy eshik', ipAddress: '10.30.1.51', lastSeen: DateTime.now().subtract(const Duration(minutes: 2)).toIso8601String(), online: true, pendingEvents: 3),
    RecognitionDevice(id: 2, deviceSerial: 'DS-K1T671MF-002', deviceName: 'Orqa eshik', ipAddress: '10.30.1.52', lastSeen: DateTime.now().subtract(const Duration(minutes: 1)).toIso8601String(), online: true, pendingEvents: 0),
    RecognitionDevice(id: 3, deviceSerial: 'DS-K1T671MF-003', deviceName: 'Sporzal kirish', ipAddress: '10.30.1.53', lastSeen: DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(), online: false, pendingEvents: 0),
  ];

  static List<RecognitionEvent> recognitionFeed() {
    final now = DateTime.now();
    return [
      for (var i = 0; i < students.length; i++)
        RecognitionEvent(
          id: i + 1,
          studentId: students[i].id,
          studentName: students[i].fullName,
          timestamp: now.subtract(Duration(minutes: i * 3 + 1)),
          type: i % 5 == 4 ? 'OUT' : 'IN',
          temperature: 36.2 + (i % 5) * 0.1,
          deviceSerial: i % 3 == 0 ? 'DS-K1T671MF-001' : 'DS-K1T671MF-002',
        ),
    ];
  }

  static final List<CameraInfo> cameras = [
    CameraInfo(id: 1, name: 'Asosiy kirish', roomNumber: '1', roomName: '1-qavat koridor', status: 'ONLINE', eventCount: 245),
    CameraInfo(id: 2, name: 'Maktab hovlisi', roomNumber: '2', roomName: 'Tashqi hudud', status: 'ONLINE', eventCount: 189),
    CameraInfo(id: 3, name: '2-qavat koridor', roomNumber: '3', roomName: '2-qavat', status: 'OFFLINE', eventCount: 0),
    CameraInfo(id: 4, name: 'Sport zali', roomNumber: '4', roomName: 'Sport zali', status: 'MAINTENANCE', eventCount: 12),
  ];

  // Parent's children
  static final List<Student> parentChildren = [
    Student(id: 1, fullName: 'Aziz Rahimov', className: '5-B sinf', schoolName: '45-maktab', birthDate: '2013-05-12'),
    Student(id: 3, fullName: 'Malika Rahimova', className: '3-A sinf', schoolName: '45-maktab', birthDate: '2015-09-20'),
  ];

  static List<AttendanceEvent> childAttendanceToday(int childId) {
    final now = DateTime.now();
    if (childId == 1) {
      return [
        AttendanceEvent(id: 1, timestamp: DateTime(now.year, now.month, now.day, 7, 45), type: 'IN'),
      ];
    }
    return []; // second child absent today
  }

  // Absence requests mock (mutable — add/update in demo mode)
  static List<AbsenceRequest> absenceRequests = [
    AbsenceRequest(
      id: 1, studentId: 1, studentName: 'Aziz Rahimov', className: '5-B',
      startDate: '2026-09-24', endDate: '2026-09-25',
      reasonType: 'ILLNESS', reasonText: 'Bolam grip bilan kasal bo\'lib qoldi',
      status: 'PENDING', createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    AbsenceRequest(
      id: 2, studentId: 3, studentName: 'Malika Rahimova', className: '3-A',
      startDate: '2026-09-20', endDate: '2026-09-21',
      reasonType: 'FAMILY', reasonText: 'Oilaviy bayram',
      status: 'APPROVED', reviewNote: 'Tasdiqlandi', reviewedBy: 'Direktor J.Karimov',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    AbsenceRequest(
      id: 3, studentId: 1, studentName: 'Aziz Rahimov', className: '5-B',
      startDate: '2026-09-10', endDate: '2026-09-10',
      reasonType: 'OTHER', reasonText: 'Tibbiy ko\'rik',
      status: 'REJECTED', reviewNote: 'Ma\'lumotnoma talab etiladi',
      reviewedBy: 'Direktor J.Karimov',
      createdAt: DateTime.now().subtract(const Duration(days: 14)),
    ),
  ];

  // All school absence requests for director
  static List<AbsenceRequest> allAbsenceRequests = [
    AbsenceRequest(
      id: 1, studentId: 1, studentName: 'Aziz Rahimov', className: '5-B',
      startDate: '2026-09-24', endDate: '2026-09-25',
      reasonType: 'ILLNESS', reasonText: 'Bolam grip bilan kasal',
      status: 'PENDING', createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    AbsenceRequest(
      id: 4, studentId: 5, studentName: 'Bobur Hasanov', className: '9-A',
      startDate: '2026-09-24', endDate: '2026-09-24',
      reasonType: 'FAMILY', reasonText: 'Oilaviy sabab',
      status: 'PENDING', createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    ),
    AbsenceRequest(
      id: 2, studentId: 3, studentName: 'Malika Tosheva', className: '3-A',
      startDate: '2026-09-20', endDate: '2026-09-21',
      reasonType: 'ILLNESS',
      status: 'APPROVED', reviewNote: 'Tasdiqlandi',
      reviewedBy: 'J.Karimov', createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    AbsenceRequest(
      id: 3, studentId: 6, studentName: 'Shahlo Norova', className: '4-A',
      startDate: '2026-09-15', endDate: '2026-09-15',
      reasonType: 'OTHER',
      status: 'REJECTED', reviewNote: 'Ma\'lumotnoma talab etiladi',
      reviewedBy: 'J.Karimov', createdAt: DateTime.now().subtract(const Duration(days: 10)),
    ),
  ];

  static List<PersonNoteEntry> studentNotes(int studentId) => [
    PersonNoteEntry(id: 1, authorName: 'N.Qodirova', text: 'Faol o\'quvchi, darsda ishtiroki yaxshi.', createdAt: DateTime.now().subtract(const Duration(days: 3))),
    PersonNoteEntry(id: 2, authorName: 'J.Karimov', text: 'Matematika olimpiadasiga tavsiya etildi.', createdAt: DateTime.now().subtract(const Duration(days: 7))),
  ];

  static List<ChatMessage> studentMessages(int studentId) => [
    ChatMessage(id: 1, senderType: 'STAFF', senderName: 'N.Qodirova', text: 'Salom! Farzandingiz bugun darsda juda faol edi.', createdAt: DateTime.now().subtract(const Duration(hours: 3))),
    ChatMessage(id: 2, senderType: 'GUARDIAN', senderName: 'Ota-ona', text: 'Rahmat! Juda xursand bo\'ldik.', createdAt: DateTime.now().subtract(const Duration(hours: 2))),
    ChatMessage(id: 3, senderType: 'STAFF', senderName: 'N.Qodirova', text: 'Ertaga test bo\'ladi, tayyorlansin.', createdAt: DateTime.now().subtract(const Duration(hours: 1))),
  ];
}
