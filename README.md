# 一个超级简单的公式识别软件

项目后端采用pix2text实现识别算法，前端采用tauri2.0构建，软件安装体积很小，点击即用。

# 两种使用方式

## 远程服务

这是***默认方法***，仅需扫码登录即可使用，服务由本人自建服务提供。需要注意，该服务***不保证稳定***。

## 自建服务调用
在设置中关闭*启用远程服务*，然后填入对用的地址即可，要求提供服务的api格式为：<http://xxxx/api/recoginze_image>。
此外要求返回的数据格式为：
```json
{
    "result":"$$ math_recognize_result $$"
}

```

下面为简单的flask实现的服务代码：
```python
from PIL import Image
from pix2text import Pix2Text
from flask import Flask, request, jsonify
import base64
from io import BytesIO

recognizer = Pix2Text()

app = Flask(__name__)


@app.route("/api/recognize_image", methods=['POST'])
def recognize_text():
    # 检查请求中是否包含文件
    if 'file' in request.files:
        file = request.files['file']
        image_data = file.read()
    # 检查请求中是否包含base64字符串
    elif 'base64' in request.json:
        base64_str = request.json['base64']
        image_data = base64.b64decode(base64_str)
    else:
        return jsonify({"error": "No file or base64 data provided"}), 400

    # 识别并返回结果
    try:
        image = Image.open(BytesIO(image_data)) 
        result = recognizer.recognize(image)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

```