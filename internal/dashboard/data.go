// Package dashboard provides a web-based dashboard for viewing
// Crush sessions across multiple projects.
package dashboard

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/charmbracelet/crush/internal/db"
	"github.com/charmbracelet/crush/internal/projects"
	"github.com/charmbracelet/crush/internal/session"
	"github.com/google/uuid"
)

// Project represents a tracked project with its sessions.
type Project struct {
	Path         string    `json:"path"`
	DataDir      string    `json:"data_dir"`
	LastAccessed time.Time `json:"last_accessed"`
	Sessions     []Session `json:"sessions"`
}

// Session represents a session with metadata.
type Session struct {
	ID               string  `json:"id"`
	Title            string  `json:"title"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
	MessageCount     int64   `json:"message_count"`
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	Cost             float64 `json:"cost"`
	DataDir          string  `json:"data_dir"`
}

// MessagePart represents a single part of a message.
type MessagePart struct {
	Type       string `json:"type"`
	Text       string `json:"text,omitempty"`
	Thinking   string `json:"thinking,omitempty"`
	StartedAt  *int64 `json:"started_at,omitempty"`
	FinishedAt *int64 `json:"finished_at,omitempty"`
	ToolName   string `json:"name,omitempty"`
	ToolCallID string `json:"tool_call_id,omitempty"`
	ToolInput  string `json:"input,omitempty"`
	Content    string `json:"content,omitempty"`
	IsError    bool   `json:"is_error,omitempty"`
	MimeType   string `json:"mime_type,omitempty"`
	URL        string `json:"url,omitempty"`
	Detail     string `json:"detail,omitempty"`
	Size       int64  `json:"size,omitempty"`
	Reason     string `json:"reason,omitempty"`
	Time       string `json:"time,omitempty"`
}

// Message represents a message in a session.
type Message struct {
	ID        string        `json:"id"`
	SessionID string        `json:"session_id"`
	Role      string        `json:"role"`
	Parts     []MessagePart `json:"parts"`
	Model     string        `json:"model"`
	Provider  string        `json:"provider"`
	CreatedAt string        `json:"created_at"`
}

// SessionDetail is a session with all its messages.
type SessionDetail struct {
	Session
	Messages []Message `json:"messages"`
}

// LoadProjects reads all tracked projects and fetches their sessions from SQLite.
func LoadProjects() ([]Project, error) {
	projList, err := projects.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load projects: %w", err)
	}

	result := make([]Project, 0, len(projList.Projects))
	for _, p := range projList.Projects {
		sessions, err := loadSessionsForProject(p)
		if err != nil {
			// Continue loading other projects
			sessions = nil
		}
		result = append(result, Project{
			Path:         p.Path,
			DataDir:      p.DataDir,
			LastAccessed: p.LastAccessed,
			Sessions:     sessions,
		})
	}
	return result, nil
}

// resolveSessionID converts a 7-char hash prefix to a UUID.
// If the sessionID is already a valid UUID, return it directly.
// Otherwise, list all sessions and match the hash prefix.
func resolveSessionID(ctx context.Context, q *db.Queries, sessionID string) (string, error) {
	// Try parsing as UUID first.
	if _, err := uuid.Parse(sessionID); err == nil {
		return sessionID, nil
	}

	// List all sessions and match hash prefix.
	sessions, err := q.ListSessions(ctx)
	if err != nil {
		return "", fmt.Errorf("list sessions failed: %w", err)
	}

	for _, s := range sessions {
		hash := session.HashID(s.ID)
		if strings.HasPrefix(hash, sessionID) {
			return s.ID, nil
		}
	}

	return "", fmt.Errorf("session not found: %q", sessionID)
}

func loadSessionsForProject(p projects.Project) ([]Session, error) {
	ctx := context.Background()
	conn, err := db.Connect(ctx, p.DataDir)
	if err != nil {
		return nil, err
	}
	defer func() { _ = db.Release(p.DataDir) }()

	q := db.New(conn)
	sessions, err := q.ListSessions(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]Session, 0, len(sessions))
	for _, s := range sessions {
		result = append(result, Session{
			ID:               session.HashID(s.ID),
			Title:            s.Title,
			CreatedAt:        time.Unix(s.CreatedAt, 0).UTC().Format(time.RFC3339),
			UpdatedAt:        time.Unix(s.UpdatedAt, 0).UTC().Format(time.RFC3339),
			MessageCount:     s.MessageCount,
			PromptTokens:     s.PromptTokens,
			CompletionTokens: s.CompletionTokens,
			Cost:             s.Cost,
			DataDir:          p.DataDir,
		})
	}
	return result, nil
}

// GetSessionDetail returns a session with all its messages.
func GetSessionDetail(dataDir, sessionID string) (*SessionDetail, error) {
	ctx := context.Background()
	conn, err := db.Connect(ctx, dataDir)
	if err != nil {
		return nil, err
	}
	defer func() { _ = db.Release(dataDir) }()

	q := db.New(conn)

	// Resolve session ID: frontend sends 7-char hash, DB needs UUID.
	// Try direct UUID lookup first, then list sessions and match hash prefix.
	resolvedID, err := resolveSessionID(ctx, q, sessionID)
	if err != nil {
		return nil, err
	}

	sess, err := q.GetSessionByID(ctx, resolvedID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	messages, err := q.ListMessagesBySession(ctx, resolvedID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	msgs := make([]Message, 0, len(messages))
	for _, m := range messages {
		parts, err := parseParts(m.Parts)
		if err != nil {
			return nil, fmt.Errorf("failed to parse parts for message %s: %w", m.ID, err)
		}
		model := m.Model.String
		provider := m.Provider.String
		msgs = append(msgs, Message{
			ID:        m.ID,
			SessionID: m.SessionID,
			Role:      m.Role,
			Parts:     parts,
			Model:     model,
			Provider:  provider,
			CreatedAt: time.Unix(m.CreatedAt, 0).UTC().Format(time.RFC3339),
		})
	}

	return &SessionDetail{
		Session: Session{
			ID:               session.HashID(sess.ID),
			Title:            sess.Title,
			CreatedAt:        time.Unix(sess.CreatedAt, 0).UTC().Format(time.RFC3339),
			UpdatedAt:        time.Unix(sess.UpdatedAt, 0).UTC().Format(time.RFC3339),
			MessageCount:     sess.MessageCount,
			PromptTokens:     sess.PromptTokens,
			CompletionTokens: sess.CompletionTokens,
			Cost:             sess.Cost,
		},
		Messages: msgs,
	}, nil
}

// RenameSession renames a session using the crush CLI.
func RenameSession(dataDir, sessionID, newTitle string) error {
	cmd := exec.Command("crush", "-D", dataDir, "session", "rename", sessionID, newTitle)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("rename failed: %w: %s", err, string(out))
	}
	return nil
}

// DeleteSession deletes a session using the crush CLI.
func DeleteSession(dataDir, sessionID string) error {
	cmd := exec.Command("crush", "-D", dataDir, "session", "delete", sessionID)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("delete failed: %w: %s", err, string(out))
	}
	return nil
}

// OpenTerminal opens an external terminal emulator at the given directory.
func OpenTerminal(dir string, sessionID string) error {
	cmd := buildTerminalCommand(dir, sessionID)
	return exec.Command(cmd[0], cmd[1:]...).Start()
}

// buildTerminalCommand builds a command to open an external terminal.
func buildTerminalCommand(dir string, sessionID string) []string {
	args := buildTerminalShellArgs(dir, sessionID)

	switch runtime.GOOS {
	case "darwin":
		return []string{"open", "-a", "Terminal", "--args", "bash", "-c", args}
	case "windows":
		d := dir
		if len(args) > 0 {
			d = fmt.Sprintf(`/D "%s"`, dir)
		}
		if sessionID != "" {
			return []string{"cmd", "/c", fmt.Sprintf("start \"crush\" %s cmd /k \"crush --session %s\"", d, sessionID)}
		}
		return []string{"cmd", "/c", fmt.Sprintf("start \"crush\" %s cmd /k \"crush\"", d)}
	default:
		// Linux — detect terminal
		return buildLinuxTerminalCommand(dir, sessionID, args)
	}
}

func buildTerminalShellArgs(dir string, sessionID string) string {
	if sessionID != "" {
		return fmt.Sprintf(`cd "%s" && crush --session %s && read -n1 -s -r -p "Press any key to close..."`, dir, sessionID)
	}
	return fmt.Sprintf(`cd "%s" && crush && read -n1 -s -r -p "Press any key to close..."`, dir)
}

func buildLinuxTerminalCommand(dir, sessionID, args string) []string {
	terminals := []struct {
		envKey string
		cmd    string
		args   []string
	}{
		{"GNOME_TERMINAL_SERVICE", "gnome-terminal", nil},
		{"KDE_PLASMA_WORKSPACE", "konsole", nil},
		{"ALACRITTY_SOCKET", "alacritty", nil},
		{"KITTY_LISTEN_ON", "kitty", nil},
	}
	for _, t := range terminals {
		if os.Getenv(t.envKey) != "" {
			switch t.cmd {
			case "konsole":
				return []string{"konsole", "--workdir", dir, "-e", "crush"}
			case "gnome-terminal":
				return []string{"gnome-terminal", "--", "bash", "-c", args}
			case "alacritty":
				return []string{"alacritty", "-e", "bash", "-c", args}
			case "kitty":
				return []string{"kitty", "-e", "bash", "-c", args}
			}
		}
	}
	// Fallback
	return []string{"gnome-terminal", "--", "bash", "-c", args}
}

// getData extracts the nested "data" map from a part, or returns nil if absent.
func getData(p map[string]interface{}) map[string]interface{} {
	if v, ok := p["data"]; ok {
		if d, ok := v.(map[string]interface{}); ok {
			return d
		}
	}
	return nil
}

// parseParts parses the JSON parts string into MessagePart slices.
func parseParts(partsJSON string) ([]MessagePart, error) {
	if partsJSON == "" {
		return nil, nil
	}
	var raw []map[string]interface{}
	if err := json.Unmarshal([]byte(partsJSON), &raw); err != nil {
		return nil, err
	}

	parts := make([]MessagePart, 0, len(raw))
	for _, p := range raw {
		data := getData(p)
		part := MessagePart{
			Type: getString(p, "type"),
		}

		switch part.Type {
		case "text":
			if data != nil {
				part.Text = getString(data, "text")
			}
		case "reasoning":
			if data != nil {
				part.Thinking = getString(data, "thinking")
			}
			if v, ok := p["started_at"]; ok {
				if n, ok := v.(float64); ok {
					n64 := int64(n)
					part.StartedAt = &n64
				}
			}
			if v, ok := p["finished_at"]; ok {
				if n, ok := v.(float64); ok {
					n64 := int64(n)
					part.FinishedAt = &n64
				}
			}
		case "tool_call":
			if data != nil {
				part.ToolName = getString(data, "name")
				part.ToolCallID = getString(data, "id")
				part.ToolInput = getString(data, "input")
			}
			if v, ok := p["provider"]; ok {
				if s, ok := v.(string); ok {
					part.Detail = s
				}
			}
		case "tool_result":
			if data != nil {
				part.ToolCallID = getString(data, "tool_call_id")
				part.ToolName = getString(data, "name")
				part.Content = getString(data, "content")
			}
			if v, ok := p["is_error"]; ok {
				if b, ok := v.(bool); ok {
					part.IsError = b
				}
			}
			part.MimeType = getString(p, "mime_type")
		case "binary":
			part.MimeType = getString(p, "mime_type")
			if v, ok := p["size"]; ok {
				if n, ok := v.(float64); ok {
					part.Size = int64(n)
				}
			}
		case "image_url":
			part.URL = getString(p, "url")
			part.Detail = getString(p, "detail")
		case "finish":
			if data != nil {
				part.Reason = getString(data, "reason")
				part.Time = getString(data, "time")
			}
		}
		parts = append(parts, part)
	}
	return parts, nil
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
