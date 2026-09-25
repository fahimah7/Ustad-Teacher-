import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

class ChatMessage {
  const ChatMessage(this.role, this.content);

  final String role;
  final String content;

  Map<String, String> toJson() => {'role': role, 'content': content};
}

/// Streams chat completions from the local llama-server (OpenAI-compatible API on 127.0.0.1).
class LlamaClient {
  LlamaClient(int port) : _endpoint = Uri.parse('http://127.0.0.1:$port/v1/chat/completions');

  final Uri _endpoint;

  /// Yields the reply piece by piece. Cancelling the subscription closes the HTTP
  /// connection, which makes llama-server stop generating.
  Stream<String> chat(List<ChatMessage> messages, {double temperature = 0.3, int maxTokens = 600}) {
    final client = http.Client();
    var cancelled = false;
    late final StreamController<String> out;
    out = StreamController<String>(
      onListen: () async {
        try {
          final request = http.Request('POST', _endpoint)
            ..headers['Content-Type'] = 'application/json'
            ..body = jsonEncode({
              'messages': [for (final m in messages) m.toJson()],
              'stream': true,
              'temperature': temperature,
              'max_tokens': maxTokens,
              'cache_prompt': true,
              // llama-server enables Gemma 4's thinking channel unless told otherwise; the tutor must answer directly.
              'chat_template_kwargs': {'enable_thinking': false},
            });
          final response = await client.send(request);
          if (response.statusCode != 200) {
            throw Exception('llama-server ${response.statusCode}: ${await response.stream.bytesToString()}');
          }
          final lines = response.stream.transform(utf8.decoder).transform(const LineSplitter());
          await for (final line in lines) {
            if (cancelled) break;
            if (!line.startsWith('data: ')) continue;
            final data = line.substring(6).trim();
            if (data == '[DONE]') break;
            final choices = (jsonDecode(data) as Map<String, dynamic>)['choices'] as List? ?? const [];
            for (final choice in choices) {
              final piece = ((choice as Map)['delta'] as Map?)?['content'];
              if (piece is String && piece.isNotEmpty) out.add(piece);
            }
          }
        } catch (e, st) {
          if (!cancelled) out.addError(e, st);
        } finally {
          client.close();
          if (!cancelled) await out.close();
        }
      },
      onCancel: () {
        cancelled = true;
        client.close();
      },
    );
    return out.stream;
  }
}
