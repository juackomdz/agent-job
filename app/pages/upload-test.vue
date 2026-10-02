<script setup lang="ts">
import { ref } from 'vue'

const file = ref<File | null>(null)

const handleFile = (event: Event) => {
    const target = event.target as HTMLInputElement

    if (!target.files || target.files.length === 0){
        file.value = null
        return

    }
    file.value = target.files[0]!
}

const subir = async() => {

    if(!file.value){
        console.log('No ha subido archivo')
        return
    }
    const formData = new FormData()
    formData.append('file', file.value)

    try {
        const response = await fetch('/api/cv',{
            method: 'POST',
            body: formData
        })

        if(!response.ok){
            console.log('error en api')
        }
    } catch (error) {
        console.log('Error al enviar')
    }
}

</script>

<template>
    <div>
        <form @submit.prevent="subir">
            <input type="file" @change="handleFile"/> <br>
            <button>Subir</button>
        </form>
    </div>
</template>
