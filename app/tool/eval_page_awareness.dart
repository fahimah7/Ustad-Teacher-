// Checks that the teacher answers about the page the student is looking at.
// On pages spread across the book, asks generic "this page" questions and scores how many of
// that page's own key terms (section title + terms) appear in the answer, versus terms of a
// page from a different chapter. Uses the app's PromptBuilder.
//
// Server running on 127.0.0.1:8080, then from app/:  dart run tool/eval_page_awareness.dart
import 'dart:io';

import 'package:offline_school/content/book.dart';
import 'package:offline_school/tutor/book_search.dart';
import 'package:offline_school/tutor/dari_terms.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:path/path.dart' as p;

const pages = [30, 75, 110, 150, 215, 270]; // PDF pages in chapters 1, 2, 3, 4, 6, 8
const questions = ['این صفحه در بارهٔ چیست؟', 'این صفحه را ساده توضیح بدهید'];

Future<void> main() async {
  final appDir = Directory.current.path;
  final book = await Book.load(p.join(appDir, '..', 'content', 'g12-math'));
  await book.preloadPackages();
  final template = await File(p.join(appDir, 'assets', 'prompts', 'teacher_system_fa.txt')).readAsString();
  final builder = PromptBuilder(
      book: book, systemPrompt: fillTeacherPrompt(template, bookTitle: book.titleFa, studentName: 'مریم'));
  final client = LlamaClient(8080);

  Set<String> keyTerms(int page) {
    final pkg = book.cachedPackage(page)!;
    final terms = <String>{
      ...tokenize(pkg.sectionFa ?? ''),
      for (final t in (pkg.json['terms'] as List? ?? const [])) ...tokenize((t as Map)['fa'] as String? ?? ''),
    };
    return terms;
  }

  var right = 0, total = 0;
  for (final page in pages) {
    final other = pages[(pages.indexOf(page) + 3) % pages.length];
    final own = keyTerms(page), foreign = keyTerms(other).difference(own);
    for (final q in questions) {
      final turn = builder.build(pdfPage: page, question: q);
      final answer = StringBuffer();
      await for (final piece in client.chat(turn.messages)) {
        answer.write(piece);
      }
      final words = tokenize(toBookDari(answer.toString())).toSet();
      final hitsOwn = own.intersection(words).length, hitsOther = foreign.intersection(words).length;
      final ok = hitsOwn > 0 && hitsOwn >= hitsOther;
      total++;
      if (ok) right++;
      stdout.writeln('${ok ? 'OK  ' : 'MISS'} p${book.printedPageOf(page)} «${book.cachedPackage(page)!.sectionFa}» | $q | '
          'own terms $hitsOwn/${own.length}, other-page terms $hitsOther | '
          '${answer.toString().replaceAll('\n', ' ').substring(0, answer.length.clamp(0, 110))}');
    }
  }
  stdout.writeln('page-aware answers: $right/$total');
}
