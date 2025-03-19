<template>
  <n-layout>
    <n-layout-content content-style="padding: 10px;">
      <n-space vertical :size="20">
        <!-- 操作区域 -->
        <n-card hoverable content-style="padding: 10px 20px 10px 2rem;">
          <n-space>

            <n-tooltip>
              <template #trigger>
                <n-button secondary circle @click="handleScreenshot">
                  <template #icon>
                    <n-icon>
                      <Camera />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              截图，快捷键: {{ config.shortcut }}
            </n-tooltip>

            <n-tooltip>
              <template #trigger>
                <n-button secondary circle @click="showSetting=true">
                  <template #icon>
                    <n-icon>
                      <Settings />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              修改配置
            </n-tooltip>

            <n-tooltip>
              <template #trigger>
                <n-button secondary circle @click="showUser">
                  <template #icon>
                    <n-icon>
                      <PersonCircle />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              用户登录
            </n-tooltip>

          </n-space>
        </n-card>

        <!-- 内容展示 -->
        <n-grid cols="1 s:1 m:2 l:2" responsive="screen" :x-gap="20" :y-gap="10">
          <n-gi>
            <n-card>
              <div v-if="imageData" class="preview-container">
                <n-image :src="imageData" :alt="'Uploaded image'" object-fit="contain" />
              </div>
              <n-empty v-else description="暂无图片" />
            </n-card>
          </n-gi>

          <n-gi>
            <n-card>
              <n-spin :show="recognizing">
                <div v-if="result" class="result-container">
                  <n-equation :value="result" :katex-options="{ displayMode: true }" />
                  <div style="width: 100%;display: flex;justify-content: end;">
                    <n-button @click="copyResult">复制识别结果</n-button>
                  </div>
                </div>
                <n-empty v-else description="等待识别..." />
                <template #description>
                  正在识别中...
                </template>
              </n-spin>
            </n-card>
          </n-gi>
        </n-grid>
      </n-space>
    </n-layout-content>
  </n-layout>

  <div>
    <canvas id="canvas" style="display: none;"></canvas>
  </div>


  <n-modal v-model:show="showSetting">
    <n-card style="width: 600px" title="配置" :bordered="false" size="huge" role="dialog" aria-modal="true">
      <template #header-extra>
        <div @click="showSetting=false" style="cursor: pointer;">
          <n-icon>
            <Close></Close>
          </n-icon>
        </div>
      </template>


      <div style="margin-bottom: 1rem;">
        是否使用远程服务？：
        <n-switch v-model:value="config.useRemoteService">
          <template #checked>
            是
          </template>
          <template #unchecked>
            否
          </template>
        </n-switch>
      </div>
      <n-form ref="formRef" :model="config" label-placement="left" label-width="auto" label-align="left"
        require-mark-placement="right-hanging">
        <n-form-item label="自建服务地址">
          <n-input v-model:value="config.serviceUrl" placeholder="" />
        </n-form-item>

        <n-form-item label="截屏快捷键">
          <n-input v-model:value="config.shortcut" placeholder="" />
        </n-form-item>

        <n-button type="success" @click="saveConfig">保存</n-button>
      </n-form>

      <template #footer>

      </template>
    </n-card>
  </n-modal>



  <n-modal v-model:show="showUserPage" :onAfterLeave="userPgaeClose">
    <n-card style="width: 600px" title="用户" :bordered="false" size="huge" role="dialog" aria-modal="true">
      <template #header-extra>
        <div @click="showUserPage=false" style="cursor: pointer;">
          <n-icon>
            <Close></Close>
          </n-icon>
        </div>
      </template>
      <div>
        <div v-if="config.access_token">
          <div style="word-break: break-all;">
            您已完成登录，可以正常使用！
          </div>
          <n-divider />
          <div>
            每人每日限额：
          </div>
          <div>
            频次限制：30次/分钟
          </div>
          <div>
            每日总限额：50000次/天
          </div>

        </div>
        <div style="display: flex;justify-content: center;" v-else>
          <div style="text-align: center;">
            <div style="position: relative;">
              <n-spin :show="gettingQrCode">
                <n-image lazy width="200" :src="qrCodeImage"></n-image>
              </n-spin>
              <div class="image-mask" v-if="qrScnned" style="text-align: center;">
                <div style="text-align: center;;">
                  <div>已扫码</div>
                  <div>请在手机上确定</div>
                </div>
              </div>
            </div>
            <div>请使用微信扫码登录</div>
          </div>
        </div>
      </div>

    </n-card>
  </n-modal>


</template>

<script setup lang="ts">
import {onMounted, onUnmounted, Ref, ref, toRaw} from 'vue'
import {useMessage} from 'naive-ui'
import { Camera, Settings, Close, PersonCircle } from "@vicons/ionicons5"
import { fetch } from '@tauri-apps/plugin-http'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Command } from '@tauri-apps/plugin-shell'
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LazyStore } from '@tauri-apps/plugin-store';
import { BaseDirectory } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';
import { displayImageFromRGBA, getClipImage, blobTobase64 } from "../utils/imageUtils"


const showSetting = ref(false)
const message = useMessage()
const imageData: Ref<String | null> = ref(null)
const result = ref("")
const recognizing = ref(false)
const qrCodeImage = ref("")
const showUserPage = ref(false)
const gettingQrCode = ref(false)
const qrScnned = ref(false)
//配置
const config = ref({
  serviceUrl:"",
  shortcut: "",
  access_token: "",
  useRemoteService: false,
  remoteServiceUrl: "https://chenyipeng.com/pix2text"
})

const userPgaeClose = ()=>{
  if(qrInterval){clearInterval(qrInterval)}
  reqCount = 0
  qrScnned.value = false
}

const showUser = async () => {
  showUserPage.value = true
    //判断是否登录
  if (config.value.access_token) {
    //存在access_token，先判断这个token是否有效
    const response = await fetch(`${ config.value.remoteServiceUrl}/api/checkLoginStatus`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.value.access_token}`
      }
    })
    console.log(await response.text())
    if (response.status!=200){
      config.value.access_token = ""
      await getQrImage()
    }else{
      //有效
    }
  }else{
    await getQrImage()
  }
}

let qrInterval:any = null
let reqCount = 0
const getQrImage =async ()=>{

  gettingQrCode.value = true

  const url = `${config.value.remoteServiceUrl}/api/getLoginQrcode`
  // 使用fetch获取图片
  const response = await fetch(url);

  // 将响应转换为Blob对象
  const blob = await response.blob();

  const ticket = response.headers.get("ticket")

  // 使用FileReader将Blob转换为Base64
  const base64data: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>{
      if(typeof reader.result == 'string'){
        resolve(reader.result)
      }else{
        reject(new Error('错误'))
      }
    }; // 读取完成时返回Base64数据
    reader.onerror = reject; // 读取失败时抛出错误
    reader.readAsDataURL(blob); // 开始读取Blob
  });
  qrCodeImage.value = base64data
  
  if(qrInterval){
    clearInterval(qrInterval)
    reqCount = 0
  }

  gettingQrCode.value = false

  qrInterval = setInterval(async () => {
    const response = await fetch(`${config.value.remoteServiceUrl}/api/checkLoginComplete`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "ticket": ticket }),
    }
    )
    const data = await response.json()
    if(data.code==200){
      clearInterval(qrInterval)
      message.success("登陆成功！")
      //保存access_token
      const store =  new LazyStore("config.json")
      await store.set("access_token",data['access_token'])
      await store.save()
      await store.close()
      config.value.access_token = data['access_token']
      qrScnned.value = false

    }else if(data.code==210){
      //尚未完成，继续获取，不需要操作
    }else if(data.code==400){
      message.error("二维码失效，重新获取二维码。")
      qrScnned.value = false
      clearInterval(qrInterval)
    }else if(data.code==220){
      //用户完成扫描
      qrScnned.value = true
      
    }else{
      message.error("未知错误，请联系cyy。")
    }
    reqCount += 1
    if (reqCount > 120) {
      clearInterval(qrInterval)
      qrScnned.value = false
      reqCount = 0
      getQrImage()
    }
  }, 1500)

}

// 处理截图
const handleScreenshot = async () => {
  const command = Command.create('run-screen-shot', ['start', 'ms-screenclip:']);
  await command.execute();
  const clipboardImage = await getClipImage()
  const { width, height } = await clipboardImage.size()
  const blob = await displayImageFromRGBA(await clipboardImage.rgba(), width, height);
  //转为base64编码
  const data = await blobTobase64(blob)
  imageData.value = data
  await writeText("")
  const app = getCurrentWindow()
  await app.setFocus()
  await recognize(data.substring(22,data.length))
}

//识别
const recognize = async (imageRawBase64: String) => {
  recognizing.value = true
  const response = await fetch(`${config.value.useRemoteService ? config.value.remoteServiceUrl : config.value.serviceUrl}/api/recognize_image`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.value.access_token}`
    },
    body:JSON.stringify({"base64":imageRawBase64}),
  })
  
  if(response.status==200){
    const data =  await response.json()
    result.value = data.result.replace(/\$\$(.*?)\$\$/s, '$1')
    message.success("识别成功！")
  } else if (response.status == 401 || response.status == 422) {
    message.error("未登录，请先登录！")
    await showUser()
  }else if(response.status==502){
    message.error("服务目前不可用。请使用自建服务！")
  }else{
    message.error("未知错误，请联系cyy。")
    console.log(await response.text())
  }
  
  recognizing.value = false
}

//保存配置
const saveConfig = async () => {
  const store = new LazyStore("config.json", { autoSave: true })
  await store.set("serviceUrl",toRaw(config.value.serviceUrl))
  await store.set("shortcut", toRaw(config.value.shortcut))
  await store.set("useRemoteService", toRaw(config.value.useRemoteService))
  await store.set("access_token", toRaw(config.value.access_token))
  await store.save()
  message.success("保存成功！")
}

//复制结果
const copyResult = async ()=>{
  await writeText(`\$\$ ${result.value} \$\$`);
  message.success("复制成功！")
}

//加载
onMounted(async () => {

  //读取配置文件
  if(!await exists('config.json', { baseDir: BaseDirectory.AppData})){
    const default_store = new LazyStore("config.json", { autoSave: true })

    default_store.set("serviceUrl","http://127.0.0.1:8010")
    default_store.set("shortcut","Ctrl+Shift+A")
    default_store.set("remoteService","https://chenyipeng.com/pix2text")
    default_store.set("useRemoteService", true)
    default_store.set("access_token", "")

    config.value.serviceUrl = "http://127.0.0.1:8010"
    config.value.shortcut =  "Ctrl+Shift+A"
    config.value.access_token = ""
    config.value.useRemoteService = true
    config.value.remoteServiceUrl = "https://chenyipeng.com/pix2text"
    await default_store.save()
    await default_store.close()
  } else {
    const store = new LazyStore("config.json", { autoSave: true })
    const serviceUrl:string|null|undefined = await store.get("serviceUrl")
    const shortcut: string | null|undefined = await store.get("shortcut")
    const access_token: string | null | undefined = await store.get("access_token")
    const remoteServiceUrl: string | null | undefined  = await store.get("remoteServiceUrl")
    const useRemoteService: string | null | undefined = await store.get("useRemoteService")
    config.value.serviceUrl = serviceUrl ? serviceUrl : "http://127.0.0.1:8010"
    config.value.shortcut = shortcut ? shortcut : "Ctrl+Shift+A"
    config.value.useRemoteService = useRemoteService ? Boolean(useRemoteService) : true
    config.value.access_token = access_token ? access_token : ""
    config.value.remoteServiceUrl = remoteServiceUrl ? remoteServiceUrl : "https://chenyipeng.com/pix2text"
    await store.save()
    await store.close()
  }

  //注册系统热键
  try {
    await register(config.value.shortcut.replace("Ctrl", "CommandOrControl"), async (event) => {
      if (event.state === "Pressed") {
          await handleScreenshot()
      }
    });
  } catch { }

})


//卸载
onUnmounted(async()=>{
  await unregister(config.value.shortcut.replace("Ctrl", "CommandOrControl"))
})

</script>

<style scoped>
.preview-container {
  max-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dashed #ddd;
  border-radius: 4px;
  padding: 10px;
}

.result-container {
  position: relative;
}

.latex-result {
  font-size: 1.2em;
  margin-bottom: 20px;
  overflow-x: auto;
}

.copy-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
}

.n-image {
  max-width: 100%;
  max-height: 400px;
}

.image-mask {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.5); /* 半透明灰色蒙版 */
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 24px;
    font-weight: bold;
}
</style>