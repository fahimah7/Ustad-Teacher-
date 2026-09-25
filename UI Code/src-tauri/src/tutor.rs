//! Ustad's teacher: a local Gemma model run by llama.cpp's llama-server, bound to 127.0.0.1 so
//! it is never reachable from a network, and talked to over plain HTTP on loopback only.
//! A supervisor thread keeps it running: it reuses a healthy server that is already up, starts
//! one if none is, and reports "starting" while the model loads.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::ipc::Channel;

#[derive(Serialize, Clone)]
pub struct TutorStatus {
    pub state: &'static str, // starting | ready | error | unavailable
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ChatEvent {
    Delta { text: String },
    Done,
    Error { message: String },
}

struct Config {
    exe: Option<PathBuf>,
    model: Option<PathBuf>,
    cuda_bin: Option<PathBuf>,
    port: u16,
}

pub struct Tutor {
    config: Config,
    status: Mutex<TutorStatus>,
    child: Mutex<Option<Child>>,
    log: Arc<Mutex<VecDeque<String>>>,
    cancels: Mutex<HashMap<u32, Arc<AtomicBool>>>,
    stopping: AtomicBool,
}

enum Health {
    Ready,
    Loading,
    Down,
}

fn first_existing(candidates: Vec<PathBuf>) -> Option<PathBuf> {
    candidates.into_iter().find(|p| p.exists())
}

impl Tutor {
    pub fn new(resource_dir: Option<PathBuf>) -> Self {
        let exe_dir = std::env::current_exe().ok().and_then(|e| e.parent().map(Path::to_path_buf));
        let bundled = |rel: &str| -> Vec<PathBuf> {
            [resource_dir.clone(), exe_dir.clone()].into_iter().flatten().map(|d| d.join(rel)).collect()
        };
        let env_path = |name: &str| std::env::var(name).ok().map(PathBuf::from);

        let mut exes: Vec<PathBuf> = env_path("SCHOOL_LLAMA_SERVER").into_iter().collect();
        exes.extend(bundled("llama/llama-server.exe"));
        exes.extend(bundled("llama/llama-server"));
        exes.push(PathBuf::from(r"D:\dev\llama.cpp\llama-server.exe"));

        let mut models: Vec<PathBuf> = env_path("SCHOOL_MODEL").into_iter().collect();
        models.extend(bundled("models/tutor.gguf"));
        models.push(PathBuf::from(r"C:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf")); // SSD: loads in seconds
        models.push(PathBuf::from(r"D:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf")); // HDD: slower

        let cuda_bin = env_path("SCHOOL_CUDA_BIN")
            .or_else(|| Some(PathBuf::from(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin")))
            .filter(|p| p.exists());

        Tutor {
            config: Config {
                exe: first_existing(exes),
                model: first_existing(models),
                cuda_bin,
                port: std::env::var("SCHOOL_LLAMA_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080),
            },
            status: Mutex::new(TutorStatus { state: "starting", message: None }),
            child: Mutex::new(None),
            log: Arc::new(Mutex::new(VecDeque::new())),
            cancels: Mutex::new(HashMap::new()),
            stopping: AtomicBool::new(false),
        }
    }

    pub fn status(&self) -> TutorStatus {
        self.status.lock().unwrap().clone()
    }

    fn set(&self, state: &'static str, message: Option<String>) {
        *self.status.lock().unwrap() = TutorStatus { state, message };
    }

    fn base(&self) -> String {
        format!("http://127.0.0.1:{}", self.config.port)
    }

    fn health(&self) -> Health {
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_millis(1500)).build();
        match agent.get(&format!("{}/health", self.base())).call() {
            Ok(_) => Health::Ready,
            Err(ureq::Error::Status(503, _)) => Health::Loading,
            Err(_) => Health::Down,
        }
    }

    /// Keeps the teacher model running for as long as the app is open.
    pub fn supervise(self: Arc<Self>) {
        std::thread::spawn(move || {
            let mut failures = 0u32;
            let mut retry_at = Instant::now();
            while !self.stopping.load(Ordering::Relaxed) {
                match self.health() {
                    Health::Ready => {
                        failures = 0;
                        self.set("ready", None);
                    }
                    Health::Loading => self.set("starting", Some("loading the model".into())),
                    Health::Down => {
                        let exited = {
                            let mut child = self.child.lock().unwrap();
                            match child.as_mut().map(|c| c.try_wait()) {
                                Some(Ok(None)) => None, // still starting up
                                Some(Ok(Some(code))) => {
                                    *child = None;
                                    Some(code.to_string())
                                }
                                Some(Err(e)) => {
                                    *child = None;
                                    Some(e.to_string())
                                }
                                None => Some(String::new()),
                            }
                        };
                        match exited {
                            None => self.set("starting", Some("starting the model".into())),
                            Some(code) => {
                                if !code.is_empty() {
                                    failures += 1;
                                    retry_at = Instant::now() + Duration::from_secs(10);
                                    let tail: Vec<String> = self.log.lock().unwrap().iter().rev().take(6).rev().cloned().collect();
                                    self.set("error", Some(format!("llama-server stopped ({code}): {}", tail.join(" | "))));
                                }
                                if failures < 3 && Instant::now() >= retry_at {
                                    if let Err(e) = self.spawn() {
                                        failures = 3;
                                        self.set("unavailable", Some(e));
                                    }
                                }
                            }
                        }
                    }
                }
                std::thread::sleep(Duration::from_millis(1000));
            }
        });
    }

    fn spawn(&self) -> Result<(), String> {
        let exe = self.config.exe.clone().ok_or("llama-server was not found (set SCHOOL_LLAMA_SERVER)")?;
        let model = self.config.model.clone().ok_or("the teacher model was not found (set SCHOOL_MODEL)")?;
        let mut cmd = Command::new(&exe);
        cmd.args([
            "--model", &model.to_string_lossy(),
            "--host", "127.0.0.1",
            "--port", &self.config.port.to_string(),
            "--ctx-size", "8192",
            "--n-gpu-layers", "99",
            "--flash-attn", "on",
            "--jinja",
            "--no-webui",
        ]);
        if let Some(cuda) = &self.config.cuda_bin {
            // ggml-cuda.dll needs the CUDA runtime/cuBLAS DLLs from the installed toolkit.
            let path = std::env::var("PATH").unwrap_or_default();
            cmd.env("PATH", format!("{};{}", cuda.display(), path));
        }
        cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        let mut child = cmd.spawn().map_err(|e| format!("could not start llama-server: {e}"))?;
        for stream in [child.stdout.take().map(|s| Box::new(s) as Box<dyn std::io::Read + Send>), child.stderr.take().map(|s| Box::new(s) as Box<dyn std::io::Read + Send>)].into_iter().flatten() {
            let log = self.log.clone();
            std::thread::spawn(move || {
                for line in BufReader::new(stream).lines().map_while(Result::ok) {
                    let mut log = log.lock().unwrap();
                    log.push_back(line);
                    if log.len() > 40 {
                        log.pop_front();
                    }
                }
            });
        }
        *self.child.lock().unwrap() = Some(child);
        self.set("starting", Some("starting the model".into()));
        Ok(())
    }

    /// Stops the server if this app started it (a server someone else started is left alone).
    pub fn stop(&self) {
        self.stopping.store(true, Ordering::Relaxed);
        if let Some(mut child) = self.child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    pub fn cancel(&self, id: u32) {
        if let Some(flag) = self.cancels.lock().unwrap().get(&id) {
            flag.store(true, Ordering::Relaxed);
        }
    }

    /// Streams one reply. Stopping (cancel) closes the connection, which makes llama-server stop
    /// generating.
    pub fn chat(&self, id: u32, messages: Vec<ChatMessage>, out: &Channel<ChatEvent>) -> Result<(), String> {
        if self.status().state != "ready" {
            return Err("Ustad is still getting ready. Please try again in a moment.".into());
        }
        let total: usize = messages.iter().map(|m| m.content.len()).sum();
        if messages.is_empty() || messages.len() > 40 || total > 200_000 {
            return Err("message too long".into());
        }
        let messages: Vec<serde_json::Value> = messages
            .into_iter()
            .filter(|m| matches!(m.role.as_str(), "system" | "user" | "assistant"))
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();
        let body = serde_json::json!({
            "messages": messages,
            "stream": true,
            "temperature": 0.3,
            "max_tokens": 600,
            "cache_prompt": true,
            // llama-server enables Gemma 4's thinking channel unless told otherwise; the tutor must answer directly.
            "chat_template_kwargs": { "enable_thinking": false },
        });

        let flag = Arc::new(AtomicBool::new(false));
        self.cancels.lock().unwrap().insert(id, flag.clone());
        let result = self.stream(&body, &flag, out);
        self.cancels.lock().unwrap().remove(&id);
        match result {
            Ok(()) => {
                let _ = out.send(ChatEvent::Done);
                Ok(())
            }
            Err(e) => {
                let _ = out.send(ChatEvent::Error { message: e.clone() });
                Err(e)
            }
        }
    }

    fn stream(&self, body: &serde_json::Value, cancelled: &AtomicBool, out: &Channel<ChatEvent>) -> Result<(), String> {
        let agent = ureq::AgentBuilder::new()
            .timeout_connect(Duration::from_secs(3))
            .timeout_read(Duration::from_secs(180))
            .build();
        let response = agent
            .post(&format!("{}/v1/chat/completions", self.base()))
            .set("Content-Type", "application/json")
            .send_string(&body.to_string())
            .map_err(|e| match e {
                ureq::Error::Status(code, r) => format!("llama-server {code}: {}", r.into_string().unwrap_or_default()),
                other => other.to_string(),
            })?;
        let reader = BufReader::new(response.into_reader());
        for line in reader.lines() {
            if cancelled.load(Ordering::Relaxed) {
                return Ok(());
            }
            let line = line.map_err(|e| e.to_string())?;
            let Some(data) = line.strip_prefix("data: ") else { continue };
            let data = data.trim();
            if data == "[DONE]" {
                break;
            }
            let Ok(json) = serde_json::from_str::<serde_json::Value>(data) else { continue };
            for choice in json["choices"].as_array().into_iter().flatten() {
                if let Some(text) = choice["delta"]["content"].as_str() {
                    if !text.is_empty() {
                        out.send(ChatEvent::Delta { text: text.to_string() }).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
        Ok(())
    }
}
