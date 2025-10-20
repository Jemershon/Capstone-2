Param(
    [string]$renderServiceName = "capstone-backend",
    [string]$renderApiKey = "",
    [string]$branch = "main"
)

if (-not $renderApiKey) {
    Write-Host "Please provide your Render API key via -renderApiKey or set it in env var RENDER_API_KEY" -ForegroundColor Yellow
    exit 1
}

$headers = @{ "Authorization" = "Bearer $renderApiKey"; "Content-Type" = "application/json" }

$services = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers -Method Get
$service = $services | Where-Object { $_.name -eq $renderServiceName }
if (-not $service) { Write-Host "Service $renderServiceName not found"; exit 1 }

$body = @{ "serviceId" = $service.id; "branch" = $branch } | ConvertTo-Json
$deploy = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$($service.id)/deploys" -Headers $headers -Method Post -Body $body
Write-Host "Triggered deploy: $($deploy.id)" -ForegroundColor Green
