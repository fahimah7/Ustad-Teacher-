import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:offline_school/content/book.dart';
import 'package:offline_school/content/fa_numbers.dart';
import 'package:offline_school/tutor/page_context.dart';
import 'package:offline_school/ui/math_text.dart';

import 'fixture_book.dart';

void main() {
  test('faNum writes Dari digits', () {
    expect(faNum(137), '۱۳۷');
    expect(faNum(0), '۰');
  });

  test('parseFaInt accepts Dari, Arabic and Latin digits', () {
    expect(parseFaInt('۱۳۷'), 137);
    expect(parseFaInt('١٣٧'), 137);
    expect(parseFaInt(' 42 '), 42);
    expect(parseFaInt('abc'), isNull);
  });

  test('cleanMarkdown drops bold markers and turns list dashes into bullets', () {
    expect(MathText.cleanMarkdown('**مهم**\n- اول\n* دوم'), 'مهم\n• اول\n• دوم');
    expect(MathText.cleanMarkdown(r'$a - b$'), r'$a - b$');
  });

  group('book + page context', () {
    late Directory dir;
    late Book book;

    setUpAll(() async => (dir, book) = await createFixtureBook());
    tearDownAll(() => dir.delete(recursive: true));

    test('maps printed pages to PDF pages, inferring pages without a number from the offset', () {
      expect(book.pdfPageForPrinted(4), 3);
      expect(book.pdfPageForPrinted(2), 1); // page 1 has no printed number
    });

    test('context carries chapter, printed page, formulas, exercises and the next page', () {
      final ctx = buildPageContext(book, book.cachedPackage(3)!,
          prev: book.cachedPackage(2), next: book.cachedPackage(4));
      expect(ctx, contains('فصل ۱: لیمت'));
      expect(ctx, contains('صفحهٔ ۴ کتاب'));
      expect(ctx, contains(r'$\Delta x = \frac{b-a}{n}$'));
      expect(ctx, contains('تمرین ۱ (سوال اول):'));
      expect(ctx, contains('صفحهٔ بعد (خلاصه)'));
      expect(ctx, isNot(contains('صفحهٔ قبل'))); // page 3 doesn't continue from page 2
    });

    test('digest of another page is short: heading, summary and formulas, no exercises', () {
      final digest = pageDigest(book, book.cachedPackage(5)!);
      expect(digest, startsWith('[صفحهٔ دیگری از کتاب]'));
      expect(digest, contains('صفحهٔ ۶ کتاب'));
      expect(digest, isNot(contains('تمرین')));
    });
  });

  testWidgets('MathText renders Dari text around inline math', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: MathText(r'عرض هر مستطیل $\Delta x = \frac{1}{2}$ است.')),
    ));
    expect(tester.takeException(), isNull);
    expect(find.byType(RichText), findsWidgets);
  });
}
