<template>
  <div class="container mx-auto p-8">
    <h1 class="text-3xl font-bold mb-8">スレッドスクレイピングアプリ</h1>
    
    <div class="mb-6">
      <label for="threadId" class="block text-sm font-medium mb-2">
        スレッドID:
      </label>
      <div class="flex gap-4">
        <input
          id="threadId"
          v-model="threadId"
          type="text"
          placeholder="例: 20935167"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="startScraping"
          :disabled="isLoading || !threadId"
          class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'スクレイピング中...' : 'スクレイピング開始' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      エラー: {{ error }}
    </div>

    <div v-if="csvData" class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">スクレイピング結果</h2>
        <button
          @click="downloadCsv"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          CSVダウンロード
        </button>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white border border-gray-300">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 border-b text-left">番号</th>
              <th class="px-4 py-2 border-b text-left">テキスト</th>
              <th class="px-4 py-2 border-b text-left">スタイル</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in parsedCsvData" :key="index" class="hover:bg-gray-50">
              <td class="px-4 py-2 border-b">{{ row.number || '-' }}</td>
              <td class="px-4 py-2 border-b">{{ row.text || '-' }}</td>
              <td class="px-4 py-2 border-b">{{ row.style || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
const threadId = ref('')
const isLoading = ref(false)
const error = ref('')
const csvData = ref('')
const parsedCsvData = ref([])

const startScraping = async () => {
  if (!threadId.value) return
  
  isLoading.value = true
  error.value = ''
  csvData.value = ''
  parsedCsvData.value = []
  
  try {
    const response = await $fetch('/api/scrape', {
      method: 'POST',
      body: { threadId: threadId.value }
    })
    
    csvData.value = response.csvData
    parsedCsvData.value = response.parsedData
  } catch (err) {
    error.value = err.message || 'スクレイピングに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const downloadCsv = () => {
  if (!csvData.value) return
  
  const blob = new Blob([csvData.value], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `thread_${threadId.value}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style>
body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
</style>
