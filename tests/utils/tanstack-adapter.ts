/**
 * TanStack AI -> AI SDK (LanguageModelV3)
 *
 * Envuelve un adapter de texto de TanStack AI (openaiText, anthropicText, ...)
 * y lo expone como un `LanguageModel` del AI SDK, que es lo que e2e espera
 * en `e2e.config.ts`.
 *
 * Diseño clave: el AI SDK / e2e ya corren su propio loop de tools, así que
 * aquí hacemos UNA sola llamada al modelo por invocación. Las tools se pasan
 * a TanStack SIN `execute` y con `maxIterations(1)`, de modo que TanStack
 * solo reporta la llamada a la tool y no intenta ejecutarla.
 *
 * Dependencias: @ai-sdk/provider, @tanstack/ai (+ el adapter del provider).
 */
import { APICallError } from '@ai-sdk/provider'
import type {
    LanguageModelV3,
    LanguageModelV3CallOptions,
    LanguageModelV3Content,
    LanguageModelV3FinishReason,
    LanguageModelV3Prompt,
    LanguageModelV3StreamPart,
    LanguageModelV3Usage,
} from '@ai-sdk/provider'
import { chat, maxIterations } from '@tanstack/ai'
import type { ContentPart, ModelMessage, Tool } from '@tanstack/ai'

type Warning = Extract<
    LanguageModelV3StreamPart,
    { type: 'stream-start' }
>['warnings'][number]

export interface TanStackModelOptions {
    /** Id que verá el AI SDK / e2e (ej. 'claude-sonnet-4-6'). */
    modelId: string
    /** Nombre del provider para logs y trazas. */
    provider?: string
    /** `modelOptions` de TanStack, fijos para este modelo. */
    modelOptions?: Record<string, unknown>
    /**
     * Traduce opciones de la llamada del AI SDK (toolChoice, temperature, ...)
     * a `modelOptions` propios del provider. Si no lo defines y e2e pide
     * toolChoice 'required', se emite un warning 'unsupported' para que e2e
     * degrade a 'auto' por su cuenta.
     */
    mapCallOptions?: (options: LanguageModelV3CallOptions) => Record<string, unknown>
}

export function tanstackLanguageModel(
    adapter: unknown,
    opts: TanStackModelOptions,
): LanguageModelV3 {
    return {
        specificationVersion: 'v3',
        provider: opts.provider ?? 'tanstack',
        modelId: opts.modelId,
        // {} = el AI SDK descarga las URLs y nos las pasa como datos.
        supportedUrls: {},

        async doGenerate(options) {
            const content: LanguageModelV3Content[] = []
            const textIndex = new Map<string, number>()
            let warnings: Warning[] = []
            let finishReason: LanguageModelV3FinishReason = { unified: 'other', raw: undefined }
            let usage = mapUsage(undefined)

            for await (const part of streamParts(adapter, opts, options)) {
                switch (part.type) {
                    case 'stream-start':
                        warnings = part.warnings
                        break
                    case 'text-start':
                        textIndex.set(part.id, content.push({ type: 'text', text: '' }) - 1)
                        break
                    case 'text-delta': {
                        const item = content[textIndex.get(part.id) ?? -1]
                        if (item?.type === 'text') item.text += part.delta
                        break
                    }
                    case 'tool-call':
                        content.push({
                            type: 'tool-call',
                            toolCallId: part.toolCallId,
                            toolName: part.toolName,
                            input: part.input,
                        })
                        break
                    case 'error':
                        throw part.error
                    case 'finish':
                        finishReason = part.finishReason
                        usage = part.usage
                        break
                }
            }
            return { content, finishReason, usage, warnings }
        },

        async doStream(options) {
            const iterator = streamParts(adapter, opts, options)[Symbol.asyncIterator]()
            const stream = new ReadableStream<LanguageModelV3StreamPart>({
                async pull(controller) {
                    const { value, done } = await iterator.next()
                    if (done) controller.close()
                    else controller.enqueue(value)
                },
                async cancel(reason) {
                    await iterator.return?.(reason)
                },
            })
            return { stream }
        },
    }
}

// ---------------------------------------------------------------------------
// TanStack (eventos AG-UI) -> partes de stream del AI SDK
// ---------------------------------------------------------------------------

async function* streamParts(
    adapter: unknown,
    opts: TanStackModelOptions,
    o: LanguageModelV3CallOptions,
): AsyncGenerator<LanguageModelV3StreamPart> {
    const ac = new AbortController()
    const onAbort = () => ac.abort(o.abortSignal?.reason)
    o.abortSignal?.addEventListener('abort', onAbort, { once: true })

    try {
        const warnings: Warning[] = []
        const choice = o.toolChoice?.type
        if ((choice === 'required' || choice === 'tool') && !opts.mapCallOptions) {
            warnings.push({
                type: 'unsupported',
                feature: 'toolChoice',
                details: 'El adapter no traduce toolChoice; define mapCallOptions para tu provider.',
            })
        }
        yield { type: 'stream-start', warnings }

        const { systemPrompts, messages } = toTanStackMessages(o.prompt)
        const modelOptions = { ...opts.modelOptions, ...opts.mapCallOptions?.(o) }

        // Cast deliberado: los genéricos de chat() dependen del adapter concreto.
        const events = (chat as (args: unknown) => AsyncIterable<any>)({
            adapter,
            messages,
            systemPrompts,
            tools: choice === 'none' ? [] : toTanStackTools(o.tools),
            modelOptions: Object.keys(modelOptions).length ? modelOptions : undefined,
            abortController: ac,
            agentLoopStrategy: maxIterations(1), // una sola llamada; el loop lo lleva e2e
        })

        const openText = new Set<string>()
        const toolCalls = new Map<string, { name: string; args: string }>()
        let sawToolCall = false

        for await (const c of events) {
            switch (c.type) {
                case 'RUN_STARTED':
                    yield {
                        type: 'response-metadata',
                        id: c.runId,
                        modelId: opts.modelId,
                        timestamp: new Date(),
                    }
                    break

                case 'TEXT_MESSAGE_START':
                case 'TEXT_MESSAGE_CONTENT': {
                    if (!openText.has(c.messageId)) {
                        openText.add(c.messageId)
                        yield { type: 'text-start', id: c.messageId }
                    }
                    if (c.type === 'TEXT_MESSAGE_CONTENT' && c.delta) {
                        yield { type: 'text-delta', id: c.messageId, delta: c.delta }
                    }
                    break
                }

                case 'TEXT_MESSAGE_END':
                    if (openText.delete(c.messageId)) yield { type: 'text-end', id: c.messageId }
                    break

                case 'TOOL_CALL_START': {
                    const name = c.toolName ?? c.toolCallName
                    toolCalls.set(c.toolCallId, { name, args: '' })
                    yield { type: 'tool-input-start', id: c.toolCallId, toolName: name }
                    break
                }

                case 'TOOL_CALL_ARGS': {
                    const call = toolCalls.get(c.toolCallId)
                    if (call && c.delta) {
                        call.args += c.delta
                        yield { type: 'tool-input-delta', id: c.toolCallId, delta: c.delta }
                    }
                    break
                }

                case 'TOOL_CALL_END': {
                    const call = toolCalls.get(c.toolCallId) ?? {
                        name: c.toolName ?? c.toolCallName,
                        args: '',
                    }
                    yield { type: 'tool-input-end', id: c.toolCallId }
                    yield {
                        type: 'tool-call',
                        toolCallId: c.toolCallId,
                        toolName: call.name,
                        input: call.args || JSON.stringify(c.input ?? {}),
                    }
                    sawToolCall = true
                    break
                }

                case 'RUN_ERROR': {
                    const message: string = c.error?.message ?? c.message ?? 'TanStack AI run error'
                    const code = String(c.error?.code ?? '')
                    yield {
                        type: 'error',
                        error: new APICallError({
                            message,
                            url: '',
                            requestBodyValues: {},
                            isRetryable: /429|5\d\d|rate|overload|timeout/i.test(code + message),
                        }),
                    }
                    return
                }

                case 'RUN_FINISHED': {
                    for (const id of openText) yield { type: 'text-end', id }
                    const reason: string | null | undefined =
                        c.finishReason ?? c.metadata?.tanstack?.finishReason
                    yield {
                        type: 'finish',
                        finishReason: mapFinishReason(reason, sawToolCall),
                        usage: mapUsage(c.usage),
                    }
                    ac.abort() // por si TanStack intentara otra iteración
                    return
                }
            }
        }

        // El stream terminó sin RUN_FINISHED.
        for (const id of openText) yield { type: 'text-end', id }
        yield { type: 'finish', finishReason: mapFinishReason(undefined, sawToolCall), usage: mapUsage(undefined) }
    } finally {
        o.abortSignal?.removeEventListener('abort', onAbort)
        ac.abort()
    }
}

function mapFinishReason(
    reason: string | null | undefined,
    sawToolCall: boolean,
): LanguageModelV3FinishReason {
    const raw = reason ?? undefined
    if (sawToolCall || reason === 'tool_calls') return { unified: 'tool-calls', raw }
    if (reason === 'stop') return { unified: 'stop', raw }
    if (reason === 'length') return { unified: 'length', raw }
    if (reason === 'content_filter') return { unified: 'content-filter', raw }
    return { unified: 'other', raw }
}

function mapUsage(u: any): LanguageModelV3Usage {
    // En proceso, TanStack usa promptTokens/completionTokens.
    const input: number | undefined = u?.promptTokens ?? u?.inputTokens
    const output: number | undefined = u?.completionTokens ?? u?.outputTokens
    return {
        inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: output, text: output, reasoning: undefined },
        raw: u ?? undefined,
    }
}

// ---------------------------------------------------------------------------
// Prompt del AI SDK -> mensajes de TanStack
// ---------------------------------------------------------------------------

function toTanStackMessages(prompt: LanguageModelV3Prompt) {
    const systemPrompts: string[] = []
    const messages: ModelMessage[] = []

    for (const m of prompt) {
        switch (m.role) {
            case 'system':
                systemPrompts.push(m.content)
                break

            case 'user': {
                const content: ContentPart[] = []
                for (const p of m.content) {
                    if (p.type === 'text') content.push({ type: 'text', content: p.text })
                    else if (p.type === 'file') content.push(filePart(p.data, p.mediaType))
                }
                messages.push({ role: 'user', content } as ModelMessage)
                break
            }

            case 'assistant': {
                let text = ''
                const toolCalls: Array<{
                    id: string
                    type: 'function'
                    function: { name: string; arguments: string }
                }> = []
                for (const p of m.content) {
                    if (p.type === 'text') text += p.text
                    else if (p.type === 'tool-call') {
                        toolCalls.push({
                            id: p.toolCallId,
                            type: 'function',
                            function: {
                                name: p.toolName,
                                arguments: typeof p.input === 'string' ? p.input : JSON.stringify(p.input ?? {}),
                            },
                        })
                    } // reasoning y archivos del assistant se descartan
                }
                messages.push({
                    role: 'assistant',
                    content: text || null,
                    ...(toolCalls.length ? { toolCalls } : {}),
                } as ModelMessage)
                break
            }

            case 'tool':
                for (const p of m.content) {
                    if (p.type === 'tool-result') {
                        messages.push({
                            role: 'tool',
                            toolCallId: p.toolCallId,
                            content: toolResultContent(p.output),
                        } as ModelMessage)
                    }
                }
                break
        }
    }
    return { systemPrompts, messages }
}

function toTanStackTools(tools: LanguageModelV3CallOptions['tools']): Tool[] {
    const out: unknown[] = []
    for (const t of tools ?? []) {
        // Sin `execute`: TanStack solo reporta la llamada, la ejecuta e2e.
        if (t.type === 'function') {
            out.push({ name: t.name, description: t.description ?? '', inputSchema: t.inputSchema })
        }
    }
    return out as Tool[]
}

function toolResultContent(output: any): string | ContentPart[] {
    switch (output?.type) {
        case 'text':
        case 'error-text':
            return output.value
        case 'json':
        case 'error-json':
            return JSON.stringify(output.value)
        case 'content': {
            const parts: ContentPart[] = []
            for (const item of output.value ?? []) {
                if (item.type === 'text') parts.push({ type: 'text', content: item.text })
                else if ((item.type === 'image-data' || item.type === 'file-data') && item.data) {
                    parts.push(filePart(item.data, item.mediaType ?? 'image/png'))
                } else if ((item.type === 'image-url' || item.type === 'file-url') && item.url) {
                    parts.push(filePart(new URL(item.url), item.mediaType ?? 'image/png'))
                }
            }
            return parts.every((p) => p.type === 'text')
                ? parts.map((p: any) => p.content).join('\n')
                : parts
        }
        default:
            return JSON.stringify(output)
    }
}

function filePart(data: unknown, mediaType: string): ContentPart {
    const mimeType = mediaType.endsWith('/*') ? `${mediaType.slice(0, -1)}png` : mediaType
    const type = mimeType.startsWith('image/')
        ? 'image'
        : mimeType.startsWith('audio/')
            ? 'audio'
            : mimeType.startsWith('video/')
                ? 'video'
                : 'document'
    return { type, source: toSource(data, mimeType) } as ContentPart
}

function toSource(data: any, mimeType: string) {
    // Tolerancia a formas "envueltas" ({ type: 'data' | 'url', ... }).
    if (data && typeof data === 'object' && !(data instanceof Uint8Array) && !(data instanceof URL)) {
        if (data.type === 'url' && data.url) data = new URL(String(data.url))
        else if (data.type === 'data' && data.data !== undefined) data = data.data
    }
    if (data instanceof URL) return { type: 'url', value: data.toString(), mimeType }
    if (data instanceof Uint8Array) {
        return { type: 'data', value: Buffer.from(data).toString('base64'), mimeType }
    }
    if (typeof data === 'string') {
        if (/^https?:\/\//.test(data)) return { type: 'url', value: data, mimeType }
        const dataUrl = /^data:[^;]+;base64,(.*)$/s.exec(data)
        return { type: 'data', value: dataUrl ? dataUrl[1] : data, mimeType }
    }
    throw new Error('tanstackLanguageModel: formato de archivo no soportado')
}