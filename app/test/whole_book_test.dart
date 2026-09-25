import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:offline_school/content/book.dart';
import 'package:offline_school/content/outline.dart';
import 'package:offline_school/tutor/book_search.dart';
import 'package:offline_school/tutor/dari_terms.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';

import 'fixture_book.dart';

void main() {
  group('Dari terms', () {
    test('replaces Iranian terms, keeping suffixes', () {
      expect(toBookDari('این فرمول‌ها و اطلاعات'), 'این فورمول‌ها و معلومات');
      expect(toBookDari('انتگرال‌گیری و دنباله'), 'انتیگرال‌گیری و ترادف');
      expect(toBookDari('حد تابع و تابع گویا'), 'لیمت تابع و تابع نسبتی');
    });

    test('leaves ordinary Dari words alone', () {
      expect(toBookDari('تا حدی درست است'), 'تا حدی درست است');
      expect(toBookDari('واحد و فورمول'), 'واحد و فورمول');
      expect(toBookDari('فضای نمونهٔ پیوسته'), 'فضای نمونهٔ پیوسته'); // chapter 8 uses پیوسته
    });

    test('reports which Iranian terms were used', () {
      expect(iranianTermsIn('فرمول و بازه و لیمت'), {'فرمول', 'بازه'});
    });
  });

  group('search text', () {
    test('folds letter variants, digits and ZWNJ', () {
      expect(normalizeForSearch('كتاب'), 'کتاب');
      expect(normalizeForSearch('۱۲'), '12');
      expect(normalizeForSearch('انتیگرال‌ها'), 'انتیگرال ها');
    });

    test('drops stopwords, page words and numbers', () {
      expect(tokenize('انتیگرال‌ها در صفحهٔ ۱۲'), ['انتیگرال']);
      expect(tokenize('این صفحه را ساده توضیح بدهید'), isEmpty);
    });
  });

  group('whole book', () {
    late Directory dir;
    late Book book;
    late PromptBuilder builder;

    setUpAll(() async {
      (dir, book) = await createFixtureBook();
      builder = PromptBuilder(book: book, systemPrompt: 'قواعد');
    });
    tearDownAll(() => dir.delete(recursive: true));

    test('outline lists chapters and de-duplicated sections with printed pages', () {
      final outline = buildOutline(book);
      expect(outline.map((c) => c.chapter.number), [1, 3, 4]);
      expect(outline.first.sections.map((s) => s.title), ['مفهوم لیمت', 'لیمت توابع نسبتی']);
      expect(outlineText(book, outline), contains('- قضیهٔ رول (صفحهٔ ۶)'));
    });

    test('search finds the page that teaches a topic', () {
      expect(builder.search.search('قضیه رول چیست؟').first.pdfPage, 5);
      expect(builder.search.search('انتیگرال‌گیری قسمی').first.pdfPage, 6);
    });

    test('questions about another part of the book pull in that page', () {
      final turn = builder.build(pdfPage: 2, question: 'قضیهٔ رول چه می‌گوید؟');
      expect(turn.sourcePages, [5]);
      expect(turn.messages.last.content, contains('[صفحهٔ دیگری از کتاب]'));
      expect(turn.messages.last.content, endsWith('[سوال شاگرد در صفحهٔ ۳ کتاب]\nقضیهٔ رول چه می‌گوید؟'));
    });

    test('every question carries the open page\'s notes and names the page', () {
      final question = builder.build(pdfPage: 6, question: 'این صفحه در بارهٔ چیست؟').messages.last.content;
      expect(question, startsWith('[معلومات صفحه]'));
      expect(question, contains('تمرین ۱ (سوال اول):'));
      expect(question, endsWith('[سوال شاگرد در صفحهٔ ۷ کتاب]\nاین صفحه در بارهٔ چیست؟'));
      expect(builder.build(pdfPage: 1, question: 'x').messages.last.content, contains('[سوال شاگرد در صفحهٔ ۱ (پی‌دی‌اف)]'));
    });

    test('questions about the current page add nothing', () {
      final turn = builder.build(pdfPage: 2, question: 'لیمت ترادف یعنی چه؟');
      expect(turn.sourcePages, isEmpty);
      expect(turn.messages.last.content, isNot(contains('[صفحهٔ دیگری از کتاب]')));
      expect(turn.messages.last.content, endsWith('[سوال شاگرد در صفحهٔ ۳ کتاب]\nلیمت ترادف یعنی چه؟'));
      // Question phrasing alone ("به زبان ساده", "به دست آمد") must not pull in other pages.
      expect(builder.build(pdfPage: 2, question: 'لیمت را به زبان ساده بگویید').sourcePages, isEmpty);
      expect(builder.build(pdfPage: 2, question: 'این لیمت چطور به دست آمد؟').sourcePages, isEmpty);
      // Asking about Rolle's theorem while on the Rolle page stays on this page.
      expect(builder.build(pdfPage: 5, question: 'قضیهٔ رول چه می‌گوید؟').sourcePages, isEmpty);
    });

    test('"this page" questions and mere shared words do not pull in other pages', () {
      expect(builder.build(pdfPage: 2, question: 'قضیهٔ رول را با این صفحه مقایسه کنید').sourcePages, isEmpty);
      // «حاصل ضرب» only appears in page 6's notes, not in what page 6 is about.
      expect(builder.build(pdfPage: 2, question: 'حاصل ضرب چیست؟').sourcePages, isEmpty);
    });

    test('links only for pages and chapters the answer mentions, and only real ones', () {
      List<String> links(String answer, {List<int> sources = const []}) =>
          [for (final l in builder.answerLinks(answer, currentPage: 2, sourcePages: sources)) '${l.label}→${l.pdfPage}'];

      expect(links('قضیهٔ رول در صفحهٔ ۶ آمده است.'), ['صفحهٔ ۶→5']); // a section start in the outline
      expect(links('در همین صفحهٔ ۳ دیدید.'), isEmpty); // the page being read
      expect(links('صفحهٔ ۹۹ را ببینید.'), isEmpty); // no such page
      expect(links('تمرین‌ها در صفحهٔ ۵ است.'), isEmpty); // not given to the teacher
      expect(links('تمرین‌ها در صفحهٔ ۵ است.', sources: [4]), ['صفحهٔ ۵→4']);
      expect(links('این موضوع در فصل ۴ و فصل سوم آمده است.'), ['فصل ۴→6', 'فصل ۳→5']);
      expect(links('این در فصل اول است.'), isEmpty); // the chapter being read
    });

    test('a page named by number gets its full notes', () {
      final turn = builder.build(pdfPage: 2, question: 'در صفحهٔ ۷ چه آمده است؟');
      expect(turn.sourcePages, [6]);
      expect(turn.messages.last.content, contains('[معلومات صفحه‌ای که شاگرد نام برده]'));
    });

    test('the system message (rules + outline) is identical on every page, so it stays cached', () {
      final a = builder.build(pdfPage: 2, question: 'x').messages.first.content;
      final b = builder.build(pdfPage: 6, question: 'y').messages.first.content;
      expect(a, contains('[فهرست کتاب'));
      expect(a, isNot(contains('[معلومات صفحه]')));
      expect(b, a);
    });

    test('history comes before the question, which comes with the page notes', () {
      final turn = builder.build(pdfPage: 2, question: 'سوال دوم را حل کن', history: const [
        ChatMessage('user', 'سوال اول را حل کن'),
        ChatMessage('assistant', 'حل تمرین ۱ …'),
      ]);
      expect(turn.messages.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
      expect(turn.messages.last.content, startsWith('[معلومات صفحه]'));
    });
  });
}
