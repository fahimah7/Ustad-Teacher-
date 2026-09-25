import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';

/// Runs llama-server as a child process bound to 127.0.0.1, so it is never reachable from the
/// network. Desktop-only stopgap for v1; Android will call llama.cpp in-process instead.
class LlamaServer {
  LlamaServer(this.config);

  final AppConfig config;
  Process? _process;
  final List<String> _log = [];

  String get recentLog => _log.join('\n');

  Future<void> start({Duration timeout = const Duration(minutes: 3)}) async {
    if (await _healthy()) return; // already running, e.g. started by scripts/start_llama_server.ps1

    final env = Map<String, String>.from(Platform.environment);
    final cuda = config.cudaBinDir;
    if (cuda != null && Directory(cuda).existsSync()) {
      env['PATH'] = '$cuda;${env['PATH'] ?? ''}';
    }
    final process = await Process.start(config.llamaServerExe, [
      '--model', config.modelPath,
      '--host', '127.0.0.1',
      '--port', '${config.port}',
      '--ctx-size', '8192',
      '--n-gpu-layers', '99',
      '--flash-attn', 'on',
      '--jinja',
      '--no-webui',
    ], environment: env);
    _process = process;

    for (final stream in [process.stdout, process.stderr]) {
      stream.transform(const Utf8Decoder(allowMalformed: true)).transform(const LineSplitter()).listen((line) {
        _log.add(line);
        if (_log.length > 40) _log.removeAt(0);
      });
    }
    int? exitCode;
    unawaited(process.exitCode.then((code) => exitCode = code));

    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      if (exitCode != null) {
        throw Exception('llama-server exited with code $exitCode\n$recentLog');
      }
      if (await _healthy()) return;
      await Future<void>.delayed(const Duration(milliseconds: 500));
    }
    throw TimeoutException('llama-server did not become ready', timeout);
  }

  Future<bool> _healthy() async {
    try {
      final response = await http
          .get(Uri.parse('http://127.0.0.1:${config.port}/health'))
          .timeout(const Duration(seconds: 2));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  void stop() {
    _process?.kill();
    _process = null;
  }
}
