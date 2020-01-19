#!/usr/bin/env bash

. ~/load_mainnet

count=0
function check() {
    res=$(seth balance "$1")
    [[ "$res" -ne 0 ]] && {
        seth --from-wei "$res"
        count=$((count + 1))
    }
}

cat addresses.json | jq -r 'values[]' | check "$1"

echo "$count out of 176 with ETH Balance"
