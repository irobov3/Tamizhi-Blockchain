package main

import (
	"fmt"
	"os"

	svrcmd "github.com/cosmos/cosmos-sdk/server/cmd"
	"github.com/tamizhi/chain/app"
)

func main() {
	rootCmd := app.NewRootCmd()
	if err := svrcmd.Execute(rootCmd, app.EnvPrefix, app.DefaultNodeHome); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
