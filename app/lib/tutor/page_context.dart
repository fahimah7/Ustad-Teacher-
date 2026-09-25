import '../content/book.dart';
import '../content/fa_numbers.dart';

/// Builds the "[معلومات صفحه]" block the teacher sees for a page.
/// Output must be deterministic per page so llama.cpp can reuse its prompt cache.
String buildPageContext(Book book, PagePackage pkg, {PagePackage? prev, PagePackage? next}) {
  final lines = <String>['[معلومات صفحه]', 'کتاب: ${book.titleFa}', ..._heading(book, pkg)];
  lines.add('خلاصه: ${pkg.summaryFa}');

  if (pkg.keyPoints.isNotEmpty) {
    lines.add('نکات مهم:');
    lines.addAll(pkg.keyPoints.map((k) => '- $k'));
  }
  if (pkg.formulas.isNotEmpty) {
    lines.add('فورمول‌ها:');
    lines.addAll(pkg.formulas.map(_formula));
  }
  if (pkg.figures.isNotEmpty) {
    lines.add('شکل‌ها:');
    for (var i = 0; i < pkg.figures.length; i++) {
      lines.add('- شکل ${faNum(i + 1)}: ${pkg.figures[i]['description_fa']}');
    }
  }
  if (pkg.workedExamples.isNotEmpty) {
    lines.add('مثال‌های این صفحه (با حل):');
    for (var i = 0; i < pkg.workedExamples.length; i++) {
      final e = pkg.workedExamples[i];
      lines.add('مثال ${faNum(i + 1)} — ${e['label_fa']}: ${e['problem_fa']}');
      lines.addAll(_numbered((e['steps_fa'] as List).cast<String>()));
      if (e['answer'] != null) lines.add('  جواب: ${e['answer']}');
    }
  }
  if (pkg.exercises.isNotEmpty) {
    lines.add('تمرین‌های این صفحه (با حل):');
    for (var i = 0; i < pkg.exercises.length; i++) {
      final e = pkg.exercises[i];
      final label = '${e['label_fa']}';
      // Number exercises the way students refer to them: «تمرین ۲ (سوال دوم)».
      final name = RegExp(r'^[0-9۰-۹]').hasMatch(label) ? 'تمرین $label' : label;
      lines.add('$name (سوال ${_ordinal(i + 1)}): ${e['problem_fa']}');
      lines.addAll(_numbered((e['solution_steps_fa'] as List).cast<String>()));
      if (e['answer'] != null) lines.add('  جواب: ${e['answer']}');
    }
  }
  if (prev != null && pkg.continuesFromPrevious) lines.add('صفحهٔ قبل (خلاصه): ${prev.summaryFa}');
  if (next != null && pkg.continuesOnNext) lines.add('صفحهٔ بعد (خلاصه): ${next.summaryFa}');
  return lines.join('\n');
}

/// A short "[صفحهٔ دیگری از کتاب]" block — where a page is, what it teaches and its main formulas —
/// for pages other than the one the student is reading.
String pageDigest(Book book, PagePackage pkg) {
  final lines = <String>['[صفحهٔ دیگری از کتاب]', ..._heading(book, pkg), 'خلاصه: ${pkg.summaryFa}'];
  lines.addAll(pkg.keyPoints.take(4).map((k) => '- $k'));
  lines.addAll(pkg.formulas.take(3).map(_formula));
  return lines.join('\n');
}

List<String> _heading(Book book, PagePackage pkg) {
  final ch = book.chapter(pkg.chapter);
  return [
    if (ch != null) 'فصل ${faNum(ch.number)}: ${ch.titleFa}',
    if (pkg.sectionFa != null) 'بخش: ${pkg.sectionFa}',
    if (pkg.printedPage != null) 'صفحهٔ ${faNum(pkg.printedPage!)} کتاب',
  ];
}

String _formula(Map<String, dynamic> f) => '- \$${f['latex']}\$ — ${f['meaning_fa'] ?? ''}';

const _ordinals = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];

String _ordinal(int n) => n <= _ordinals.length ? _ordinals[n - 1] : faNum(n);

Iterable<String> _numbered(List<String> steps) sync* {
  for (var i = 0; i < steps.length; i++) {
    yield '  ${faNum(i + 1)}) ${steps[i]}';
  }
}
