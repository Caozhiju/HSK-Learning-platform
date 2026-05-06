@echo off
REM 设置 Node.js 路径
set NODE_PATH=C:\Program Files\nodejs
set PATH=%NODE_PATH%;%PATH%

REM 进入项目目录
cd /d D:\OneDrive\Desktop\hsk-learning-platform

REM 运行开发服务器
npm run dev

pause
