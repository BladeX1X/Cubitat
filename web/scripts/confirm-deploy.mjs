import { resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const confirmationPhrases = {
  production: 'DEPLOY PRODUCTION',
  'phase2-dev': 'DEPLOY DEV',
}

export async function confirmDeployment(target, input = stdin, output = stdout) {
  const expectedPhrase = Object.hasOwn(confirmationPhrases, target)
    ? confirmationPhrases[target]
    : undefined
  if (!expectedPhrase) {
    throw new Error('Destino inválido. Usa production o phase2-dev.')
  }

  if (!input.isTTY || !output.isTTY) {
    throw new Error('La publicación requiere una consola interactiva; operación cancelada.')
  }

  const terminal = createInterface({ input, output })
  try {
    const answer = await terminal.question(`Escribe ${expectedPhrase} para continuar: `)
    if (answer.trim() !== expectedPhrase) {
      throw new Error('La frase no coincide; publicación cancelada.')
    }
    output.write('Confirmación aceptada. Se puede iniciar Wrangler.\n')
  } finally {
    terminal.close()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  confirmDeployment(process.argv[2]).catch((error) => {
    console.error(`Deploy bloqueado: ${error.message}`)
    process.exitCode = 1
  })
}
