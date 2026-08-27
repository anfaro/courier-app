package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/anfaro/courier-app/cli/internal"
	"github.com/spf13/cobra"
)

var userCmd = &cobra.Command{
	Use:   "user",
	Short: "Manage users",
}

var userAddCmd = &cobra.Command{
	Use:   "add",
	Short: "Create a new user",
	RunE: func(cmd *cobra.Command, args []string) error {
		name, _ := cmd.Flags().GetString("name")
		email, _ := cmd.Flags().GetString("email")
		password, _ := cmd.Flags().GetString("password")
		role, _ := cmd.Flags().GetString("role")

		if name == "" || email == "" || password == "" {
			return fmt.Errorf("--name, --email, and --password are required")
		}
		if len(password) < 8 {
			return fmt.Errorf("password must be at least 8 characters")
		}
		if role == "" {
			role = "courier"
		}

		hash, err := internal.HashPassword(password)
		if err != nil {
			return fmt.Errorf("failed to hash password: %w", err)
		}

		id := internal.GenerateID()

		pool, err := connectDB()
		if err != nil {
			return err
		}
		defer pool.Close()

		ctx := context.Background()
		_, err = pool.Exec(ctx, `
			INSERT INTO users (id, name, email, password, role, rate, "target_system", "get_geocode", "token_version", is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, 1500, true, true, 1, true, NOW(), NOW())
		`, id, name, email, hash, role)
		if err != nil {
			if strings.Contains(err.Error(), "unique") {
				return fmt.Errorf("email %s already exists", email)
			}
			return fmt.Errorf("failed to create user: %w", err)
		}

		fmt.Printf("User created successfully!\n")
		fmt.Printf("  ID:    %s\n", id)
		fmt.Printf("  Name:  %s\n", name)
		fmt.Printf("  Email: %s\n", email)
		fmt.Printf("  Role:  %s\n", role)
		return nil
	},
}

var userRemoveCmd = &cobra.Command{
	Use:   "remove",
	Short: "Delete a user",
	RunE: func(cmd *cobra.Command, args []string) error {
		email, _ := cmd.Flags().GetString("email")
		id, _ := cmd.Flags().GetString("id")

		if email == "" && id == "" {
			return fmt.Errorf("--email or --id is required")
		}

		pool, err := connectDB()
		if err != nil {
			return err
		}
		defer pool.Close()

		ctx := context.Background()
		var result string
		if email != "" {
			_, err = pool.Exec(ctx, "DELETE FROM users WHERE email = $1", email)
			result = email
		} else {
			_, err = pool.Exec(ctx, "DELETE FROM users WHERE id = $1", id)
			result = id
		}
		if err != nil {
			return fmt.Errorf("failed to delete user: %w", err)
		}

		fmt.Printf("User %s deleted successfully.\n", result)
		return nil
	},
}

var userRoleCmd = &cobra.Command{
	Use:   "role",
	Short: "Change user role",
	RunE: func(cmd *cobra.Command, args []string) error {
		email, _ := cmd.Flags().GetString("email")
		role, _ := cmd.Flags().GetString("role")

		if email == "" || role == "" {
			return fmt.Errorf("--email and --role are required")
		}

		validRoles := map[string]bool{"courier": true, "superadmin": true}
		if !validRoles[role] {
			return fmt.Errorf("invalid role %q — must be 'courier' or 'superadmin'", role)
		}

		pool, err := connectDB()
		if err != nil {
			return err
		}
		defer pool.Close()

		ctx := context.Background()
		tag, err := pool.Exec(ctx, `UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2`, role, email)
		if err != nil {
			return fmt.Errorf("failed to update role: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("user with email %s not found", email)
		}

		fmt.Printf("User %s role changed to %s.\n", email, role)
		return nil
	},
}

var userListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all users",
	RunE: func(cmd *cobra.Command, args []string) error {
		roleFilter, _ := cmd.Flags().GetString("role")

		pool, err := connectDB()
		if err != nil {
			return err
		}
		defer pool.Close()

		ctx := context.Background()
		query := `SELECT id, name, email, role, is_active FROM users`
		var args2 []interface{}
		if roleFilter != "" {
			query += ` WHERE role = $1`
			args2 = append(args2, roleFilter)
		}
		query += ` ORDER BY name`

		rows, err := pool.Query(ctx, query, args2...)
		if err != nil {
			return fmt.Errorf("failed to query users: %w", err)
		}
		defer rows.Close()

		fmt.Printf("%-7s  %-20s  %-30s  %-12s  %s\n", "ID", "NAME", "EMAIL", "ROLE", "ACTIVE")
		fmt.Println(strings.Repeat("-", 90))

		count := 0
		for rows.Next() {
			var id, name, email, role string
			var isActive *bool
			if err := rows.Scan(&id, &name, &email, &role, &isActive); err != nil {
				return fmt.Errorf("failed to scan user: %w", err)
			}
			active := "—"
			if isActive != nil {
				if *isActive {
					active = "yes"
				} else {
					active = "no"
				}
			}
			fmt.Printf("%-7s  %-20s  %-30s  %-12s  %s\n", id, truncateStr(name, 20), truncateStr(email, 30), role, active)
			count++
		}

		fmt.Printf("\n%d user(s) found.\n", count)
		return nil
	},
}

var userResetPasswordCmd = &cobra.Command{
	Use:   "reset-password",
	Short: "Reset a user's password",
	RunE: func(cmd *cobra.Command, args []string) error {
		email, _ := cmd.Flags().GetString("email")
		newPassword, _ := cmd.Flags().GetString("new-password")

		if email == "" || newPassword == "" {
			return fmt.Errorf("--email and --new-password are required")
		}
		if len(newPassword) < 8 {
			return fmt.Errorf("password must be at least 8 characters")
		}

		hash, err := internal.HashPassword(newPassword)
		if err != nil {
			return fmt.Errorf("failed to hash password: %w", err)
		}

		pool, err := connectDB()
		if err != nil {
			return err
		}
		defer pool.Close()

		ctx := context.Background()
		tag, err := pool.Exec(ctx, `UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2`, hash, email)
		if err != nil {
			return fmt.Errorf("failed to reset password: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("user with email %s not found", email)
		}

		fmt.Printf("Password for %s has been reset.\n", email)
		return nil
	},
}

func init() {
	userAddCmd.Flags().String("name", "", "User name")
	userAddCmd.Flags().String("email", "", "User email")
	userAddCmd.Flags().String("password", "", "User password (min 8 chars)")
	userAddCmd.Flags().String("role", "courier", "User role (courier or superadmin)")

	userRemoveCmd.Flags().String("email", "", "User email")
	userRemoveCmd.Flags().String("id", "", "User ID")

	userRoleCmd.Flags().String("email", "", "User email")
	userRoleCmd.Flags().String("role", "", "New role (courier or superadmin)")

	userListCmd.Flags().String("role", "", "Filter by role")

	userResetPasswordCmd.Flags().String("email", "", "User email")
	userResetPasswordCmd.Flags().String("new-password", "", "New password (min 8 chars)")

	userCmd.AddCommand(userAddCmd)
	userCmd.AddCommand(userRemoveCmd)
	userCmd.AddCommand(userRoleCmd)
	userCmd.AddCommand(userListCmd)
	userCmd.AddCommand(userResetPasswordCmd)
	rootCmd.AddCommand(userCmd)
}

func truncateStr(s string, max int) string {
	if len(s) > max {
		return s[:max-3] + "..."
	}
	return s
}
