#!/usr/bin/env bash

wf-recorder $@ &
echo "PID: $!"
exit 0
