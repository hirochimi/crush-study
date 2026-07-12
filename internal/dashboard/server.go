package dashboard

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"
)

//go:embed index.html
var htmlFS embed.FS

// Start launches the dashboard HTTP server and opens it in the default browser.
func Start(debug bool) error {
	// Set up slog to output to stderr (root.go sets DiscardHandler).
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	if debug {
		opts.Level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, opts)))

	mux := http.NewServeMux()

	mux.HandleFunc("/api/projects", handleProjects)
	mux.HandleFunc("/api/sessions/", handleSessionMessages)
	mux.HandleFunc("/api/command", handleCommand)
	mux.HandleFunc("/", handleStatic)

	addr := findFreePort()
	server := &http.Server{
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	l, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}
	url := "http://" + l.Addr().String()

	// Open in browser
	if err := openBrowser(url); err != nil {
		slog.Warn("Failed to open browser", "url", url, "error", err)
		log.Printf("Dashboard URL: %s", url)
	}

	slog.Info("Dashboard server started", "url", url)

	// Graceful shutdown on SIGINT/SIGTERM
	errch := make(chan error, 1)
	sigch := make(chan os.Signal, 1)
	signal.Notify(sigch, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		errch <- server.Serve(l)
	}()

	select {
	case sig := <-sigch:
		slog.Info("Received signal %v, shutting down...", "signal", sig)
	case err = <-errch:
		if err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server error: %w", err)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		slog.Error("Failed to shutdown server", "error", err)
		return fmt.Errorf("failed to shutdown: %w", err)
	}

	slog.Info("Dashboard server stopped")
	return nil
}

func findFreePort() string {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "127.0.0.1:8080"
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	return fmt.Sprintf("127.0.0.1:%d", port)
}

func openBrowser(url string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", url).Start()
	case "windows":
		return exec.Command("start", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

func handleProjects(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data, err := LoadProjects()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func handleSessionMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := r.URL.Path
	const prefix = "/api/sessions/"
	if len(sessionID) <= len(prefix) || sessionID[:len(prefix)] != prefix {
		http.NotFound(w, r)
		return
	}
	sessionID = sessionID[len(prefix):]

	// Extract dataDir from query parameter
	dataDir := r.URL.Query().Get("dataDir")
	if dataDir == "" {
		http.Error(w, "dataDir required", http.StatusBadRequest)
		return
	}

	slog.Debug("handleSessionMessages", "session_id", sessionID, "dataDir_raw", dataDir)

	data, err := GetSessionDetail(dataDir, sessionID)
	if err != nil {
		slog.Error("Session detail failed", "session_id", sessionID, "data_dir", dataDir, "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func handleCommand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Action    string `json:"action"`
		SessionID string `json:"sessionId"`
		DataDir   string `json:"dataDir"`
		Title     string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	resp := map[string]interface{}{"success": false}
	defer func() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}()

	switch req.Action {
	case "open":
		if err := OpenTerminal(req.DataDir, req.SessionID); err != nil {
			resp["error"] = err.Error()
			return
		}
		resp["success"] = true
	case "open_new":
		if err := OpenTerminal(req.DataDir, ""); err != nil {
			resp["error"] = err.Error()
			return
		}
		resp["success"] = true
	case "rename":
		if err := RenameSession(req.DataDir, req.SessionID, req.Title); err != nil {
			resp["error"] = err.Error()
			return
		}
		resp["success"] = true
		resp["reloaded"] = true
	case "delete":
		if err := DeleteSession(req.DataDir, req.SessionID); err != nil {
			resp["error"] = err.Error()
			return
		}
		resp["success"] = true
		resp["reloaded"] = true
	default:
		resp["error"] = "unknown action: " + req.Action
		return
	}
}

func handleStatic(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/" || path == "" {
		path = "/index.html"
	}

	// Read from embedded FS
	data, err := htmlFS.ReadFile(path)
	if err != nil {
		// Try index.html for client-side routing
		data, err = htmlFS.ReadFile("index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}

	// Determine content type
	if strings.HasSuffix(path, ".html") || path == "index.html" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	} else if strings.HasSuffix(path, ".css") {
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	} else if strings.HasSuffix(path, ".js") {
		w.Header().Set("Content-Type", "application/javascript")
	}

	w.Write(data)
}
