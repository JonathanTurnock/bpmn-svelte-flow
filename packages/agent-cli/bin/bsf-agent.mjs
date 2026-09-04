#!/usr/bin/env node
import { main } from '../src/agent-cli.mjs';

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
