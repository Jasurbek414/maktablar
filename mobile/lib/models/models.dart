/// Barcha oddiy ma'lumot modellari — backend JSON kontraktiga to'g'ridan-to'g'ri mos
/// (veb-ilova services/api.js qaytaradigan xaritalar bilan bir xil maydon nomlari).
library models;

class Student {
  final int id;
  final String fullName;
  final String? photoUrl;
  final String? faceId;
  final String? className;
  final String? schoolName;
  final String? birthDate;

  Student({
    required this.id,
    required this.fullName,
    this.photoUrl,
    this.faceId,
    this.className,
    this.schoolName,
    this.birthDate,
  });

  factory Student.fromJson(Map<String, dynamic> j) => Student(
        id: j['id'] as int,
        fullName: j['fullName'] as String? ?? '',
        photoUrl: j['photoUrl'] as String?,
        faceId: j['faceId'] as String?,
        className: j['className'] as String?,
        schoolName: j['schoolName'] as String?,
        birthDate: j['birthDate'] as String?,
      );
}

class AttendanceEvent {
  final int id;
  final DateTime timestamp;
  final String type; // "IN" | "OUT"

  AttendanceEvent({required this.id, required this.timestamp, required this.type});

  factory AttendanceEvent.fromJson(Map<String, dynamic> j) => AttendanceEvent(
        id: j['id'] as int,
        timestamp: DateTime.parse(j['timestamp'] as String),
        type: j['type'] as String? ?? 'IN',
      );
}

class PersonNoteEntry {
  final int id;
  final String authorName;
  final String text;
  final DateTime createdAt;

  PersonNoteEntry({required this.id, required this.authorName, required this.text, required this.createdAt});

  factory PersonNoteEntry.fromJson(Map<String, dynamic> j) => PersonNoteEntry(
        id: j['id'] as int,
        authorName: j['authorName'] as String? ?? '',
        text: j['text'] as String? ?? '',
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class ChatMessage {
  final int id;
  final String senderType; // "GUARDIAN" | "STAFF"
  final String senderName;
  final String text;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.senderType,
    required this.senderName,
    required this.text,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'] as int,
        senderType: j['senderType'] as String? ?? 'STAFF',
        senderName: j['senderName'] as String? ?? '',
        text: j['text'] as String? ?? '',
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class TeacherSummary {
  final int id;
  final String fullName;
  final String? phone;
  final String? subject;
  final String username;

  TeacherSummary({
    required this.id,
    required this.fullName,
    this.phone,
    this.subject,
    required this.username,
  });

  factory TeacherSummary.fromJson(Map<String, dynamic> j) => TeacherSummary(
        id: j['id'] as int,
        fullName: j['fullName'] as String? ?? '',
        phone: j['phone'] as String?,
        subject: j['subject'] as String?,
        username: j['username'] as String? ?? '',
      );
}

class AttendanceOverview {
  final int totalStudents;
  final int presentToday;
  final int absentToday;
  final int totalDevices;
  final int onlineDevices;
  final List<int> weeklyPresent;

  AttendanceOverview({
    required this.totalStudents,
    required this.presentToday,
    required this.absentToday,
    required this.totalDevices,
    required this.onlineDevices,
    required this.weeklyPresent,
  });

  factory AttendanceOverview.fromJson(Map<String, dynamic> j) {
    final weekly = (j['weeklyPresent'] as List?) ?? const [];
    return AttendanceOverview(
      totalStudents: (j['totalStudents'] as num?)?.toInt() ?? 0,
      presentToday: (j['presentToday'] as num?)?.toInt() ?? 0,
      absentToday: (j['absentToday'] as num?)?.toInt() ?? 0,
      totalDevices: (j['totalDevices'] as num?)?.toInt() ?? 0,
      onlineDevices: (j['onlineDevices'] as num?)?.toInt() ?? 0,
      weeklyPresent: weekly.map((e) {
        if (e is num) return e.toInt();
        if (e is Map) return ((e['count'] ?? e['present'] ?? 0) as num).toInt();
        return 0;
      }).toList(),
    );
  }
}

class CameraInfo {
  final int id;
  final String name;
  final String? roomNumber;
  final String? roomName;
  final String status; // ONLINE | OFFLINE | MAINTENANCE
  final int eventCount;

  CameraInfo({
    required this.id,
    required this.name,
    this.roomNumber,
    this.roomName,
    required this.status,
    required this.eventCount,
  });

  factory CameraInfo.fromJson(Map<String, dynamic> j) => CameraInfo(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        roomNumber: j['roomNumber'] as String?,
        roomName: j['roomName'] as String?,
        status: j['status'] as String? ?? 'OFFLINE',
        eventCount: (j['eventCount'] as num?)?.toInt() ?? 0,
      );
}

class CameraEvent {
  final int id;
  final String type;
  final String? description;
  final DateTime occurredAt;

  CameraEvent({required this.id, required this.type, this.description, required this.occurredAt});

  factory CameraEvent.fromJson(Map<String, dynamic> j) => CameraEvent(
        id: j['id'] as int,
        type: j['type'] as String? ?? '',
        description: j['description'] as String?,
        occurredAt: DateTime.parse(j['occurredAt'] as String),
      );
}

class RecognitionDevice {
  final int id;
  final String deviceSerial;
  final String? deviceName;
  final String? ipAddress;
  final String? lastSeen;
  final bool online;
  final int pendingEvents;

  RecognitionDevice({
    required this.id,
    required this.deviceSerial,
    this.deviceName,
    this.ipAddress,
    this.lastSeen,
    required this.online,
    required this.pendingEvents,
  });

  factory RecognitionDevice.fromJson(Map<String, dynamic> j) => RecognitionDevice(
        id: j['id'] as int,
        deviceSerial: j['deviceSerial'] as String? ?? '',
        deviceName: j['deviceName'] as String?,
        ipAddress: j['ipAddress'] as String?,
        lastSeen: j['lastSeen'] as String?,
        online: j['online'] as bool? ?? false,
        pendingEvents: (j['pendingEvents'] as num?)?.toInt() ?? 0,
      );
}

class RecognitionEvent {
  final int id;
  final int studentId;
  final String studentName;
  final String? studentPhoto;
  final String? faceId;
  final DateTime timestamp;
  final String type; // IN | OUT
  final double? temperature;
  final String? deviceSerial;

  RecognitionEvent({
    required this.id,
    required this.studentId,
    required this.studentName,
    this.studentPhoto,
    this.faceId,
    required this.timestamp,
    required this.type,
    this.temperature,
    this.deviceSerial,
  });

  factory RecognitionEvent.fromJson(Map<String, dynamic> j) => RecognitionEvent(
        id: j['id'] as int,
        studentId: j['studentId'] as int,
        studentName: j['studentName'] as String? ?? '',
        studentPhoto: j['studentPhoto'] as String?,
        faceId: j['faceId'] as String?,
        timestamp: DateTime.parse(j['timestamp'] as String),
        type: j['type'] as String? ?? 'IN',
        temperature: (j['temperature'] as num?)?.toDouble(),
        deviceSerial: j['deviceSerial'] as String?,
      );
}

class SchoolClassRoom {
  final int id;
  final String name;
  final int? grade;
  final String? teacherName;
  final int studentCount;

  SchoolClassRoom({
    required this.id,
    required this.name,
    this.grade,
    this.teacherName,
    required this.studentCount,
  });

  factory SchoolClassRoom.fromJson(Map<String, dynamic> j) => SchoolClassRoom(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        grade: j['grade'] as int?,
        teacherName: j['teacherName'] as String?,
        studentCount: (j['studentCount'] as num?)?.toInt() ?? 0,
      );
}
