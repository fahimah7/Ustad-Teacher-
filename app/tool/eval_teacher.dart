// Asks the running tutor model real questions through the app's own prompt code
// (PromptBuilder), so this measures exactly what the app sends.
//
// Start the server:  powershell -File ..\scripts\start_llama_server.ps1 -Model e2b
// Then, from app/:    dart run tool/eval_teacher.dart e2b
// Writes ../eval/teacher_<label>.jsonl.
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:offline_school/content/book.dart';
import 'package:offline_school/tutor/dari_terms.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:path/path.dart' as p;

const port = 8080;

/// (PDF page the student is on, question). The first three are about the open page;
/// the rest ask about other parts of the book.
const questions = [
  (10, 'لیمت یعنی چه؟ لطفاً به زبان ساده توضیح بدهید.'),
  (25, 'تمرین ۴ را چطور حل کنم؟'),
  (144, r'در مثال ۱، $\Delta x$ چطور به دست آمد؟'),
  (10, 'قضیهٔ رول چه می‌گوید و در کدام صفحهٔ کتاب است؟'),
  (144, 'انتیگرال‌گیری به طریقهٔ قسمی را کجا می‌توانم بخوانم؟'),
  (25, 'احتمال مشروط چیست؟'),
  (10, 'در صفحهٔ ۴۰ چه چیزی درس داده می‌شود؟'),
  (144, 'این کتاب چند فصل دارد و موضوع هر فصل چیست؟'),
  (10, 'در بارهٔ فوتبال با من صحبت کنید.'),
];

Future<void> main(List<String> args) async {
  final label = args.isEmpty ? 'e2b' : args.first;
  final appDir = Directory.current.path;
  final root = p.normalize(p.join(appDir, '..'));

  final book = await Book.load(p.join(root, 'content', 'g12-math'));
  await book.preloadPackages();
  final template = await File(p.join(appDir, 'assets', 'prompts', 'teacher_system_fa.txt')).readAsString();
  final systemPrompt = fillTeacherPrompt(template, bookTitle: book.titleFa, studentName: 'مریم');
  final builder = PromptBuilder(book: book, systemPrompt: systemPrompt);
  final client = LlamaClient(port);

  final cached = builder.build(pdfPage: 10, question: '').messages.first.content;
  stdout.writeln('rules + outline: ${await countTokens(cached)} tokens (cached across pages and turns)');

  final out = File(p.join(root, 'eval', 'teacher_$label.jsonl'));
  await out.parent.create(recursive: true);
  final sink = out.openWrite();
  for (final (page, question) in questions) {
    final turn = builder.build(pdfPage: page, question: question);
    final promptTokens = await countTokens(turn.messages.map((m) => m.content).join('\n'));
    final watch = Stopwatch()..start();
    Duration? firstToken;
    final raw = StringBuffer();
    await for (final piece in client.chat(turn.messages)) {
      firstToken ??= watch.elapsed;
      raw.write(piece);
    }
    final answer = toBookDari(raw.toString());
    final record = {
      'model': label,
      'page': page,
      'printed_page': book.printedPageOf(page),
      'question': question,
      'source_pages': [for (final s in turn.sourcePages) book.printedPageOf(s)],
      'prompt_tokens': promptTokens,
      'ttft_s': (firstToken?.inMilliseconds ?? 0) / 1000,
      'total_s': watch.elapsedMilliseconds / 1000,
      'iranian_terms_raw': iranianTermsIn(raw.toString()).toList(),
      'answer': answer,
    };
    sink.writeln(jsonEncode(record));
    stdout.writeln('p${book.printedPageOf(page)}  sources ${record['source_pages']}  prompt $promptTokens tok  '
        'first ${record['ttft_s']}s  total ${record['total_s']}s  fixed terms ${record['iranian_terms_raw']}');
  }
  await sink.close();
  stdout.writeln('answers written to ${out.path}');
}

Future<int> countTokens(String text) async {
  final response = await http.post(Uri.parse('http://127.0.0.1:$port/tokenize'),
      headers: {'Content-Type': 'application/json'}, body: jsonEncode({'content': text}));
  return ((jsonDecode(response.body) as Map)['tokens'] as List).length;
}
