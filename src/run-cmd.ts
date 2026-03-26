import { spawn } from 'node:child_process'

export interface RunResult {
  code: number | null
  stdout: string
  stderr: string
}

export function runCmd (
  command: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (c: string) => {
      stdout += c
    })
    child.stderr?.on('data', (c: string) => {
      stderr += c
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code, stdout, stderr })
    })
  })
}

export function runCmdRaw (
  command: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<{ code: number | null; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const chunks: Buffer[] = []
    let stderr = ''
    child.stdout?.on('data', (c: Buffer) => {
      chunks.push(c)
    })
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (c: string) => {
      stderr += c
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code, stdout: Buffer.concat(chunks), stderr })
    })
  })
}
