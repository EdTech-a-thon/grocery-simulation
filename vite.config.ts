import { defineConfig } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type ClassSettings = { prices: Record<string, number>; coupons: unknown[] }
type ClassStore = Record<string, ClassSettings>

const classStorePath = resolve('data', 'classes.json')
const teacherCodePath = resolve('data', 'teacher-code.json')

function loadClasses(): ClassStore {
  try {
    return JSON.parse(readFileSync(classStorePath, 'utf8')) as ClassStore
  } catch {
    return {}
  }
}

function saveClasses(classes: ClassStore) {
  writeFileSync(classStorePath, JSON.stringify(classes, null, 2))
}

function classCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
}

function teacherCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
}

export default defineConfig({
  plugins: [{
    name: 'fresh-mart-class-storage',
    configureServer(server) {
      server.middlewares.use('/api/classes', (request, response, next) => {
        const code = classCode(request.url?.split('?')[0]?.replace(/^\//, '') ?? '')

        if (!code) {
          next()
          return
        }

        if (request.method === 'GET') {
          const settings = loadClasses()[code]
          response.statusCode = settings ? 200 : 404
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(settings ?? { message: 'Class code not found.' }))
          return
        }

        if (request.method === 'PUT') {
          let body = ''
          request.on('data', (chunk) => { body += chunk })
          request.on('end', () => {
            try {
              const settings = JSON.parse(body) as ClassSettings
              if (!settings || typeof settings.prices !== 'object' || !Array.isArray(settings.coupons)) throw new Error()
              const classes = loadClasses()
              classes[code] = settings
              saveClasses(classes)
              response.statusCode = 204
              response.end()
            } catch {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify({ message: 'Invalid class settings.' }))
            }
          })
          return
        }

        response.statusCode = 405
        response.end()
      })

      server.middlewares.use('/api/teacher-code', (request, response, next) => {
        if (request.method === 'GET') {
          try {
            const saved = JSON.parse(readFileSync(teacherCodePath, 'utf8')) as { code?: string }
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ code: saved.code ?? '' }))
          } catch {
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ code: '' }))
          }
          return
        }

        if (request.method === 'PUT') {
          let body = ''
          request.on('data', (chunk) => { body += chunk })
          request.on('end', () => {
            try {
              const data = JSON.parse(body) as { code?: string }
              const code = teacherCode(String(data.code ?? ''))
              if (code.length < 3) throw new Error()
              writeFileSync(teacherCodePath, JSON.stringify({ code }, null, 2))
              response.statusCode = 204
              response.end()
            } catch {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify({ message: 'Invalid teacher code.' }))
            }
          })
          return
        }

        next()
      })
    },
  }],
  server: {
    allowedHosts: ['.exe.xyz', '.edtechathon.com'],
  },
})
