import 'dart:io';

import 'package:path/path.dart' as p;

/// Where the app finds its content packs, the tutor model and the llama.cpp runtime.
///
/// A packaged build looks next to the executable (`content/`, `llama/`, `models/`).
/// On a dev machine the defaults point at the repo and D:\ installs; environment
/// variables override everything.
class AppConfig {
  const AppConfig({
    required this.contentDir,
    required this.llamaServerExe,
    required this.modelPath,
    this.cudaBinDir,
    this.port = 8080,
  });

  final String contentDir;
  final String llamaServerExe;
  final String modelPath;
  final String? cudaBinDir;
  final int port;

  factory AppConfig.fromEnvironment() {
    final env = Platform.environment;
    final exeDir = p.dirname(Platform.resolvedExecutable);
    String firstExisting(List<String> candidates) => candidates.firstWhere(
          (c) => FileSystemEntity.typeSync(c) != FileSystemEntityType.notFound,
          orElse: () => candidates.last,
        );

    return AppConfig(
      contentDir: env['SCHOOL_CONTENT_DIR'] ??
          firstExisting([
            p.join(exeDir, 'content'),
            p.normalize(p.join(Directory.current.path, '..', 'content')),
          ]),
      llamaServerExe: env['SCHOOL_LLAMA_SERVER'] ??
          firstExisting([
            p.join(exeDir, 'llama', 'llama-server.exe'),
            r'D:\dev\llama.cpp\llama-server.exe',
          ]),
      modelPath: env['SCHOOL_MODEL'] ??
          firstExisting([
            p.join(exeDir, 'models', 'tutor.gguf'),
            r'C:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf', // SSD: loads in seconds
            r'D:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf', // HDD: ~2 minutes
          ]),
      cudaBinDir: env['SCHOOL_CUDA_BIN'] ??
          r'C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin',
      port: int.tryParse(env['SCHOOL_LLAMA_PORT'] ?? '') ?? 8080,
    );
  }
}
