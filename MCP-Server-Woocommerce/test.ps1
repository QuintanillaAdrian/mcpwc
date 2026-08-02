$token = "6c53d74aaa15af610220c8d66303820241fdf2f93ebdcbda2b65c2d101bfea74"
$base  = "http://localhost:3001"
$h     = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Req($method, $url, $body = $null) {
    try {
        if ($body) {
            $r = Invoke-RestMethod -Uri "$base$url" -Method $method -Headers $h -Body $body -ErrorVariable ev
        } else {
            $r = Invoke-RestMethod -Uri "$base$url" -Method $method -Headers $h -ErrorVariable ev
        }
        return $r | ConvertTo-Json -Depth 5
    } catch {
        return $_.Exception.Response.StatusCode.value__, ($_ | ConvertFrom-Json -ErrorAction SilentlyContinue | ConvertTo-Json -Depth 5)
    }
}

Write-Host "`n=== 1. POST /mcp/register ===" -ForegroundColor Cyan
Req POST "/mcp/register" '{"tenantId":"test-tenant","siteUrl":"https://demo.woocommerce.com","consumerKey":"ck_abc","consumerSecret":"cs_abc"}'

Write-Host "`n=== 2. POST /mcp/register (duplicado — debe fallar) ===" -ForegroundColor Cyan
Req POST "/mcp/register" '{"tenantId":"test-tenant","siteUrl":"https://demo.woocommerce.com","consumerKey":"ck_abc","consumerSecret":"cs_abc"}'

Write-Host "`n=== 3. GET /mcp/tenant/test-tenant/status ===" -ForegroundColor Cyan
Req GET "/mcp/tenant/test-tenant/status"

Write-Host "`n=== 4. PUT /mcp/tenant/test-tenant ===" -ForegroundColor Cyan
Req PUT "/mcp/tenant/test-tenant" '{"siteUrl":"https://nueva-url.com"}'

Write-Host "`n=== 5. POST /mcp/execute (tool inexistente) ===" -ForegroundColor Cyan
Req POST "/mcp/execute" '{"tenantId":"test-tenant","toolName":"toolQueNoExiste","toolArgs":{}}'

Write-Host "`n=== 6. POST /mcp/execute (tenant inexistente) ===" -ForegroundColor Cyan
Req POST "/mcp/execute" '{"tenantId":"no-existe","toolName":"listProducts","toolArgs":{}}'

Write-Host "`n=== 7. Sin token (debe dar 401) ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$base/mcp/tenant/test-tenant/status" -Method GET | ConvertTo-Json
} catch {
    "HTTP $($_.Exception.Response.StatusCode.value__): $($_.Exception.Message)"
}

Write-Host "`n=== 8. DELETE /mcp/tenant/test-tenant ===" -ForegroundColor Cyan
Req DELETE "/mcp/tenant/test-tenant"

Write-Host "`n=== 9. GET status tras delete (debe dar 404) ===" -ForegroundColor Cyan
Req GET "/mcp/tenant/test-tenant/status"
