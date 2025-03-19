import { createApp } from "vue";
import App from "./App.vue";


import {
    create,
    NButton, NLayoutContent, NSpace,
    NCard, NUpload, NIcon, NGrid,
    NGi, NImage, NEmpty,
    NEquation, NSpin, NTooltip,
    NModal, NForm, NFormItem, NInput,
    NSwitch, NDivider, NLayout
} from 'naive-ui'
import { listen, TauriEvent } from "@tauri-apps/api/event";


const naive = create({
    components: [
        NButton, NLayoutContent, NSpace,
        NCard, NUpload, NIcon, NGrid,
        NGi, NImage, NEmpty,
        NEquation, NSpin, NTooltip,
        NModal, NForm, NFormItem, NInput,
        NSwitch, NDivider, NLayout
    ]
})

listen(TauriEvent.WINDOW_CLOSE_REQUESTED,(e)=>{
    console.log(e.event)
    
})

const app = createApp(App)
app.use(naive)
    .mount("#app");