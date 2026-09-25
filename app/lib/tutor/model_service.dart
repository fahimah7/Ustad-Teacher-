import 'package:flutter/foundation.dart';

import '../config.dart';
import 'llama_client.dart';
import 'llama_server.dart';

/// The local teacher model. It starts once when the app opens — while the student is still
/// typing her name — and is shared by every book.
class ModelService extends ChangeNotifier {
  ModelService(AppConfig config)
      : client = LlamaClient(config.port),
        _server = LlamaServer(config);

  final LlamaClient client;
  final LlamaServer _server;
  bool ready = false;
  String? error;

  Future<void> start() async {
    try {
      await _server.start();
      ready = true;
      error = null;
    } catch (e) {
      debugPrint('model failed to start: $e');
      error = 'معلم آماده نشد. ${'$e'.split('\n').first}';
    }
    notifyListeners();
  }

  void stop() => _server.stop();
}
