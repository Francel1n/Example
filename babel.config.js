// Presence of this file disables Next.js's default SWC compiler
// and enables Babel with the next/babel preset.
// This is required to run our custom JSX transform plugin.

const path = require('path')

module.exports = {
  presets: ['next/babel'],
  plugins: [
    // Inline version of vite-plugin-ai-source for Next.js / Babel pipeline
    [
      function aiSourceBabelPlugin(api) {
        const t = api.types

        return {
          visitor: {
            JSXOpeningElement(nodePath, state) {
              const filename = state.filename || 'unknown'
              const cwd = process.cwd()
              // Normalize to forward slashes
              const normalizedCwd = cwd.replace(/\\/g, '/')
              const normalizedFilename = filename.replace(/\\/g, '/')
              const relPath = normalizedFilename.startsWith(normalizedCwd + '/')
                ? normalizedFilename.slice(normalizedCwd.length + 1)
                : path.relative(cwd, filename).replace(/\\/g, '/')

              const line = nodePath.node.loc?.start.line ?? 0

              // Skip if already has data-source
              const alreadyHas = nodePath.node.attributes.some(
                (attr) =>
                  attr.type === 'JSXAttribute' &&
                  attr.name &&
                  attr.name.name === 'data-source'
              )
              if (alreadyHas) return

              nodePath.node.attributes.push(
                t.jsxAttribute(
                  t.jsxIdentifier('data-source'),
                  t.stringLiteral(`${relPath}:${line}`)
                )
              )
            },
          },
        }
      },
    ],
  ],
}
