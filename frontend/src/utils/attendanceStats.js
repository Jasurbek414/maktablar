// Haqiqiy /api/attendance/student/{id} hodisalaridan (IN/OUT) statistikani hisoblaydi.
// MUHIM: "kechikish" (late) tushunchasi backendda yo'q (maktab boshlanish vaqti schema'da
// mavjud emas — V1ReportsController bilan bir xil qoida), shuning uchun bu yerda ham
// hech qanday "late" son o'ylab topilmaydi — faqat mavjud IN/OUT hodisalaridan kelib
// chiqadigan haqiqiy sonlar qaytariladi.

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

// Dushanba-Shanba maktab kuni deb hisoblanadi (Yakshanba dam olish kuni), boshqa joylarda
// (V1ReportsController haftalik hisobot) ishlatilgan konventsiyaga mos.
function isSchoolDay(d) {
  return d.getDay() !== 0;
}

export function computeAttendanceStats(events, days = 30) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const presentDates = new Set();
  for (const ev of events || []) {
    if (ev.type !== 'IN') continue;
    const ts = new Date(ev.timestamp);
    if (ts < from || ts > now) continue;
    presentDates.add(dateKey(ts));
  }

  let schoolDays = 0;
  for (let d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) {
    if (isSchoolDay(d)) schoolDays++;
  }

  const presentDays = presentDates.size;
  const absentDays = Math.max(0, schoolDays - presentDays);
  const percent = schoolDays > 0 ? Math.round((presentDays / schoolDays) * 100) : 0;

  return { presentDays, absentDays, schoolDays, percent, periodDays: days };
}

// Faqat haqiqiy sonlardan tuzilgan qisqa xulosa jumlasi — shaxsiyat/psixologik
// bahо EMAS, faqat davomat foizi va kunlar sonini tavsiflaydi.
export function attendanceSummaryKey(stats) {
  if (stats.schoolDays === 0) return 'noData';
  if (stats.presentDays === 0) return 'noAttendance';
  if (stats.percent >= 90) return 'excellent';
  if (stats.percent >= 75) return 'good';
  if (stats.percent >= 50) return 'moderate';
  return 'low';
}
