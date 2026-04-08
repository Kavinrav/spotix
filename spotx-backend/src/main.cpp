// SpotX backend: converts video/audio to M4A (AAC) for audiobook-style playback.
// Requires ffmpeg on PATH. Optional: yt-dlp for URL sources (YouTube and many sites).

#include <httplib.h>

#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <limits>
#include <random>
#include <sstream>
#include <string>
#include <vector>

#ifndef _WIN32
#include <sys/wait.h>
#endif

namespace fs = std::filesystem;

namespace {

constexpr const char* kMimeM4a = "audio/mp4";

void cors(httplib::Response& res) {
  // Use a custom header to track if we've already applied CORS to this response
  if (res.has_header("X-Cors-Applied")) return;
  res.set_header("X-Cors-Applied", "true");

  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type, Range, Access-Control-Allow-Private-Network");
  res.set_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
  res.set_header("Access-Control-Allow-Private-Network", "true");
}

std::string json_escape(const std::string& s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (unsigned char c : s) {
    if (c == '\\' || c == '"') out += '\\';
    out += static_cast<char>(c);
  }
  return out;
}

std::string gen_id() {
  static thread_local std::mt19937_64 rng{std::random_device{}()};
  static std::uniform_int_distribution<uint64_t> dist(0, std::numeric_limits<uint64_t>::max());
  std::ostringstream oss;
  oss << std::hex << std::setfill('0') << std::setw(16) << dist(rng) << std::setw(16) << dist(rng);
  return oss.str();
}

std::string quote_shell(const fs::path& p) {
  const std::string s = p.string();
  std::string out = "\"";
  for (char c : s) {
    if (c == '\"') out += '\\';
    out += c;
  }
  out += '\"';
  return out;
}

std::string quote_string(const std::string& s) {
  std::string out = "\"";
  for (char c : s) {
    if (c == '\"') out += '\\';
    out += c;
  }
  out += '\"';
  return out;
}

bool run_process(const std::string& cmd) {
  const int r = std::system(cmd.c_str());
#if defined(_WIN32)
  return r == 0;
#else
  return WIFEXITED(r) && WEXITSTATUS(r) == 0;
#endif
}

bool ffmpeg_to_m4a(const fs::path& input, const fs::path& output) {
  std::ostringstream cmd;
  cmd << "ffmpeg -y -hide_banner -loglevel error -i " << quote_shell(input) << " -vn -c:a aac -b:a 192k -movflags +faststart "
      << quote_shell(output);
  return run_process(cmd.str());
}

bool ffmpeg_available() {
#ifdef _WIN32
  return run_process("ffmpeg -version >nul 2>&1");
#else
  return run_process("ffmpeg -version >/dev/null 2>&1");
#endif
}

bool ytdlp_available() {
#ifdef _WIN32
  return run_process("yt-dlp --version >nul 2>&1");
#else
  return run_process("yt-dlp --version >/dev/null 2>&1");
#endif
}

fs::path raw_download_glob(const fs::path& job_dir) {
  for (const auto& e : fs::directory_iterator(job_dir)) {
    if (!e.is_regular_file()) continue;
    const auto name = e.path().filename().string();
    if (name.rfind("raw.", 0) == 0) return e.path();
  }
  return {};
}

bool ytdlp_download(const fs::path& job_dir, const std::string& url, std::string& err) {
  const fs::path pattern = job_dir / "raw.%(ext)s";
  std::ostringstream cmd;
  cmd << "yt-dlp -f bestaudio/best --no-playlist -o " << quote_shell(pattern) << " " << quote_string(url);
  if (!run_process(cmd.str())) {
    err = "yt-dlp failed (install yt-dlp and ensure the URL is supported)";
    return false;
  }
  return true;
}

void write_meta(const fs::path& job_dir, const std::string& title, const std::string& source) {
  const auto now = std::chrono::system_clock::now();
  const auto t = std::chrono::system_clock::to_time_t(now);
  std::tm tm_buf{};
#ifdef _WIN32
  gmtime_s(&tm_buf, &t);
#else
  if (const std::tm* p = std::gmtime(&t)) {
    tm_buf = *p;
  }
#endif
  std::ostringstream ts;
  ts << std::put_time(&tm_buf, "%Y-%m-%dT%H:%M:%SZ");
  std::ofstream f(job_dir / "meta.json");
  f << "{\"title\":\"" << json_escape(title) << "\",\"source\":\"" << source << "\",\"created\":\"" << ts.str() << "\"}";
}

bool read_meta_title(const fs::path& job_dir, std::string& title) {
  std::ifstream in(job_dir / "meta.json");
  if (!in) return false;
  std::string line;
  std::getline(in, line);
  const auto k = line.find("\"title\":\"");
  if (k == std::string::npos) return false;
  const auto start = k + 9;
  auto end = line.find('"', start);
  if (end == std::string::npos) return false;
  title = line.substr(start, end - start);
  return true;
}

} // namespace

int main(int argc, char** argv) {
  (void)argc;
  (void)argv;

  const char* port_env = std::getenv("SPOTX_PORT");
  int port = 8787;
  if (port_env) {
    try {
      port = std::stoi(port_env);
    } catch (...) {}
  }

  const fs::path data_root = fs::current_path() / "spotx_data";
  const fs::path jobs_dir = data_root / "jobs";
  {
    std::error_code ec;
    fs::create_directories(jobs_dir, ec);
  }

  const bool have_ffmpeg = ffmpeg_available();
  const bool have_ytdlp = ytdlp_available();

  httplib::Server svr;

  svr.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
    cors(res);
    if (req.method == "OPTIONS") {
      res.status = 204;
      return httplib::Server::HandlerResponse::Handled;
    }
    return httplib::Server::HandlerResponse::Unhandled;
  });

  svr.Get("/health", [have_ffmpeg, have_ytdlp](const httplib::Request&, httplib::Response& res) {
    std::ostringstream j;
    j << "{\"ok\":true,\"ffmpeg\":" << (have_ffmpeg ? "true" : "false") << ",\"yt_dlp\":" << (have_ytdlp ? "true" : "false") << "}";
    res.set_content(j.str(), "application/json");
  });

  svr.Get("/api/capabilities", [have_ffmpeg, have_ytdlp](const httplib::Request&, httplib::Response& res) {
    std::ostringstream j;
    j << "{\"ffmpeg\":" << (have_ffmpeg ? "true" : "false") << ",\"yt_dlp\":" << (have_ytdlp ? "true" : "false") << "}";
    res.set_content(j.str(), "application/json");
  });

  svr.Get("/api/jobs", [&jobs_dir](const httplib::Request&, httplib::Response& res) {
    std::cout << "GET /api/jobs\n";
    std::ostringstream j;
    j << "[";
    bool first = true;
    if (fs::exists(jobs_dir)) {
      std::vector<fs::path> dirs;
      for (const auto& e : fs::directory_iterator(jobs_dir)) {
        if (e.is_directory()) dirs.push_back(e.path());
      }
      std::sort(dirs.begin(), dirs.end());
      for (const auto& d : dirs) {
        const auto id = d.filename().string();
        if (id.size() != 32) continue;
        bool ok = fs::exists(d / "output.m4a");
        std::string title = id;
        read_meta_title(d, title);
        if (!first) j << ",";
        first = false;
        j << "{\"id\":\"" << id << "\",\"title\":\"" << json_escape(title) << "\",\"ready\":" << (ok ? "true" : "false") << "}";
      }
    }
    j << "]";
    res.set_content(j.str(), "application/json");
  });

  svr.Get(R"(/api/audio/([a-fA-F0-9]{32}))", [&jobs_dir, have_ffmpeg](const httplib::Request& req, httplib::Response& res) {
    const std::string id = req.matches[1];
    std::cout << "GET /api/audio/" << id << "\n";
    std::cout << "  Requested ID: " << id << std::endl;
    
    if (!have_ffmpeg) {
      std::cerr << "  ffmpeg not available\n";
      res.status = 503;
      res.set_content("{\"error\":\"ffmpeg not available\"}", "application/json");
      return;
    }
    try {
      const fs::path file = jobs_dir / id / "output.m4a";
      std::cout << "  File path: " << file << std::endl;
      std::cout << "  Exists: " << fs::exists(file) << std::endl;
      
      if (!fs::exists(file)) {
        std::cout << "  File not found\n";
        res.status = 404;
        res.set_content("{\"error\":\"not found\"}", "application/json");
        return;
      }

      const auto size = fs::file_size(file);
      std::cout << "  File size: " << size << std::endl;
      
      const auto rangeHeader = req.get_header_value("Range");
      
      std::cout << "  File: " << id << " (" << size << " bytes)\n";

      uint64_t start = 0;
      uint64_t end = size - 1;
      bool is_partial = false;

      if (!rangeHeader.empty() && rangeHeader.rfind("bytes=", 0) == 0) {
        std::string spec = rangeHeader.substr(6);
        size_t dash = spec.find('-');
        if (dash != std::string::npos) {
          std::string s = spec.substr(0, dash);
          std::string e = spec.substr(dash + 1);
          try {
            if (!s.empty()) start = std::stoull(s);
            if (!e.empty()) end = std::stoull(e);
            else end = size - 1;

            if (start >= size || end >= size || start > end) {
              // Instead of failing, reset to full file
              start = 0;
              end = size - 1;
              is_partial = false;
            }
            if (start <= end) is_partial = true;
          } catch (...) {
            start = 0;
            end = size - 1;
          }
        }
      }

      uint64_t chunk_size = end - start + 1;

      // Set headers (VERY IMPORTANT)
      if (is_partial) {
        res.status = 206;
        std::string cr = "bytes " + std::to_string(start) + "-" + std::to_string(end) + "/" + std::to_string(size);
        res.set_header("Content-Range", cr);
        res.set_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
        std::cout << "  Serving 206 Range: " << cr << "\n";
      } else {
        res.status = 200;
        std::cout << "  Serving 200: Full file\n";
      }

      res.set_header("Accept-Ranges", "bytes");

      // Stream EXACT bytes with proper seek logic
      res.set_content_provider(
          chunk_size,
          "audio/mp4",
          [start, chunk_size, file](uint64_t offset, uint64_t length, httplib::DataSink &sink) {

              std::ifstream ifs(file, std::ios::binary);
              if (!ifs) return false;

              // CRITICAL: Seek to start + offset for proper range streaming
              ifs.seekg(static_cast<std::streamoff>(start + offset));
              
              // Check if seek failed
              if (ifs.fail()) {
                  std::cout << "  Seek failed for offset " << offset << std::endl;
                  return false;
              }

              char buffer[8192];
              uint64_t remaining = length;

              while (remaining > 0 && ifs) {
                  size_t read_size = std::min<uint64_t>(sizeof(buffer), remaining);
                  ifs.read(buffer, read_size);
                  size_t actual = ifs.gcount();

                  if (actual == 0) {
                      if (ifs.eof()) {
                          std::cout << "  EOF reached at offset " << offset << std::endl;
                          break;
                      } else if (ifs.fail()) {
                          std::cout << "  Read failed at offset " << offset << std::endl;
                          break;
                      }
                  }

                  if (!sink.write(buffer, actual)) return false;
                  remaining -= actual;
              }

              return true;
          }
      );
      
    } catch (const std::exception& e) {
      std::cout << "  Exception: " << e.what() << std::endl;
      res.status = 500;
      res.set_content("{\"error\":\"internal server error\"}", "application/json");
      return;
    }
  });

  svr.Post("/api/convert", [&](const httplib::Request& req, httplib::Response& res) {
    std::error_code ec;
    if (!have_ffmpeg) {
      res.status = 503;
      res.set_content("{\"error\":\"ffmpeg not found on PATH\"}", "application/json");
      return;
    }
    if (!req.has_file("file")) {
      res.status = 400;
      res.set_content("{\"error\":\"expected multipart field 'file'\"}", "application/json");
      return;
    }
    const auto& f = req.get_file_value("file");
    if (f.content.empty()) {
      res.status = 400;
      res.set_content("{\"error\":\"empty file\"}", "application/json");
      return;
    }

    const std::string id = gen_id();
    const fs::path job_dir = jobs_dir / id;
    fs::create_directories(job_dir, ec);

    std::string base = f.filename;
    if (base.empty()) base = "upload.bin";
    const fs::path input_path = job_dir / ("in_" + base);

    {
      std::ofstream ofs(input_path, std::ios::binary);
      ofs.write(f.content.data(), static_cast<std::streamsize>(f.content.size()));
    }

    const fs::path output_path = job_dir / "output.m4a";
    if (!ffmpeg_to_m4a(input_path, output_path)) {
      fs::remove_all(job_dir, ec);
      res.status = 500;
      res.set_content("{\"error\":\"ffmpeg conversion failed\"}", "application/json");
      return;
    }

    write_meta(job_dir, base, "upload");
    fs::remove(input_path, ec);

    std::ostringstream body;
    body << "{\"id\":\"" << id << "\",\"title\":\"" << json_escape(base) << "\"}";
    res.set_content(body.str(), "application/json");
  });

  svr.Post("/api/convert-url", [&](const httplib::Request& req, httplib::Response& res) {
    std::error_code ec;
    if (!have_ffmpeg) {
      res.status = 503;
      res.set_content("{\"error\":\"ffmpeg not found on PATH\"}", "application/json");
      return;
    }
    if (!have_ytdlp) {
      res.status = 503;
      res.set_content("{\"error\":\"yt-dlp not found on PATH (needed for URLs)\"}", "application/json");
      return;
    }

    std::string url;
    {
      const auto pos = req.body.find("\"url\"");
      if (pos == std::string::npos) {
        res.status = 400;
        res.set_content("{\"error\":\"JSON body must contain url\"}", "application/json");
        return;
      }
      const auto colon = req.body.find(':', pos);
      const auto q1 = req.body.find('"', colon);
      const auto q2 = req.body.find('"', q1 + 1);
      if (q1 == std::string::npos || q2 == std::string::npos || q2 <= q1) {
        res.status = 400;
        res.set_content("{\"error\":\"invalid JSON\"}", "application/json");
        return;
      }
      url = req.body.substr(q1 + 1, q2 - q1 - 1);
    }
    if (url.empty()) {
      res.status = 400;
      res.set_content("{\"error\":\"empty url\"}", "application/json");
      return;
    }

    const std::string id = gen_id();
    const fs::path job_dir = jobs_dir / id;
    fs::create_directories(job_dir, ec);

    std::string yerr;
    if (!ytdlp_download(job_dir, url, yerr)) {
      fs::remove_all(job_dir, ec);
      res.status = 502;
      std::ostringstream j;
      j << "{\"error\":\"" << json_escape(yerr) << "\"}";
      res.set_content(j.str(), "application/json");
      return;
    }

    const fs::path raw = raw_download_glob(job_dir);
    if (raw.empty()) {
      fs::remove_all(job_dir, ec);
      res.status = 500;
      res.set_content("{\"error\":\"download produced no file\"}", "application/json");
      return;
    }

    const fs::path output_path = job_dir / "output.m4a";
    if (!ffmpeg_to_m4a(raw, output_path)) {
      fs::remove_all(job_dir, ec);
      res.status = 500;
      res.set_content("{\"error\":\"ffmpeg could not encode audio\"}", "application/json");
      return;
    }

    fs::remove(raw, ec);
    const std::string title = "URL import";
    write_meta(job_dir, title, "url");

    std::ostringstream body;
    body << "{\"id\":\"" << id << "\",\"title\":\"" << json_escape(title) << "\"}";
    res.set_content(body.str(), "application/json");
  });

  std::cout << "SpotX server listening on http://127.0.0.1:" << port << "\n";
  std::cout << "Data: " << fs::absolute(data_root) << "\n";
  std::cout << "ffmpeg: " << (have_ffmpeg ? "yes" : "NO — add to PATH") << "\n";
  std::cout << "yt-dlp: " << (have_ytdlp ? "yes" : "optional, for URL import") << "\n";

  if (!svr.listen("0.0.0.0", port)) {
    std::cerr << "Failed to bind port " << port << "\n";
    return 1;
  }
  return 0;
}
