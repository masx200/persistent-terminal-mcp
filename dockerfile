from docker.cnb.cool/masx200/docker_mirror/persistent-terminal-mcp:2025-10-21-17-52-25

RUN mkdir -p /root/persistent-terminal-mcp




run rm -rf /root/persistent-terminal-mcp/
COPY . /root/persistent-terminal-mcp/

WORKDIR /root/persistent-terminal-mcp

run npm config set registry https://registry.npmmirror.com
RUN npm install -g cnpm --registry=https://registry.npmmirror.com
# 安装构建依赖
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*


RUN rm -rf node_modules
run npm install --force



run npm run build

run rm -rf /root/mcp-demo-streamable-http-bridge
run rm -rf /root/mcp-streamable-http-bridge
RUN apt-get update && apt-get install -y \
    python3 git\
    make \
    g++ \
    build-essential \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*
run cd /root && git clone https://gitee.com/masx200/mcp-demo-streamable-http-bridge && cp -rf /root/mcp-demo-streamable-http-bridge/* /root/mcp-streamable-http-bridge && rm -rf /root/mcp-demo-streamable-http-bridge

run cd /root/mcp-streamable-http-bridge && cnpm install --force && npm run build


cmd ["node",     "/root/mcp-streamable-http-bridge/main.js",       "--config",       "/data/settings.json"]