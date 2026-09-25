// Prints the prompts PromptBuilder builds for a fixed set of (page, question) pairs on the real
// book, as JSON, so other ports of the tutor (UI Code/src/tutor) can be checked against it.
//   dart run tool/dump_prompts.dart > ../eval/prompts_dart.json
import 'dart:convert';
import 'dart:io';

import 'package:offline_school/content/book.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:path/path.dart' as p;

const cases = [
  (19, 'سوال اول را حل کن'),
  (10, 'لیمت یعنی چه؟ لطفاً به زبان ساده توضیح بدهید.'),
  (10, 'قضیهٔ رول چه می‌گوید و در کدام صفحهٔ کتاب است؟'),
  (144, 'انتیگرال‌گیری به طریقهٔ قسمی را کجا می‌توانم بخوانم؟'),
  (25, 'احتمال مشروط چیست؟'),
  (10, 'در صفحهٔ ۴۰ چه چیزی درس داده می‌شود؟'),
  (250, 'این جدول چه نشان می‌دهد؟'),
  (1, 'این کتاب چند فصل دارد؟'),
];

Future<void> main() async {
  final book = await Book.load(p.normalize(p.join(Directory.current.path, '..', 'content', 'g12-math')));
  await book.preloadPackages();
  final builder = PromptBuilder(book: book, systemPrompt: 'RULES');
  final out = [
    for (final (page, q) in cases)
      {
        'page': page,
        'question': q,
        'sources': builder.build(pdfPage: page, question: q).sourcePages,
        'messages': [
          for (final ChatMessage m in builder.build(pdfPage: page, question: q, history: const [
            ChatMessage('user', 'قبلی'),
            ChatMessage('assistant', 'جواب قبلی'),
          ]).messages)
            m.toJson()
        ],
      }
  ];
  stdout.write(jsonEncode(out));
}
