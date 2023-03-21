<script setup>
import { ref, computed } from 'vue'

import { trialsFromCommandLine } from './parse'

function writeToClipboard(event) {
  navigator.clipboard.writeText(event.currentTarget.textContent)
}

const commandLineVariations = ref('')
const trials = computed(() => trialsFromCommandLine(commandLineVariations.value))
const jsonTrials = computed(() => JSON.stringify(trials.value, null, 4))

const studyRegex = ref(new URLSearchParams(location.search).get('study') ?? '')
const filteredTrials = computed(() => {
  let studyRegexCompiled
  try {
    studyRegexCompiled = new RegExp(studyRegex.value)
  } catch {
    return {}
  }
  let result = Object.fromEntries(
    Object.entries(trials.value).filter(([trial, info]) => {
      return studyRegexCompiled.test(trial)
    })
  )
  console.log(result)
  return result
})
const jsonFiltered = computed(() => JSON.stringify(filteredTrials.value, null, 4))
</script>

<template>
  <div>
    <p>
      Navigate to
      <code class="copyable" @click.prevent="writeToClipboard">
        chrome://version/?show-variations-cmd
      </code>
      (click to copy) and paste the <strong>Command-line variations</strong> value below.
    </p>
    <textarea v-model="commandLineVariations" rows="10" cols="80"></textarea>
  </div>

  <details>
    <summary>Extracted data (JSON)</summary>
    <pre>{{ jsonTrials }}</pre>
  </details>

  <div>
    <p>You can filter the output with the following.</p>
    <p>Study name (regex): <input size="60" v-model="studyRegex" /></p>
  </div>

  <pre>{{ jsonFiltered }}</pre>
</template>

<style scoped>
.copyable {
  cursor: pointer;
}
</style>
