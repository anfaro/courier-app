package cmd

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/spf13/cobra"
)

var databaseURL string

var rootCmd = &cobra.Command{
	Use:   "courier-cli",
	Short: "CLI companion for Courier SuperApp",
	Long:  "Manage database backups, users, and roles for the Courier SuperApp.",
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVar(&databaseURL, "database-url", "", "PostgreSQL connection string (or set DATABASE_URL env)")
}

func loadDotenv() {
	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	// Try current dir, then parent (handles running from cli/ and project root)
	for _, dir := range []string{cwd, filepath.Dir(cwd)} {
		for _, name := range []string{".env.local", ".env"} {
			dotenvPath := filepath.Join(dir, name)
			f, err := os.Open(dotenvPath)
			if err != nil {
				continue
			}
			defer f.Close()

			scanner := bufio.NewScanner(f)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				eq := strings.IndexByte(line, '=')
				if eq < 1 {
					continue
				}
				key := strings.TrimSpace(line[:eq])
				val := strings.TrimSpace(line[eq+1:])
				val = strings.Trim(val, "\"'")
				if key == "DATABASE_URL" && os.Getenv("DATABASE_URL") == "" {
					os.Setenv("DATABASE_URL", val)
				}
			}
			if os.Getenv("DATABASE_URL") != "" {
				return
			}
		}
	}
}

func connectDB() (*pgxpool.Pool, error) {
	loadDotenv()

	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		return nil, fmt.Errorf("--database-url flag or DATABASE_URL env required")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	return pool, nil
}
