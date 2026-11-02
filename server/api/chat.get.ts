import { reconstructChat } from '@tanstack/ai-persistence'
import { persistence } from '../ai/utils/persistence'

export default defineEventHandler((event) => {

    return reconstructChat(persistence, toWebRequest(event))
})