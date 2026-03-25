$outDir = "C:\Users\Lenovo\КП за 30 секунд\kp-za-30\public\fonts"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$urls = @(
    @{ name="Roboto-Regular.woff"; url="https://cdn.jsdelivr.net/npm/roboto-fontface@0.10.0/fonts/roboto/Roboto-Regular.woff" }
    @{ name="Roboto-Bold.woff"; url="https://cdn.jsdelivr.net/npm/roboto-fontface@0.10.0/fonts/roboto/Roboto-Bold.woff" }
)

foreach ($f in $urls) {
    $out = Join-Path $outDir $f.name
    Write-Output "Downloading $($f.name) from $($f.url)..."
    try {
        Invoke-WebRequest -Uri $f.url -OutFile $out -UseBasicParsing -TimeoutSec 30
        $size = (Get-Item $out).Length
        Write-Output "Done: $($f.name) ($size bytes)"
    } catch {
        Write-Output "FAILED: $($f.name) - $_"
    }
}
