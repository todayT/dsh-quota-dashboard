import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

export async function ensurePrivateDirectory(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  if (process.platform !== 'win32') return
  const username = process.env.USERNAME
  const domain = process.env.USERDOMAIN
  if (!username || !domain) throw new Error('无法确定当前 Windows 用户，未保存账号凭据')
  const result = spawnSync('icacls.exe', [directory, '/inheritance:r', '/grant:r', `${domain}\\${username}:(OI)(CI)F`, 'SYSTEM:(OI)(CI)F', 'Administrators:(OI)(CI)F'], { shell: false, windowsHide: true, stdio: 'ignore', timeout: 6000 })
  if (result.error || result.status !== 0) throw new Error('无法保护插件账号目录的 Windows 权限')
}
