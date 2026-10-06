<script setup lang="ts">
const { googleSiteVerification, bingSiteVerification } = useRuntimeConfig().public

useHead({
  meta: [
    ...(googleSiteVerification ? [{ name: 'google-site-verification', content: String(googleSiteVerification) }] : []),
    ...(bingSiteVerification ? [{ name: 'msvalidate.01', content: String(bingSiteVerification) }] : []),
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
