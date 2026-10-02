import { extractText } from 'unpdf'

export default defineEventHandler(async (event) => {

    const formData = await readMultipartFormData(event)

    if (!formData) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Suba un archivo'
        })
    }

    const file = formData.find((f) => f.name === 'file')

    if (!file || !file.data) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Error en el archivo'
        })
    }

    if (file.type != 'application/pdf') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Archivo debe ser pdf'
        })
    }

    const data = new Uint8Array(file.data)
    const { text } = await extractText(data, { mergePages: true })

    return {
        success: true,
        text
    }
})