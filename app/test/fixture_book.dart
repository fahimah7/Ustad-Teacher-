import 'dart:convert';
import 'dart:io';

import 'package:offline_school/content/book.dart';
import 'package:path/path.dart' as p;

/// A six-page book on disk for tests. Pages:
/// 1 chapter title (ch 1) · 2 «مفهوم لیمت» (printed 3) · 3 «لیمت توابع نسبتی» (4) ·
/// 4 exercises, same section (5) · 5 «قضیهٔ رول» in ch 3 (6) · 6 «انتیگرال‌گیری قسمی» in ch 4 (7).
/// Pass [parent] to create the book as `<parent>/test-book` (a content folder); otherwise a temp dir.
Future<(Directory, Book)> createFixtureBook({Directory? parent}) async {
  final dir = parent == null
      ? await Directory.systemTemp.createTemp('book_test')
      : await Directory(p.join(parent.path, 'test-book')).create();
  await Directory(p.join(dir.path, 'packages')).create();
  await File(p.join(dir.path, 'book.json')).writeAsString(jsonEncode({
    'book_id': 'test-book',
    'title_fa': 'ریاضی صنف دوازدهم',
    'grade': 12,
    'subject': 'math',
    'subject_fa': 'ریاضی',
    'page_count': 6,
    'pages': [for (var i = 1; i <= 6; i++) {'pdf_page': i, 'image': 'pages/000$i.jpg'}],
    'chapters': [
      {'number': 1, 'title_fa': 'لیمت', 'printed_start': 2, 'printed_end': 5},
      {'number': 3, 'title_fa': 'موارد استعمال مشتق', 'printed_start': 6, 'printed_end': 6},
      {'number': 4, 'title_fa': 'انتیگرال‌ها', 'printed_start': 7, 'printed_end': 7},
    ],
  }));

  Map<String, dynamic> pkg(int pdf, int? printed, int chapter, String kind, String? section, String summary,
          {List<Map<String, String>> terms = const [], bool next = false}) =>
      {
        'pdf_page': pdf,
        'printed_page': printed,
        'page_kind': kind,
        'chapter': chapter,
        'section_fa': section,
        'summary_fa': summary,
        'key_points_fa': <String>[],
        'formulas': [
          {'latex': r'\Delta x = \frac{b-a}{n}', 'meaning_fa': 'عرض مستطیل'}
        ],
        'terms': terms,
        'figures': [],
        'worked_examples': [],
        'exercises': [
          {'label_fa': '۱', 'problem_fa': r'$1+1$', 'solution_steps_fa': ['جمع'], 'answer': '۲'}
        ],
        'continues_from_previous': false,
        'continues_on_next': next,
      };

  final pages = [
    pkg(1, null, 1, 'chapter_title', null, 'آغاز فصل لیمت'),
    pkg(2, 3, 1, 'content', 'مفهوم لیمت', 'لیمت عددی است که جمله‌های یک ترادف به آن نزدیک می‌شوند.',
        terms: [{'fa': 'لیمت', 'en': 'limit'}, {'fa': 'ترادف', 'en': 'sequence'}]),
    pkg(3, 4, 1, 'content', 'لیمت توابع نسبتی', 'لیمت تابع نسبتی با مقایسهٔ درجهٔ صورت و مخرج.', next: true),
    pkg(4, 5, 1, 'exercises', 'لیمت توابع نسبتی', 'تمرین‌های لیمت توابع نسبتی در بی‌نهایت.'),
    pkg(5, 6, 3, 'content', 'قضیهٔ رول', 'قضیهٔ رول می‌گوید اگر قیمت تابع در دو سر انتروال مساوی باشد، مشتق در نقطه‌ای صفر است.',
        terms: [{'fa': 'قضیهٔ رول', 'en': "Rolle's theorem"}]),
    pkg(6, 7, 4, 'content', 'انتیگرال‌گیری به طریقهٔ قسمی', 'انتیگرال حاصل ضرب دو تابع با فورمول انتیگرال‌گیری قسمی حساب می‌شود.',
        terms: [{'fa': 'انتیگرال‌گیری قسمی', 'en': 'integration by parts'}]),
  ];
  for (final page in pages) {
    final name = '${(page['pdf_page'] as int).toString().padLeft(4, '0')}.json';
    await File(p.join(dir.path, 'packages', name)).writeAsString(jsonEncode(page));
  }
  final book = await Book.load(dir.path);
  await book.preloadPackages();
  return (dir, book);
}
