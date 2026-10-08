package model

import (
	"cmp"
	"fmt"
	"image"
	"image/color"
	"regexp"
	"strings"

	"charm.land/lipgloss/v2"
	mcp "github.com/charmbracelet/crush/internal/agent/tools/mcp"
	"github.com/charmbracelet/crush/internal/config"
	"github.com/charmbracelet/crush/internal/ui/common"
	"github.com/charmbracelet/crush/internal/ui/logo"
	uv "github.com/charmbracelet/ultraviolet"
	"github.com/charmbracelet/ultraviolet/layout"
)

var ansiEscapeRegex = regexp.MustCompile(`\x1b\[[0-9;]*m`)

// modelInfo renders the current model information including reasoning
// settings and context usage/cost for the sidebar.
func (m *UI) modelInfo(width int) string {
	model := m.selectedLargeModel()
	reasoningInfo := ""
	providerName := ""

	if model != nil {
		// Get provider name first
		providerConfig, ok := m.com.Config().Providers.Get(model.ModelCfg.Provider)
		if ok {
			providerName = providerConfig.Name

			// Only check reasoning if model can reason
			if model.CatwalkCfg.CanReason {
				if len(model.CatwalkCfg.ReasoningLevels) == 0 {
					if model.ModelCfg.Think {
						reasoningInfo = "Thinking On"
					} else {
						reasoningInfo = "Thinking Off"
					}
				} else {
					reasoningEffort := cmp.Or(model.ModelCfg.ReasoningEffort, model.CatwalkCfg.DefaultReasoningEffort)
					reasoningInfo = fmt.Sprintf("Reasoning %s", common.FormatReasoningEffort(reasoningEffort))
				}
			}
		}
	}

	var modelContext *common.ModelContextInfo
	if model != nil && m.session != nil {
		modelContext = &common.ModelContextInfo{
			ContextUsed:    m.session.CompletionTokens + m.session.PromptTokens,
			Cost:           m.session.Cost,
			ModelContext:   model.CatwalkCfg.ContextWindow,
			EstimatedUsage: m.session.EstimatedUsage,
		}
	}
	var modelName string
	if model != nil {
		modelName = model.CatwalkCfg.Name
	}
	return common.ModelInfo(m.com.Styles, modelName, providerName, reasoningInfo, modelContext, width, m.hyperCredits)
}

// updateSidebarScrollState renders the sidebar content and computes scroll
// state (scrollability, max offset, clamp) before drawing. This keeps all
// state mutation in the update path rather than in the draw function.
func (m *UI) updateSidebarScrollState() {
	if m.session == nil || m.isCompact {
		return
	}

	const logoHeightBreakpoint = 30

	t := m.com.Styles
	width := m.layout.sidebar.Dx()
	height := m.layout.sidebar.Dy()

	contentWidth := max(width-2, 1)

	title := t.Sidebar.SessionTitle.Width(contentWidth).MaxHeight(2).Render(m.session.Title)
	cwd := common.PrettyPathWithBranch(t, m.com.Workspace.WorkingDir(), m.gitBranch, contentWidth)
	sidebarLogo := m.sidebarLogo
	if height < logoHeightBreakpoint {
		sidebarLogo = lipgloss.JoinVertical(lipgloss.Left, logo.SmallRender(m.com.Styles, contentWidth, logo.Opts{
			Hyper: m.com.IsHyper(),
		}), "")
	}

	var logoRect, contentRect image.Rectangle
	layout.Vertical(
		layout.Len(lipgloss.Height(sidebarLogo)),
		layout.Fill(1),
	).Split(m.layout.sidebar).Assign(&logoRect, &contentRect)

	contentHeight := contentRect.Dy()

	// Render all items without truncation; virtual scrolling handles overflow.
	lspSection := m.lspInfo(contentWidth, len(m.lspStates), true)
	mcpSection := m.mcpInfo(contentWidth, mcpCount(m.com.Config().MCP.Sorted(), m.mcpStates), true)
	skillsSection := m.skillsInfo(contentWidth, len(m.skillStatusItems()), true)
	filesSection := m.filesInfo(m.com.Workspace.WorkingDir(), contentWidth, fileChangeCount(m.sessionFiles), true)

	// Build the scrollable content.
	content := lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		"",
		cwd,
		"",
		m.modelInfo(contentWidth),
		"",
		filesSection,
		"",
		lspSection,
		"",
		mcpSection,
		"",
		skillsSection,
	)

	totalLines := strings.Count(content, "\n") + 1
	m.sidebarContent = content
	m.sidebarTotalLines = totalLines
	m.sidebarContentWidth = contentWidth
	m.sidebarContentHeight = contentHeight
	m.sidebarDrawLogo = sidebarLogo
	m.sidebarScrollable = totalLines > contentHeight
	m.sidebarMaxOffsetVal = max(0, totalLines-contentHeight)

	// If the sidebar is focused but no longer scrollable (e.g. after a
	// resize), return focus to the chat.
	if m.focus == uiFocusSidebar && !m.sidebarScrollable {
		m.focus = uiFocusMain
		m.chat.Focus()
	}

	// Clamp sidebarOffset.
	if m.sidebarOffset > m.sidebarMaxOffsetVal {
		m.sidebarOffset = m.sidebarMaxOffsetVal
	}
}

// drawSidebar renders the chat sidebar with a fixed logo and a
// virtual-scrolling content area with an auto-hiding scrollbar. While the
// sidebar is focused, the scrollbar stays visible.
func (m *UI) drawSidebar(scr uv.Screen, area uv.Rectangle) {
	if m.session == nil {
		return
	}

	// Use cached logo as-is normally, but replace all colors with white when agent is busy.
	sidebarLogo := m.sidebarDrawLogo
	if m.isAgentBusy() {
		sidebarLogo = replaceColorsWithWhite(sidebarLogo)
	}
	contentWidth := m.sidebarContentWidth
	contentHeight := m.sidebarContentHeight
	totalLines := m.sidebarTotalLines

	var logoRect, contentRect image.Rectangle
	layout.Vertical(
		layout.Len(lipgloss.Height(sidebarLogo)),
		layout.Fill(1),
	).Split(area).Assign(&logoRect, &contentRect)

	// Slice visible lines.
	end := min(m.sidebarOffset+contentHeight, totalLines)
	lines := strings.Split(m.sidebarContent, "\n")
	visibleLines := lines[m.sidebarOffset:end]
	visibleStr := strings.Join(visibleLines, "\n")

	// Determine scrollbar visibility: always visible when focused, otherwise
	// auto-hide.
	scrollbarVisible := totalLines > contentHeight && (m.sidebarScrollbarVisible || m.focus == uiFocusSidebar)

	// Draw the fixed logo.
	uv.NewStyledString(
		lipgloss.NewStyle().
			MaxWidth(contentWidth).
			MaxHeight(lipgloss.Height(sidebarLogo)).
			Render(sidebarLogo),
	).Draw(scr, logoRect)

	// Draw the visible content in the scrollable area.
	uv.NewStyledString(
		lipgloss.NewStyle().
			MaxWidth(contentWidth).
			MaxHeight(contentHeight).
			Render(visibleStr),
	).Draw(scr, contentRect)

	// Draw scrollbar in the reserved column.
	if scrollbarVisible {
		scrollbar := common.Scrollbar(m.com.Styles, contentHeight, totalLines, contentHeight, m.sidebarOffset)
		if scrollbar != "" {
			scrollbarArea := image.Rectangle{
				Min: image.Point{X: area.Max.X - 1, Y: contentRect.Min.Y},
				Max: image.Point{X: area.Max.X, Y: area.Max.Y},
			}
			uv.NewStyledString(scrollbar).Draw(scr, scrollbarArea)
		}
	}
}

// replaceColorsWithWhite replaces all ANSI 24-bit color codes (38;2;r;g;b) in the
// cached logo with white (255;255;255). This is used to render the logo in white
// when the agent is busy, without re-rendering the entire logo.
func replaceColorsWithWhite(logo string) string {
	// Pattern matches: ESC[38;2;r;g;b where r,g,b are 1-3 digits
	ansiColorRegex := regexp.MustCompile(`\x1b\[38;2;\d+;\d+;\d+`)
	return ansiColorRegex.ReplaceAllString(logo, "\x1b[38;2;255;255;255")
}

// fileChangeCount returns the number of session files with non-zero additions
// or deletions.
func fileChangeCount(files []SessionFile) int {
	count := 0
	for _, f := range files {
		if f.Additions == 0 && f.Deletions == 0 {
			continue
		}
		count++
	}
	return count
}

// mcpCount returns the number of MCP servers that have a state entry.
func mcpCount(mcpCfgs []config.MCP, states map[string]mcp.ClientInfo) int {
	count := 0
	for _, cfg := range mcpCfgs {
		if _, ok := states[cfg.Name]; ok {
			count++
		}
	}
	return count
}

// replaceTitleGradient creates a "dynamic" logo from a cached one by replacing
// the title gradient colors (TitleColorA/TitleColorB) with the working gradient
// colors (WorkingGradFromColor/WorkingGradToColor). This simulates what drawSidebar
// would render when the agent is busy, without needing to re-run the full logo render.
func replaceTitleGradient(cachedLogo string, oldColorA, oldColorB, newColorA, newColorB color.Color) string {
	// The cached logo has ANSI escape codes for the gradient from oldColorA to oldColorB.
	// We extract the plain text of the title lines and re-apply the gradient with new colors.
	lines := strings.Split(cachedLogo, "\n")
	var result strings.Builder

	for i, line := range lines {
		plain := ansiEscapeRegex.ReplaceAllString(line, "")
		// Check if this is a title line (contains "Charm" or "Crush" or version)
		if strings.Contains(plain, "Charm") || strings.Contains(plain, "devel") ||
			strings.Contains(plain, "Crush") || (strings.Contains(plain, "╱") && i > 1) {
			// Re-apply gradient with new colors
			newLine := applyGradient(plain, newColorA, newColorB)
			result.WriteString(newLine)
		} else {
			// Field lines or empty - keep as is
			result.WriteString(line)
		}
		if i < len(lines)-1 {
			result.WriteString("\n")
		}
	}

	return result.String()
}

// applyGradient applies a foreground gradient from colorA to colorB to text.
func applyGradient(text string, colorA, colorB color.Color) string {
	runes := []rune(text)
	if len(runes) == 0 {
		return ""
	}

	var b strings.Builder
	for i, r := range runes {
		ratio := float64(i) / float64(max(1, len(runes)-1))
		// Interpolate between colorA and colorB using lipgloss color blending
		c := blendColors(colorA, colorB, ratio)
		b.WriteString(lipgloss.NewStyle().Foreground(c).Render(string(r)))
	}
	return b.String()
}

// blendColors interpolates between two colors.
func blendColors(a, b color.Color, t float64) color.Color {
	ra, ga, ba, aa := a.RGBA()
	rb, gb, bb, ab := b.RGBA()

	r := uint16(float64(ra)*(1-t) + float64(rb)*t)
	g := uint16(float64(ga)*(1-t) + float64(gb)*t)
	bl := uint16(float64(ba)*(1-t) + float64(bb)*t)
	al := uint16(float64(aa)*(1-t) + float64(ab)*t)

	return color.RGBA64{R: r, G: g, B: bl, A: al}
}
