$BaseUrl = "http://localhost:3000"
$Username = "jared"
$Password = Read-Host "Password"

$loginBody = @{
    username = $Username
    password = $Password
} | ConvertTo-Json -Compress

# Login
$login = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -SessionVariable session `
    -ErrorAction Stop

Write-Host "`nLOGIN"
$login.StatusCode
$login.Content

# Verify logged-in user
$me = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "$BaseUrl/api/auth/me" `
    -WebSession $session `
    -ErrorAction Stop

Write-Host "`nAUTHENTICATED USER"
$me.StatusCode
$me.Content

# Logout
$logout = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "$BaseUrl/api/auth/logout" `
    -Method POST `
    -WebSession $session `
    -ErrorAction Stop

Write-Host "`nLOGOUT"
$logout.StatusCode
$logout.Content

# Verify logout: a 401 is the expected success condition.
try {
    $afterLogout = Invoke-WebRequest `
        -UseBasicParsing `
        -Uri "$BaseUrl/api/auth/me" `
        -WebSession $session `
        -ErrorAction Stop

    Write-Host "`nUNEXPECTED: still authenticated"
    $afterLogout.StatusCode
    $afterLogout.Content
}
catch {
    $statusCode = if ($_.Exception.Response) {
        [int]$_.Exception.Response.StatusCode
    } else {
        $null
    }

    if ($statusCode -eq 401) {
        Write-Host "`nPASS: /api/auth/me returned 401 after logout."
    }
    else {
        throw
    }
}