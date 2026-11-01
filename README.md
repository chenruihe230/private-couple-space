# 两个人的小世界

只有持有共同暗号的两个人可以进入，并共享心愿、心情、悄悄话、约会灵感和纪念册。

## 本地运行

1. 复制 `private-config.example.json` 为 `private-config.json`
2. 修改共同暗号和随机密钥
3. 运行：

```bash
npm start
```

打开 `http://127.0.0.1:4173`。

## GitHub + Render 部署

1. GitHub 仓库必须设置为 **Private**
2. 不要上传 `private-config.json`
3. 在 Render 中选择该仓库并创建 Blueprint
4. 使用 `render.yaml` 中的 Node 服务与持久化磁盘配置
5. 在 Render 的 Environment 中设置：
   - `ROOM_ACCESS_CODE`
   - `SESSION_SECRET`
   - `DATA_DIR=/opt/render/project/src/data`
   - `NODE_ENV=production`
6. 部署完成后，把 Render 网址和共同暗号发给对方

注意：共享数据需要持久化磁盘，否则重新部署时可能丢失。
