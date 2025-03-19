<script setup lang="ts">
import {NConfigProvider} from 'naive-ui'
import katex from 'katex'
import 'katex/dist/katex.css'
import {NMessageProvider,NModalProvider} from 'naive-ui'
import IndexPage from "./component/IndexPage.vue";
import { createTray } from './tray';

createTray()
</script>

<template>

  <n-config-provider :katex="katex">
    <n-modal-provider>
      <n-message-provider>
        <main class="container">

          <IndexPage />

        </main>
      </n-message-provider>
    </n-modal-provider>
  </n-config-provider>

</template>

<style scoped>


</style>
<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

</style>