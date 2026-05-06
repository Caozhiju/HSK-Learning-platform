# HSK 学习平台启动脚本
# 设置 Node.js 路径并启动开发服务器

$NodePath = "C:\Program Files\nodejs"
$env:PATH = "$NodePath;$env:PATH"

Write-Host "╔════════════════════════════════════════════╗"
Write-Host "║   HSK 3.0 Learning Platform Dev Server    ║"
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📍 项目位置: D:\OneDrive\Desktop\hsk-learning-platform"
Write-Host "📝 Node.js 版本: $(& 'C:\Program Files\nodejs\node.exe' --version)"
Write-Host "📦 npm 版本: $(& 'C:\Program Files\nodejs\npm.cmd' --version)`n"

Set-Location "D:\OneDrive\Desktop\hsk-learning-platform"

Write-Host "🚀 启动开发服务器..." -ForegroundColor Green
Write-Host "访问地址: http://localhost:3000`n"

& 'C:\Program Files\nodejs\npm.cmd' run dev
