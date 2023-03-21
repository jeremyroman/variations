<script setup>
import { computed } from 'vue';

const props = defineProps(['trials']);

function trialsWhere(predicate) {
  const studies = [];
  for (let trialName in props.trials) {
    const trial = props.trials[trialName];
    if (predicate(trialName, trial)) {
      studies.push(`${trialName}.${trial.group}`);
    }
  }
  return studies;
}

const inPreloadingHoldback = computed(() => {
  return trialsWhere((_, { features }) => {
    return features['PreloadingHoldback'] === 'enabled';
  });
});

const anchorElementInteractionEnabled = computed(() => {
  return trialsWhere((_, { features }) => {
    return features['AnchorElementInteraction'] === 'enabled';
  });
});

const prefetchContentRefactor = computed(() => {
  const holdbackStudies = [];

  const analyses = [];
  let featureOverridden = false;

  for (let trialName in props.trials) {
    const { group, features, params } = props.trials[trialName];
    switch (features['PrefetchUseContentRefactor']) {
      case 'enabled':
        featureOverridden = true;
      // fallthrough
      case 'default':
        if (params['prefetch_holdback'] === 'true' || params['max_srp_prefetches'] === '0') {
          analyses.push({
            warning: `You are in a prefetch-specific holdback group which will prevent prefetch from occurring: ${trialName}.${group}`,
          });
        }
        break;
      case 'disabled':
        featureOverridden = true;
        analyses.push({
          warning: `You are in a study group which disables PrefetchUseContentRefactor, which is required for some prefetch features: ${trialName}.${group}`,
        });
        break;
    }
  }

  if (!featureOverridden) {
    analyses.push({
      warning:
        'PrefetchUseContentRefactor is defaulted. This is okay past Chrome 111 (Android) and Chrome 112 (desktop), where it is enabled by default.',
    });
  }

  if (!analyses.length) {
    analyses.push({ ok: 'No prefetch-specific holdback groups identified.' });
  }

  return analyses;
});
</script>

<template>
  <p><strong>Prefetch diagnostic</strong></p>

  <p class="warning" v-if="inPreloadingHoldback.length">
    You are in the preloading holdback due to the following study groups:
    {{ inPreloadingHoldback.join(', ') }}
  </p>
  <p class="ok" v-else>You are not in the preloading holdback.</p>

  <p class="ok" v-if="anchorElementInteractionEnabled.length">
    Anchor element interaction is enabled due to the following study groups:
    {{ anchorElementInteractionEnabled.join(', ') }}
  </p>
  <p class="warning" v-else>
    AnchorElementInteraction is not enabled by the trial config. If it has not yet become enabled by
    default (113.0.5625.0 at the earliest), anchor interaction based prefetching may not work.
  </p>

  <template v-for="{ ok, warning } in prefetchContentRefactor">
    <p class="ok" v-if="ok">{{ ok }}</p>
    <p class="warning" v-if="warning">{{ warning }}</p>
  </template>
</template>

<style scoped></style>
