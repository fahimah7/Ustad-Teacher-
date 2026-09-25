import 'dart:ui' show AppExitResponse;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'config.dart';
import 'content/library.dart';
import 'tutor/model_service.dart';
import 'ui/onboarding.dart';
import 'ui/reader_loader.dart';

void main() => runApp(const SchoolApp());

class SchoolApp extends StatelessWidget {
  const SchoolApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'کتاب',
      debugShowCheckedModeBanner: false,
      locale: const Locale('fa'),
      supportedLocales: const [Locale('fa')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF2E7D6B), fontFamily: 'Segoe UI'),
      home: const AppShell(),
    );
  }
}

/// Starts the teacher model in the background, finds the books that are ready, then hands over
/// to the welcome flow: name → greeting → grade → book → reader.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _config = AppConfig.fromEnvironment();
  late final _model = ModelService(_config);
  late final AppLifecycleListener _lifecycle;
  late final Future<(List<BookInfo>, String)> _startup = _loadLibrary();

  @override
  void initState() {
    super.initState();
    // Closing the window must also stop the model process.
    _lifecycle = AppLifecycleListener(onExitRequested: () async {
      _model.stop();
      return AppExitResponse.exit;
    });
    // Load the model while the student is still typing her name.
    _model.start();
  }

  Future<(List<BookInfo>, String)> _loadLibrary() async =>
      (await discoverBooks(_config.contentDir), await rootBundle.loadString('assets/prompts/teacher_system_fa.txt'));

  @override
  void dispose() {
    _lifecycle.dispose();
    _model.stop();
    _model.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _startup,
      builder: (context, snapshot) {
        final data = snapshot.data;
        if (snapshot.hasError || (data != null && data.$1.isEmpty)) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  snapshot.hasError ? 'برنامه باز نشد:\n${snapshot.error}' : 'هیچ کتابی پیدا نشد.\n${_config.contentDir}',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          );
        }
        if (data == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
        final (library, promptTemplate) = data;
        return WelcomeScreen(
          library: library,
          readerBuilder: (name, book) =>
              ReaderLoader(info: book, studentName: name, model: _model, promptTemplate: promptTemplate),
        );
      },
    );
  }
}
