# Bu kompyuterning ochiq (public) IP'si dinamik (ISP tomonidan vaqti-vaqti bilan
# o'zgaradi — asteriks loyihasida 213.230.93.109 -> 84.54.72.35 -> 198.163.195.76
# ketma-ketligi bilan tasdiqlangan). WG_SERVER_ENDPOINT endi statik domen
# (vpn.maktab.ecos.uz) bo'lgani uchun backend/.env'ga umuman tegilmaydi — buning
# o'rniga shu skript joriy ochiq IP'ni Cloudflare'dagi shu domenning A-yozuviga
# yozadi. Har bir maktabdagi Mikrotik RouterOS konfiguratsiyasida ham domen
# ishlatilgani uchun (IP emas), ular HAMMASI avtomatik moslashadi — hech qaysi
# routerni qo'lda qayta sozlash shart bo'lmaydi.
#
# Ishlatish: Task Scheduler orqali har 15 daqiqada ishga tushirish tavsiya etiladi.

$ErrorActionPreference = "Stop"
$cfEnvFile = Join-Path $PSScriptRoot ".env"
$logFile = Join-Path $PSScriptRoot "update-public-ip.log"

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $message"
}

function Get-EnvValue($content, $key) {
    if ($content -match "(?m)^$key=(.*)$") { return $Matches[1].Trim() }
    return $null
}

try {
    $currentIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 10).Trim()
} catch {
    Write-Log "Ochiq IP'ni aniqlab bo'lmadi: $_"
    exit 1
}
if ($currentIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
    Write-Log "Noto'g'ri IP formati qaytdi: $currentIp"
    exit 1
}

$cfEnv = Get-Content $cfEnvFile -Raw
$cfToken = Get-EnvValue $cfEnv "CF_API_TOKEN"
$cfZoneId = Get-EnvValue $cfEnv "CF_ZONE_ID"
$cfRecordId = Get-EnvValue $cfEnv "CF_RECORD_ID"
$cfRecordName = Get-EnvValue $cfEnv "CF_RECORD_NAME"
if (-not $cfToken -or -not $cfZoneId -or -not $cfRecordId) {
    Write-Log "CF_API_TOKEN/CF_ZONE_ID/CF_RECORD_ID wireguard-server/.env'da topilmadi"
    exit 1
}

# Cloudflare'ga har safar so'rov yubormaslik uchun oxirgi ma'lum IP'ni lokal keshda
# saqlaymiz — faqat haqiqatan o'zgarganda API chaqiramiz.
$cacheFile = Join-Path $PSScriptRoot ".last-known-ip"
$cachedIp = if (Test-Path $cacheFile) { (Get-Content $cacheFile -Raw).Trim() } else { $null }
if ($cachedIp -eq $currentIp) {
    exit 0  # o'zgarish yo'q — jim
}

Write-Log "IP o'zgardi: $cachedIp -> $currentIp. Cloudflare DNS ($cfRecordName) yangilanmoqda..."

$headers = @{ "Authorization" = "Bearer $cfToken"; "Content-Type" = "application/json" }
$body = @{ type = "A"; name = $cfRecordName; content = $currentIp; ttl = 120; proxied = $false } | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Method Patch `
        -Uri "https://api.cloudflare.com/client/v4/zones/$cfZoneId/dns_records/$cfRecordId" `
        -Headers $headers -Body $body -TimeoutSec 15
    if ($resp.success) {
        Set-Content -Path $cacheFile -Value $currentIp -NoNewline
        Write-Log "Cloudflare DNS muvaffaqiyatli yangilandi: $cfRecordName -> $currentIp"
    } else {
        Write-Log "Cloudflare javobi success=false: $($resp | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Log "Cloudflare API xatosi: $_"
}
