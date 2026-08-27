package internal

import (
	"crypto/rand"
	"math/big"
)

const nanoidAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

func GenerateID() string {
	b := make([]byte, 7)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(nanoidAlphabet))))
		if err != nil {
			panic("crypto/rand failed: " + err.Error())
		}
		b[i] = nanoidAlphabet[n.Int64()]
	}
	return string(b)
}
