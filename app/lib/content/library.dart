import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

const _gradeNames = {
  1: 'اول', 2: 'دوم', 3: 'سوم', 4: 'چهارم', 5: 'پنجم', 6: 'ششم',
  7: 'هفتم', 8: 'هشتم', 9: 'نهم', 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم',
};

/// "صنف دوازدهم" for 12.
String gradeNameFa(int grade) => 'صنف ${_gradeNames[grade] ?? grade}';

/// A book that is ready to study (listed on the book-choice screen).
class BookInfo {
  const BookInfo({
    required this.id,
    required this.dir,
    required this.grade,
    required this.titleFa,
    required this.subjectFa,
    this.subject,
  });

  final String id;
  final String dir;
  final int grade;
  final String titleFa;
  final String subjectFa;
  final String? subject;
}

/// Books under [contentDir] that are ready to study: their book.json has a grade, a title and
/// chapters. Books still being prepared (e.g. only rendered pages) are skipped.
Future<List<BookInfo>> discoverBooks(String contentDir) async {
  final books = <BookInfo>[];
  final root = Directory(contentDir);
  if (!await root.exists()) return books;
  await for (final entry in root.list()) {
    if (entry is! Directory) continue;
    final file = File(p.join(entry.path, 'book.json'));
    if (!await file.exists()) continue;
    try {
      final j = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      if (j['grade'] is! int || j['title_fa'] is! String || (j['chapters'] as List? ?? const []).isEmpty) continue;
      books.add(BookInfo(
        id: j['book_id'] as String,
        dir: entry.path,
        grade: j['grade'] as int,
        titleFa: j['title_fa'] as String,
        subjectFa: j['subject_fa'] as String? ?? j['title_fa'] as String,
        subject: j['subject'] as String?,
      ));
    } catch (_) {
      // A half-written book.json must not break the library.
    }
  }
  books.sort((a, b) => a.grade != b.grade ? a.grade.compareTo(b.grade) : a.subjectFa.compareTo(b.subjectFa));
  return books;
}
