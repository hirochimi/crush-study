package cmd

import (
	"log/slog"

	"github.com/charmbracelet/crush/internal/dashboard"
	"github.com/spf13/cobra"
)

var dashboardCmd = &cobra.Command{
	Use:   "dashboard",
	Short: "Open the Crush dashboard in a web browser",
	Long: `Open a web-based dashboard to browse and view Crush sessions
across multiple projects. The dashboard will open in your default
web browser and serve on a local port.

The dashboard shows:
- A tree view of all tracked projects and their sessions
- Chat-style conversation details for each session
- Right-click menus for session management (open, rename, delete)`,
	RunE: func(cmd *cobra.Command, args []string) error {
		debug, _ := cmd.Flags().GetBool("debug")
		if err := dashboard.Start(debug); err != nil {
			slog.Error("Dashboard failed", "error", err)
			return err
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(dashboardCmd)
	dashboardCmd.Flags().Bool("debug", false, "enable debug logging")
}
