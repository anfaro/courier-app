package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

const Version = "1.7.0"

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("courier-cli %s\n", Version)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
