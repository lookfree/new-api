/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { SSE } from 'sse.js'

import { API_ENDPOINTS } from '@/features/playground/constants'
import { createStreamRequestController } from '@/features/playground/hooks/use-stream-request'
import { getFreshAuthHeaders } from '@/lib/api'

import {
  buildTryItPayload,
  estimateTokens,
  parseStreamUsage,
  TRY_DEFAULT_TEMPERATURE,
  type TryMessage,
  type TryUsage,
} from '../lib/try-it'

type StreamRuntime = Parameters<typeof createStreamRequestController>[0]

/** Tokens one finished exchange cost; estimated when the relay sent no usage. */
export type TryTurn = {
  inputTokens: number
  outputTokens: number
  exact: boolean
}

export type TryError = { message: string; code?: string }

/** A message of the on-screen conversation; the id keeps list keys stable. */
export type TryChatMessage = TryMessage & { id: number }

/**
 * State of the model dialog's try-out chat. Replies stream through the
 * Playground's own SSE controller, so auth, error parsing and cancellation
 * behave exactly as in the Playground; a tap on the raw stream picks up the
 * usage chunk that the controller's content-only parser drops.
 */
export function useTryItChat(options: { model: string; group?: string }) {
  const [messages, setMessages] = useState<TryChatMessage[]>([])
  const [input, setInput] = useState('')
  const [temperature, setTemperature] = useState(TRY_DEFAULT_TEMPERATURE)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<TryError | null>(null)
  const [turns, setTurns] = useState<TryTurn[]>([])

  // Callbacks run after a render's closure went stale, so the live values sit
  // in refs and the state above only drives rendering.
  const messagesRef = useRef<TryChatMessage[]>([])
  const nextIdRef = useRef(0)
  const streamingRef = useRef(false)
  const usageRef = useRef<TryUsage | null>(null)
  const controllerRef = useRef<ReturnType<
    typeof createStreamRequestController
  > | null>(null)

  const updateMessages = useCallback(
    (update: (previous: TryChatMessage[]) => TryChatMessage[]) => {
      const next = update(messagesRef.current)
      messagesRef.current = next
      setMessages(next)
    },
    []
  )

  const getController = useCallback(() => {
    if (!controllerRef.current) {
      const runtime: StreamRuntime = {
        getHeaders: getFreshAuthHeaders,
        createSource: (payload, headers) => {
          const source = new SSE(API_ENDPOINTS.CHAT_COMPLETIONS, {
            headers,
            method: 'POST',
            payload: JSON.stringify(payload),
          })
          source.addEventListener('message', (event: { data?: string }) => {
            const usage = parseStreamUsage(event.data ?? '')
            if (usage) usageRef.current = usage
          })
          return source as unknown as ReturnType<StreamRuntime['createSource']>
        },
        // Streaming state is tracked here, so the controller's own flag is unused.
        setStreaming: () => undefined,
      }
      controllerRef.current = createStreamRequestController(runtime)
    }
    return controllerRef.current
  }, [])

  useEffect(() => () => controllerRef.current?.dispose(), [])

  const endStream = useCallback(() => {
    streamingRef.current = false
    setStreaming(false)
  }, [])

  // The stream ended with a reply (possibly partial): record what it cost.
  const settle = useCallback(() => {
    const reply = messagesRef.current.at(-1)?.content ?? ''
    const usage = usageRef.current
    if (usage) {
      setTurns((previous) => [
        ...previous,
        {
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          exact: true,
        },
      ])
    } else {
      const sent = messagesRef.current.slice(0, -1)
      setTurns((previous) => [
        ...previous,
        {
          inputTokens: sent.reduce(
            (sum, message) => sum + estimateTokens(message.content),
            0
          ),
          outputTokens: estimateTokens(reply),
          exact: false,
        },
      ])
    }
    endStream()
  }, [endStream])

  // The exchange produced nothing: take it back out of the conversation so the
  // history keeps alternating, and hand the typed text back for another try.
  const rollBack = useCallback(
    (text: string) => {
      updateMessages((previous) => previous.slice(0, -2))
      setInput((current) => current || text)
      endStream()
    },
    [endStream, updateMessages]
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streamingRef.current) return

    const history: TryChatMessage[] = [
      ...messagesRef.current,
      { id: ++nextIdRef.current, role: 'user', content: text },
    ]
    setError(null)
    setInput('')
    updateMessages(() => [
      ...history,
      { id: ++nextIdRef.current, role: 'assistant', content: '' },
    ])
    usageRef.current = null
    streamingRef.current = true
    setStreaming(true)

    await getController().send(
      buildTryItPayload({
        model: options.model,
        group: options.group,
        history,
        temperature,
      }),
      {
        onUpdate: (type, chunk) => {
          if (type !== 'content') return
          updateMessages((previous) => {
            const last = previous.at(-1)
            if (!last) return previous
            return [
              ...previous.slice(0, -1),
              { ...last, content: last.content + chunk },
            ]
          })
        },
        onComplete: settle,
        onError: (message, code) => {
          setError({ message, code })
          if (messagesRef.current.at(-1)?.content) {
            endStream()
          } else {
            rollBack(text)
          }
        },
      }
    )
  }, [
    endStream,
    getController,
    input,
    options.group,
    options.model,
    rollBack,
    settle,
    temperature,
    updateMessages,
  ])

  const stop = useCallback(() => {
    if (!streamingRef.current) return
    getController().stop()
    const last = messagesRef.current.at(-1)
    const previous = messagesRef.current.at(-2)
    if (last?.content) {
      settle()
    } else {
      rollBack(previous?.content ?? '')
    }
  }, [getController, rollBack, settle])

  return {
    messages,
    input,
    setInput,
    temperature,
    setTemperature,
    streaming,
    error,
    turns,
    send,
    stop,
  }
}
