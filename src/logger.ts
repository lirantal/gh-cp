export interface Logger {
  verbose: (msg: string) => void
  info: (msg: string) => void
}

export function createLogger (verboseEnabled: boolean): Logger {
  return {
    verbose: (msg: string) => {
      if (verboseEnabled) {
        process.stderr.write(`${msg}\n`)
      }
    },
    info: (msg: string) => {
      process.stderr.write(`${msg}\n`)
    }
  }
}
